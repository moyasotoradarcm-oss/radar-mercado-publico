import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { classifyMercadoPublicoProcess, isCodigoLicitacion } from '../src/lib/processClassification';

const STORAGE_STATE_PATH = path.resolve(process.env.MP_STORAGE_STATE || 'storageState.json');
const LOGIN_URL = 'https://www.mercadopublico.cl/Home';
const CM_PORTAL_URL = 'https://conveniomarco2.mercadopublico.cl/';
const SSO_HOSTS = new Set(['heimdall.mercadopublico.cl', 'accounts.claveunica.gob.cl']);
const PORTAL_HOSTS = new Set(['www.mercadopublico.cl', 'mercadopublico.cl', 'conveniomarco2.mercadopublico.cl']);
const CATALOG_BASE_URL = 'https://conveniomarco2.mercadopublico.cl/software3/quoteform/seller/quote';
const BRAVE_PATH = process.env.BRAVE_PATH?.trim();
const code = String(process.env.CM_CODE || process.argv[2] || '').trim().toUpperCase();
let activeBrowser: Browser | null = null;

interface ScrapedMetadata {
  codigoConsulta: string;
  tipo: string;
  tipo_compra: string;
  codigoOC: string | null;
  proveedor: string | null;
  estado: string | null;
  fechas: string[];
  montos: string[];
  url: string;
  scrapedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitWithJitter(): Promise<void> {
  await sleep(1000 + Math.random() * 2000);
}

async function launchBrowser(headless: boolean): Promise<Browser> {
  activeBrowser = await chromium.launch({
    headless,
    ...(BRAVE_PATH ? { executablePath: BRAVE_PATH } : {})
  });
  return activeBrowser;
}

async function createContext(browser: Browser, useSavedState: boolean): Promise<BrowserContext> {
  if (!useSavedState) return browser.newContext();
  try {
    return await browser.newContext({ storageState: STORAGE_STATE_PATH });
  } catch (error) {
    console.warn(`No se pudo cargar el estado guardado; se abrirá una sesión limpia: ${(error as Error).message}`);
    return browser.newContext();
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getTargetUrl(licitacionCode: string): string {
  const classification = classifyMercadoPublicoProcess({}, licitacionCode);
  if (classification.tipo === 'Compra Ágil') {
    const cleanCode = licitacionCode.replace(/^(?:COT|AG|CO)-/i, '');
    return `https://www.mercadopublico.cl/CompraAgil/busqueda?codigo=${encodeURIComponent(cleanCode)}`;
  }
  return `${CATALOG_BASE_URL}/${encodeURIComponent(licitacionCode)}/`;
}

async function navigateTo(page: Page, url: string): Promise<void> {
  await waitWithJitter();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

async function needsAuthentication(page: Page): Promise<boolean> {
  const currentUrl = page.url().toLowerCase();
  const currentHost = new URL(page.url()).hostname;
  if (SSO_HOSTS.has(currentHost) || /login|claveunica|autenticacion|autenticación/.test(currentUrl)) return true;

  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.count() > 0 && await passwordField.first().isVisible().catch(() => false)) return true;

  const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
  return bodyText.includes('iniciar sesión') || bodyText.includes('iniciar sesion');
}

function isPortalReturnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return PORTAL_HOSTS.has(host) && !SSO_HOSTS.has(host);
  } catch {
    return false;
  }
}

async function completeManualLogin(page: Page, context: BrowserContext): Promise<void> {
  let sawSsoRedirect = SSO_HOSTS.has(new URL(page.url()).hostname);
  let portalReturnPage: Page | null = null;
  const observeNavigation = (frame: import('playwright').Frame) => {
    try {
      const hostname = new URL(frame.url()).hostname;
      if (SSO_HOSTS.has(hostname)) {
        sawSsoRedirect = true;
      } else if (sawSsoRedirect && PORTAL_HOSTS.has(hostname)) {
        portalReturnPage = frame.page();
      }
    } catch {
      // Ignore transient or invalid navigation URLs.
    }
  };
  const observePopup = (popup: Page) => popup.on('framenavigated', observeNavigation);

  page.on('framenavigated', observeNavigation);
  page.on('popup', observePopup);
  try {
    await promptManualLogin();
    const completedPage = portalReturnPage || page;
    await completedPage.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);

    if (!sawSsoRedirect) {
      throw new Error('No se detectó la redirección SSO a Heimdall/ClaveÚnica; no se guardó el estado.');
    }
    if (!portalReturnPage || !isPortalReturnUrl(completedPage.url()) || await needsAuthentication(completedPage)) {
      throw new Error(`La autenticación no volvió correctamente al portal (${completedPage.url()}); no se guardó el estado.`);
    }

    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`Login confirmado en ${completedPage.url()}. Sesión guardada en ${STORAGE_STATE_PATH}.`);
  } finally {
    page.off('framenavigated', observeNavigation);
    page.off('popup', observePopup);
  }
}

