import { LicitacionItem, OrdenCompraItem, Oportunidad } from '../types';
import { cleanOfficialId } from '../lib/dateUtils';
import { cleanTextPrefixes } from '../lib/searchUtils';
import { classifyMercadoPublicoProcess } from '../lib/processClassification';

const MP_CACHE_PREFIX = 'mercado-publico-api:';
const MP_CACHE_TTL_MS = 10 * 60 * 1000;
const inFlightApiRequests = new Map<string, Promise<any | null>>();
let lastApiWarning: string | null = null;

export const getLastApiWarning = (): string | null => lastApiWarning;
export const resetApiWarning = (): void => { lastApiWarning = null; };

function readCachedApiResponse(url: string): { timestamp: number; data: any } | null {
  try {
    const cached = sessionStorage.getItem(`${MP_CACHE_PREFIX}${url}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function isCacheableApiResponse(data: any): boolean {
  return Array.isArray(data)
    || Array.isArray(data?.Listado)
    || Array.isArray(data?.data)
    || Array.isArray(data?.opportunities);
}

async function fetchMercadoPublicoJson(url: string): Promise<any | null> {
  const cached = readCachedApiResponse(url);
  if (cached && Date.now() - cached.timestamp < MP_CACHE_TTL_MS) return cached.data;

  const pendingRequest = inFlightApiRequests.get(url);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        lastApiWarning = 'Mercado Público limitó las solicitudes (HTTP 429). Intente en unos minutos.';
        return cached?.data ?? null;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        lastApiWarning = body?.warning || body?.error || `El servidor respondió con error HTTP ${response.status}.`;
        return cached?.data ?? null;
      }

      const data = await response.json();
      if (data?.warning) {
        lastApiWarning = data.warning;
        return cached?.data ?? data;
      }
      if (!isCacheableApiResponse(data)) return cached?.data ?? null;

      try {
        sessionStorage.setItem(`${MP_CACHE_PREFIX}${url}`, JSON.stringify({ timestamp: Date.now(), data }));
      } catch {
        // La respuesta sigue siendo utilizable aunque el almacenamiento del navegador esté lleno o bloqueado.
      }
      return data;
    } catch (error) {
      lastApiWarning = 'No fue posible conectar con el servidor.';
      console.warn('No fue posible consultar Mercado Público; se usará la última respuesta disponible.', error);
      return cached?.data ?? null;
    }
  })();

  inFlightApiRequests.set(url, request);
  try {
    return await request;
  } finally {
    inFlightApiRequests.delete(url);
  }
}

export const normalizeApiResponse = (rawData: any[]): Oportunidad[] => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item) => {
    // Extraer ID soportando Licitaciones Tradicionales (CodigoExterno) y Convenio Marco (IdCotizacion/Codigo)
    const rawId = item.CodigoExterno || item.IdCotizacion || item.CodigoLicitacion || item.Codigo || item.id || item.codigo || '';
    const classification = classifyMercadoPublicoProcess(item, rawId);

    // Extraer Nombre y organismo por separado.
    const nombre = item.Nombre || item.nombre || 'Sin título';
    const organismoRaw = item?.Comprador?.NombreOrganismo ||
      item?.organismoNombre ||
      item?.organismo?.nombre ||
      item?.NombreOrganismo ||
      (typeof item?.organismo === 'string' ? item.organismo : null);
    const organismo = typeof organismoRaw === 'string' && organismoRaw.trim() !== String(nombre).trim()
      ? organismoRaw.trim()
      : 'Organismo no especificado';

    return {
      id: rawId,
      nombre: nombre,
      organismo: organismo,
      comprador: item.Comprador?.NombreUsuario || item.NombreComprador || 'N/A',
      tipo: classification.tipo,
      tipo_compra: classification.tipo_compra,
      fecha_cierre: item.FechaCierreOficial || item.FechaCierre || item.FechaFinPublicacion || '',
      monto: item.MontoTotal || item.PresupuestoMaximo || 0,
    };
  }).filter((item) => item.id !== ''); // Filtra registros sin ID
};

/**
 * Normaliza cualquier objeto retornado por la API de Mercado Público
 * al modelo LicitacionItem estandarizado para la aplicación.
 * Mapeo estricto de campos:
 * - id: item.CodigoExterno || item.Codigo || item.CodigoLicitacion || item.IdCotizacion || item.id || item.codigo
 * - nombre: item.Nombre || item.NombreCotizacion || item.nombre || item.title
 * - organismo: item.Comprador?.NombreOrganismo || item.NombreOrganismo || item.organismoNombre || item.organismo.nombre || item.organismo
 * - tipo: "Licitación", "Convenio Marco" o "Compra Ágil"
 */
export function normalizeApiOpportunity(item: any): LicitacionItem | null {
  if (!item || typeof item !== 'object') return null;

  const cleanStr = (v: any) => (v === undefined || v === null ? '' : String(v).replace(/[\r\n]+/g, ' ').trim());

  // 1. Mapeo estricto de ID
  const rawId = item.CodigoExterno ||
    item.IdCotizacion ||
    item.Codigo ||
    item.CodigoLicitacion ||
    item.id ||
    item.codigo ||
    item.code ||
    item['ID COTIZACIÓN'] ||
    item['ID COTIZACION'] ||
    item.id_cotizacion ||
    item.numero_de_la_orden_de_compra;

  const idStr = cleanOfficialId(cleanStr(rawId));

  // 2. Mapeo estricto de Nombre / Título
  const rawNombre = item.Nombre || item.nombre || 'Sin título';

  const nombreStr = cleanTextPrefixes(cleanStr(rawNombre));

  // 3. Mapeo estricto de Organismo Comprador
  const rawOrganismo = item?.Comprador?.NombreOrganismo ||
    item?.organismoNombre ||
    item?.organismo?.nombre ||
    item?.NombreOrganismo ||
    (typeof item?.organismo === 'string' ? item.organismo : null);

  const organismoStr = cleanStr(rawOrganismo);

  // Si no cuenta con ID o Nombre mínimo, omitir
  if (!idStr && !nombreStr) {
    return null;
  }

  if (!idStr) return null;
  const finalId = idStr;
  const finalNombre = nombreStr || 'Requerimiento Mercado Público';
  const finalOrganismo = organismoStr && organismoStr !== cleanStr(rawNombre)
    ? organismoStr
    : 'Organismo no especificado';

  // 4. Mapeo estricto de Tipo / Modalidad ("Licitación", "Convenio Marco", "Compra Ágil")
  const rawTipo = cleanStr(item.tipo || item.type || item.Tipo || item['Tipo de Proceso']).toLowerCase();
  const classification = classifyMercadoPublicoProcess({ ...item, tipo: rawTipo }, finalId);

  // Comprador / Contacto
  const comprador = cleanStr(
    item.Comprador?.NombreUsuario ||
    item.Comprador?.Nombre ||
    item.comprador ||
    item.contactName ||
    item['NOMBRE DEL COMPRADOR'] ||
    item.nombre_completo ||
    'No informado'
  ) || 'No informado';

  // Fecha de Cierre
  const rawClosure = cleanStr(
    item.FechaCierreOficial ||
    item.Fechas?.FechaCierre ||
    item.Fechas?.FechaCierreOfertas ||
    item.FechaCierre ||
    item.fecha_cierre ||
    item.fechaCierre ||
    item['FIN DE PUBLICACIÓN'] ||
    item['FIN DE PUBLICACION'] ||
    item.closingDate
  );

  const isValidDate = Boolean(rawClosure) && !isNaN(new Date(rawClosure.replace(' ', 'T')).getTime());
  // Sin fecha oficial no se inventa una: el filtro de vigencia descarta el registro.
  const fecha_cierre = isValidDate ? new Date(rawClosure.replace(' ', 'T')).toISOString() : '';

  // Monto / Presupuesto
  const rawMonto = item.MontoTotal !== undefined ? item.MontoTotal
    : (item.monto !== undefined ? item.monto
      : (item.montoEstimadoClp !== undefined ? item.montoEstimadoClp
        : (item['PRESUPUESTO MÁXIMO'] !== undefined ? item['PRESUPUESTO MÁXIMO']
          : (item.presupuesto_maximo !== undefined ? item.presupuesto_maximo : 0))));

  const montoNum = typeof rawMonto === 'number'
    ? rawMonto
    : (parseFloat(cleanStr(rawMonto).replace(/[^0-9.-]+/g, '')) || 0);

  const descripcion = item.descripcion || item.description || `Proceso de adquisición para ${finalOrganismo}`;
  const url = item.url || `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(finalId.replace(/^CM-/, ''))}`;
  const msRestantes = fecha_cierre ? new Date(fecha_cierre).getTime() - Date.now() : NaN;
  const diasRestantes = isNaN(msRestantes) ? 0 : Math.max(0, Math.ceil(msRestantes / (24 * 60 * 60 * 1000)));

  return {
    ...item,
    id: finalId,
    codigo: finalId,
    nombre: finalNombre,
    title: finalNombre,
    organismo: finalOrganismo,
    organismoNombre: finalOrganismo,
    cliente: finalOrganismo,
    comprador,
    tipo: classification.tipo,
    tipo_compra: classification.tipo_compra,
    fecha_cierre,
    fechaCierre: fecha_cierre,
    monto: montoNum,
    montoEstimadoClp: montoNum,
    descripcion,
    diasRestantes,
    estado: item.estado || item.Estado || 'Sin información',
    url,
    esUltimos7Dias: !isNaN(msRestantes) && msRestantes >= 0 && diasRestantes <= 7,
    tags: Array.isArray(item.tags) ? item.tags : ['Mercado Público']
  };
}

/**
 * Consulta directa a los endpoints de la API de Mercado Público
 * Retorna Licitaciones, Convenios Marco y Compras Ágiles normalizados.
 */
export async function fetchOportunidadesMercadoPublico(): Promise<LicitacionItem[]> {
  try {
    const json = await fetchMercadoPublicoJson('/api/opportunities');
    if (json) {
      const rawItems = Array.isArray(json) ? json : (json.data || json.opportunities || []);
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        return rawItems
          .map(normalizeApiOpportunity)
          .filter((item): item is LicitacionItem => item !== null && Boolean(item.id) && Boolean(item.nombre));
      }
    }
  } catch (err) {
    console.warn('⚠️ Error al consultar /api/opportunities:', err);
  }

  // Endpoint secundario de respaldo directo
  try {
    const jsonExt = await fetchMercadoPublicoJson('/api/licitaciones/external');
    if (jsonExt) {
      const listado = Array.isArray(jsonExt.Listado) ? jsonExt.Listado : [];
      if (listado.length > 0) {
        return listado
          .map(normalizeApiOpportunity)
          .filter((item): item is LicitacionItem => item !== null && Boolean(item.id) && Boolean(item.nombre));
      }
    }
  } catch (err) {
    console.warn('⚠️ Error al consultar /api/licitaciones/external:', err);
  }

  return [];
}

export async function fetchOrdenesCompraPorFecha(fechaDDMMAAAA: string): Promise<OrdenCompraItem[]> {
  try {
    const response = await fetch(
      `/api/ordenescompra/search?date=${encodeURIComponent(fechaDDMMAAAA)}`
    );
    if (!response.ok) return [];
    const data = await response.json();

    return (data.Listado || []).map((oc: any) => ({
      id: oc.Codigo || oc.id || '',
      nombre: oc.Nombre || oc.nombre || 'Orden de Compra',
      organismo: oc.Comprador ? oc.Comprador.NombreOrganismo : (oc.organismo || 'Organismo Público'),
      fecha: fechaDDMMAAAA,
      monto: oc.MontoTotal || oc.total_oc || 0,
      estado: oc.Estado || (oc.CodigoEstado === 4 ? 'Aceptada' : `Estado ${oc.CodigoEstado ?? 'no informado'}`),
      tipo: 'Orden de Compra'
    }));
  } catch (error) {
    console.error('Error al consultar API Mercado Público OC:', error);
    return [];
  }
}

// Helper para generar el listado de fechas de los últimos 30 días en formato DDMMYYYY
export const getUltimos30Dias = (): string[] => {
  const fechas: string[] = [];
  const hoy = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    
    fechas.push(`${dia}${mes}${anio}`); // Formato DDMMYYYY
  }
  return fechas;
};

// Búsqueda directa por código (Fast-Track) ej: "425-37-LP26"
export const fetchLicitacionPorCodigo = async (codigo: string): Promise<LicitacionItem[]> => {
  if (!codigo || !codigo.trim()) return [];
  const cleanCode = codigo.trim();

  try {
    const data = await fetchMercadoPublicoJson(
      `/api/licitaciones/external?code=${encodeURIComponent(cleanCode)}`
    );
    if (!data) return [];
    const rawList = Array.isArray(data?.Listado) ? data.Listado : (Array.isArray(data) ? [data] : []);
    return rawList
      .map(normalizeApiOpportunity)
      .filter((item): item is LicitacionItem => item !== null && Boolean(item.id) && Boolean(item.nombre));
  } catch {
    return [];
  }
};

// Función principal que consume los 30 días de la API y unifica los resultados
export const fetch30DiasMercadoPublico = async (): Promise<LicitacionItem[]> => {
  const fechas = getUltimos30Dias();

  // Limitamos el barrido para no enviar las 30 fechas en una sola ráfaga.
  const resultadosPorDia: any[][] = [];
  for (let index = 0; index < fechas.length; index += 3) {
    const batch = await Promise.all(
      fechas.slice(index, index + 3).map(async (fecha) => {
        const data = await fetchMercadoPublicoJson(
          `/api/licitaciones/external?date=${fecha}`
        );
        return Array.isArray(data?.Listado) ? data.Listado : [];
      })
    );
    resultadosPorDia.push(...batch);
  }

  const todasLasLicitacionesRaw = resultadosPorDia.flat();
  // Limpiamos, normalizamos y desduplicamos por ID
  const mapUnique = new Map<string, LicitacionItem>();

  for (const raw of todasLasLicitacionesRaw) {
    const norm = normalizeApiOpportunity(raw);
    if (norm && norm.id && !mapUnique.has(norm.id)) {
      mapUnique.set(norm.id, norm);
    }
  }

  return Array.from(mapUnique.values());
};