async function rehydrateSession(page: Page, isConvenioMarco: boolean): Promise<void> {
  console.log('🌐 Navegando al portal principal para rehidratar sesión...');
  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (err) {
    console.warn(`Aviso navegando a ${LOGIN_URL}: ${(err as Error).message}`);
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  } catch {
    // networkidle fallback
  }

  if (isConvenioMarco) {
    console.log('🔄 Transfiriendo sesión hacia el portal de Convenio Marco a través del menú SSO...');
    let transferredViaMenu = false;

    // 1. Intentar hacer clic en el enlace/botón del menú de Convenio Marco
    try {
      const cmMenuSelectors = [
        'a:has-text("Convenio Marco")',
        'a[href*="conveniomarco"]',
        'a:has-text("Grandes Compras")',
        '#MenuConvenioMarco',
        'a[title*="Convenio Marco"]'
      ];

      for (const selector of cmMenuSelectors) {
        const link = page.locator(selector).first();
        if (await link.count() > 0 && await link.isVisible().catch(() => false)) {
          console.log(`📌 Enlace de Convenio Marco encontrado (${selector}). Haciendo clic para transferir token SSO...`);
          await link.click({ timeout: 5000 }).catch(() => undefined);
          transferredViaMenu = true;
          break;
        }
      }
    } catch (err) {
      console.warn(`Aviso buscando enlace de menú de Convenio Marco: ${(err as Error).message}`);
    }

    // 2. Si no se activó por selector de menú directo, navegar por el endpoint de menú institucional
    if (!transferredViaMenu) {
      try {
        console.log('📌 Navegando a Menu.aspx para disparar la emisión de credenciales SSO hacia Convenio Marco...');
        await page.goto('https://www.mercadopublico.cl/Portal/Modules/Menu/Menu.aspx', { waitUntil: 'domcontentloaded', timeout: 20_000 });
      } catch (err) {
        console.warn(`Aviso navegando a Menu.aspx: ${(err as Error).message}`);
      }
    }

    // 3. Confirmar que el subdominio de Convenio Marco responda con estado OK
    try {
      console.log(`🔄 Verificando acceso y respuesta OK en subdominio Convenio Marco: ${CM_PORTAL_URL}...`);
      const cmResponse = await page.goto(CM_PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (cmResponse) {
        console.log(`📡 conveniomarco2 respondió HTTP ${cmResponse.status()} (${cmResponse.statusText()})`);
      }
    } catch (err) {
      console.warn(`Aviso navegando a subdominio ${CM_PORTAL_URL}: ${(err as Error).message}`);
    }

    try {
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    } catch {
      // ignore timeout
    }

    try {
      await page.waitForTimeout(2000);
    } catch (err) {
      console.warn(`Aviso en waitForTimeout: ${(err as Error).message}`);
    }
  }
}

const NOT_FOUND_PHRASE = 'el producto que buscas no se encuentra disponible';

function getAlternativeUrls(licitacionCode: string): string[] {
  const cleanCode = licitacionCode.replace(/^(?:CM|CO|COT|AG)-/i, '');
  return [
    `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisitionData.aspx?idLicitacion=${encodeURIComponent(cleanCode)}`,
    `https://conveniomarco2.mercadopublico.cl/software3/quoteform/seller/quote/detail/${encodeURIComponent(licitacionCode)}`
  ];
}

async function isUnavailableProduct(page: Page): Promise<boolean> {
  try {
    if (page.isClosed()) return false;
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    return bodyText.includes(NOT_FOUND_PHRASE);
  } catch {
    return false;
  }
}

async function searchByTopInput(page: Page, codigoConsulta: string): Promise<boolean> {
  console.log(`🔎 Intentando búsqueda por formulario con código: ${codigoConsulta}...`);
  try {
    if (page.isClosed()) return false;
    const inputLocator = page.locator('input[type="text"], input[type="search"]').first();
    if (await inputLocator.count() > 0 && await inputLocator.isVisible().catch(() => false)) {
      await inputLocator.fill(codigoConsulta);
      await page.keyboard.press('Enter');
      try {
        await page.waitForLoadState('domcontentloaded');
      } catch (err) {
        console.warn(`Aviso en domcontentloaded tras búsqueda: ${(err as Error).message}`);
      }
      try {
        await page.waitForLoadState('networkidle', { timeout: 15_000 });
      } catch {
        // networkidle timeout
      }
      try {
        await page.waitForTimeout(3000);
      } catch (err) {
        console.warn(`Aviso en waitForTimeout de búsqueda: ${(err as Error).message}`);
      }
      return !(await isUnavailableProduct(page));
    }
  } catch (err) {
    console.warn(`Error en búsqueda por formulario: ${(err as Error).message}`);
  }
  return false;
}

async function navigateToTargetUrl(page: Page, targetUrl: string, licitacionCode: string): Promise<void> {
  const urlsToTry = [targetUrl, ...getAlternativeUrls(licitacionCode)];

  for (let i = 0; i < urlsToTry.length; i++) {
    const currentUrl = urlsToTry[i];
    console.log(`🔎 [Intento ${i + 1}/${urlsToTry.length}] Navegando al detalle: ${currentUrl}...`);

    try {
      if (page.isClosed()) {
        console.warn('⚠️ La página fue cerrada inesperadamente antes de la navegación.');
        return;
      }

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      } catch (navErr) {
        console.warn(`Aviso en navegación a ${currentUrl}: ${(navErr as Error).message}`);
      }

      try {
        await page.waitForLoadState('domcontentloaded');
      } catch {
        // fallback
      }

      try {
        await page.waitForLoadState('networkidle', { timeout: 15_000 });
      } catch {
        // fallback
      }

      try {
        await page.waitForTimeout(3000); // Dar tiempo al renderizado de scripts dinámicos
      } catch (timeoutErr) {
        console.warn(`Aviso en waitForTimeout: ${(timeoutErr as Error).message}`);
      }

      // Captura de pantalla de depuración por intento
      try {
        await page.screenshot({ path: 'debug-convenio.png', fullPage: true });
        console.log('📸 Captura de pantalla de depuración guardada en debug-convenio.png.');
      } catch (err) {
        console.warn(`No se pudo tomar la captura de pantalla de depuración: ${(err as Error).message}`);
      }

      const unavailable = await isUnavailableProduct(page);
      if (!unavailable) {
        try {
          await page.waitForSelector('table, form, .quote-detail, #main-content, iframe, #lblEstado, .estado-licitacion, .grid-view, #divDetalle', { timeout: 20_000 });
        } catch {
          // Continuar con los selectores disponibles
        }
        console.log(`✅ Detalle cargado exitosamente en: ${currentUrl}`);
        return;
      }

      console.warn(`⚠️ Aviso "${NOT_FOUND_PHRASE}" detectado en ${currentUrl}. Probando alternativa...`);
    } catch (attemptErr) {
      console.warn(`Error durante intento de navegación en ${currentUrl}: ${(attemptErr as Error).message}`);
    }
  }

  // 2. Si ninguna URL directa responde, intentar búsqueda por formulario superior
  try {
    const searchSuccess = await searchByTopInput(page, licitacionCode);
    if (searchSuccess) {
      try {
        await page.screenshot({ path: 'debug-convenio.png', fullPage: true });
      } catch {}
      console.log('✅ Búsqueda por formulario completada exitosamente.');
      return;
    }
  } catch (searchErr) {
    console.warn(`Error al intentar búsqueda por formulario: ${(searchErr as Error).message}`);
  }

  // Tomar captura final y notificar
  try {
    await page.screenshot({ path: 'debug-convenio.png', fullPage: true });
  } catch {}
  console.warn('⚠️ Se agotaron las rutas directas y la búsqueda por formulario. Se procederá a inspeccionar el contenido obtenido.');
}

async function extractMetadata(page: Page, licitacionCode: string): Promise<ScrapedMetadata> {
  // 1. Obtener textos y filas tanto de la página principal como de todos los iframes (frames)
  const frames = page.frames();
  const allTexts: string[] = [];
  const allRows: string[] = [];

  for (const frame of frames) {
    try {
      const frameBody = (await frame.locator('body').innerText().catch(() => '')).trim();
      if (frameBody) allTexts.push(frameBody);

      const frameRows = await frame.locator('tr').allInnerTexts().catch(() => []);
      for (const row of frameRows) {
        const cleaned = row.replace(/\s+/g, ' ').trim();
        if (cleaned) allRows.push(cleaned);
      }
    } catch {
      // Continuar con otros frames si alguno falla o está en transición
    }
  }

  const combinedText = allTexts.join('\n');
  if (!combinedText) {
    const rawBody = (await page.locator('body').innerText().catch(() => '')).trim();
    console.warn('⚠️ Vista de texto inicial de la página (primeros 500 caracteres):');
    console.warn(rawBody.slice(0, 500) || '[Página completamente vacía o sin texto visible]');
    throw new Error('La página no devolvió contenido visible en la página ni en sus marcos.');
  }

  const lines = combinedText.split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const contentLines = [...allRows, ...lines];

  const readField = (labels: string[]): string | null => {
    for (let index = 0; index < contentLines.length; index += 1) {
      const line = contentLines[index];
      const lowerLine = line.toLowerCase();
      const label = labels.find((candidate) => lowerLine.includes(candidate));
      if (!label) continue;

      const labelIndex = lowerLine.indexOf(label);
      const inlineValue = line.slice(labelIndex + label.length).replace(/^[:\s|\-–]+/, '').trim();
      if (inlineValue && inlineValue.toLowerCase() !== label) return inlineValue;

      const nextLine = contentLines[index + 1];
      if (nextLine && !labels.some((candidate) => nextLine.toLowerCase().includes(candidate))) return nextLine;
    }
    return null;
  };

  // Selectores específicos de Convenio Marco v2 / Mercado Público
  let estado = readField(['estado de la orden', 'estado oc', 'estado de la cotización', 'estado de cotización', 'estado']);
  if (!estado) {
    for (const frame of frames) {
      try {
        const estadoLoc = frame.locator('#lblEstado, .estado-licitacion, span:has-text("Estado")');
        if (await estadoLoc.count() > 0) {
          const raw = (await estadoLoc.first().innerText().catch(() => '')).trim();
          if (raw) {
            estado = raw.replace(/^Estado\s*:?\s*/i, '').trim();
            break;
          }
        }
      } catch {
        // Continuar
      }
    }
  }

  const fechas = lines.filter((line) =>
    /(fecha|plazo)/i.test(line) && /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/.test(line)
  );
  const montos = lines.filter((line) =>
    /(monto|total|presupuesto|valor|\bclp\b|\buf\b|\$)/i.test(line)
  );

  const metadata: ScrapedMetadata = {
    codigoConsulta: licitacionCode,
    ...classifyMercadoPublicoProcess({}, licitacionCode),
    codigoOC: readField(['código oc', 'codigo oc', 'código de oc', 'codigo de oc', 'n° de orden de compra', 'número de orden de compra']),
    proveedor: readField(['proveedor', 'razón social proveedor', 'razon social proveedor']),
    estado,
    fechas,
    montos,
    url: page.url(),
    scrapedAt: new Date().toISOString()
  };

  // 2. Si no se hallan los selectores o campos esperados, extraer e imprimir los primeros 500 caracteres
  if (!hasExtractedMetadata(metadata)) {
    const rawBody = (await page.locator('body').innerText().catch(() => '')).trim();
    console.warn('⚠️ No se reconocieron campos estructurados. Muestra de contenido visible (primeros 500 caracteres):');
    console.warn(rawBody.slice(0, 500) || '[Sin contenido visible en el body]');
  }

  return metadata;
}

function hasExtractedMetadata(metadata: ScrapedMetadata): boolean {
  return Boolean(
    metadata.codigoOC || metadata.proveedor || metadata.estado || metadata.fechas.length || metadata.montos.length
  );
}

async function promptManualLogin(): Promise<void> {
  const readline = createInterface({ input: stdin, output: stdout });
  await readline.question('Completa ClaveÚnica y 2FA en Brave. Cuando estés dentro del portal, pulsa Enter aquí. ');
  readline.close();
}

async function runLogin(): Promise<void> {
  const browser = await launchBrowser(false);
  let context: BrowserContext | null = null;
  try {
    context = await createContext(browser, await fileExists(STORAGE_STATE_PATH));
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    console.log(`Brave abierto${BRAVE_PATH ? ` desde BRAVE_PATH=${BRAVE_PATH}` : ''}. Completa ClaveÚnica/2FA manualmente.`);
    await navigateTo(page, LOGIN_URL);
    await completeManualLogin(page, context);
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
      console.log('🔒 Contexto de login cerrado explícitamente.');
    }
    await browser.close();
    activeBrowser = null;
  }
}

async function run(): Promise<void> {
  let browser: Browser | null = null;
  try {
    if (process.argv.includes('--login')) {
      await runLogin();
      return;
    }

    if (!isCodigoLicitacion(code)) {
      throw new Error('Indica un código válido, por ejemplo 5802363-2467MRVC, 4074-32-LE26 o 1234-5-COT26.');
    }

    const processType = classifyMercadoPublicoProcess({}, code);
    if (processType.tipo === 'Licitación') {
      throw new Error('Este scraper está diseñado para Convenio Marco/Grandes Compras y Compra Ágil/Cotizaciones.');
    }

    const targetUrl = getTargetUrl(code);
    const savedStateExists = await fileExists(STORAGE_STATE_PATH);
    let metadata: ScrapedMetadata | null = null;

    // Helper to attempt scraping with a new context (optionally reusing saved session)
    const attemptScrapeWithNewContext = async (useSavedSession: boolean): Promise<ScrapedMetadata | null> => {
      if (!browser) {
        browser = await launchBrowser(useSavedSession);
      }
      const contextOptions = useSavedSession && await fileExists(STORAGE_STATE_PATH) ? { storageState: STORAGE_STATE_PATH } : {};
      const currentContext = await browser.newContext(contextOptions);
      const currentPage = await currentContext.newPage();
      currentPage.setDefaultTimeout(15_000);

      // Intercept JSON responses for monitoring
      currentPage.on('response', async (response) => {
        const ct = response.headers()['content-type'];
        if (response.request().resourceType() === 'xhr' && ct && ct.includes('application/json')) {
          console.log(`📦 JSON response from ${response.url()}`);
          try {
            const body = await response.json();
            const snippet = JSON.stringify(body);
            console.log(snippet.length > 200 ? snippet.slice(0, 200) + '...' : snippet);
          } catch {}
        }
      });

      try {
        if (!useSavedSession) {
          console.log(`Brave abierto${BRAVE_PATH ? ` desde BRAVE_PATH=${BRAVE_PATH}` : ''}. Inicia sesión manualmente.`);
          await navigateTo(currentPage, LOGIN_URL);
          await completeManualLogin(currentPage, currentContext);
        }
        await rehydrateSession(currentPage, processType.tipo === 'Convenio Marco');
        await navigateToTargetUrl(currentPage, targetUrl, code);
        if (await needsAuthentication(currentPage)) {
          throw new Error('La sesión guardada expiró o requiere autenticación.');
        }
        const extracted = await extractMetadata(currentPage, code);
        if (!hasExtractedMetadata(extracted)) {
          throw new Error('No se encontraron los campos esperados del detalle.');
        }
        return extracted;
      } finally {
        await currentContext.close().catch(() => undefined);
      }
    };

    // 1. Try with saved session first
    if (savedStateExists) {
      try {
        console.log('🚀 Iniciando ingesta desatendida en un contexto nuevo con storageState...');
        metadata = await attemptScrapeWithNewContext(true);
      } catch (error) {
        console.warn(`La sesión guardada no se pudo reutilizar: ${(error as Error).message}`);
        await (browser as Browser | null)?.close().catch(() => undefined);
        browser = null;
        metadata = null;
      }
    }

    // 2. Fallback to interactive login if needed
    if (!metadata) {
      console.log('🔄 Reintentando con contexto interactivo fresco...');
      try {
        metadata = await attemptScrapeWithNewContext(false);
      } catch (error) {
        console.error(`Error en scraping con contexto interactivo: ${(error as Error).message}`);
      }
    }

    if (metadata) {
      console.log(JSON.stringify(metadata, null, 2));
    } else {
      throw new Error('No fue posible completar la extracción de la cotización/proceso.');
    }
  } finally {
    // Thermos protocol: ensure all resources are closed
    await (browser as Browser | null)?.close().catch(() => undefined);
    activeBrowser = null;
  }
}
run().catch((error: unknown) => {
  void activeBrowser?.close().catch(() => undefined);
  console.error(`Error en scraper Convenio Marco: ${(error as Error).message}`);
  process.exitCode = 1;
});
