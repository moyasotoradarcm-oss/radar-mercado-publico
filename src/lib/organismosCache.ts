const CACHE_KEY = 'mercado-publico:organismos-cache:v1';
const MAX_CONCURRENT_REQUESTS = 4;
const BATCH_DELAY_MS = 300;
const RATE_LIMIT_PAUSE_MS = 5000;

const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();
const queue: Array<{ codigo: string; titulo: string; resolve: (name: string | null) => void }> = [];
let draining = false;
let pausedUntil = 0;

function normalizeCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

function isPlaceholder(value: string): boolean {
  return [
    'sin organismo',
    'organismo no especificado',
    'organismo público',
    'mercado público (ver ficha)',
    'consultar en ficha'
  ].includes(value.trim().toLowerCase());
}

export function getCachedOrganismo(codigo?: string): string | null {
  if (!codigo) return null;
  const key = normalizeCodigo(codigo);
  const memoryValue = cache.get(key);
  if (memoryValue) return memoryValue;

  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, string>;
    const value = stored[key];
    if (typeof value === 'string' && value.trim() && !isPlaceholder(value)) {
      cache.set(key, value.trim());
      return value.trim();
    }
  } catch {
    // Storage can be unavailable in private browsing or quota-limited contexts.
  }
  return null;
}

export function cacheOrganismo(codigo?: string, nombre?: string): void {
  if (!codigo || !nombre?.trim() || isPlaceholder(nombre)) return;
  const key = normalizeCodigo(codigo);
  const value = nombre.trim();
  cache.set(key, value);

  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, string>;
    stored[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // The in-memory cache remains usable when persistent storage is unavailable.
  }
}

function getRealOrganismo(detail: any, titulo: string): string | null {
  const candidates = [
    detail?.Comprador?.NombreOrganismo,
    detail?.organismoNombre,
    detail?.organismo?.nombre,
    detail?.NombreOrganismo,
    typeof detail?.organismo === 'string' ? detail.organismo : null
  ];
  const title = titulo.trim();
  const match = candidates.find((candidate) =>
    typeof candidate === 'string' &&
    candidate.trim() &&
    candidate.trim() !== title &&
    !isPlaceholder(candidate)
  );
  return typeof match === 'string' ? match.trim() : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveOne(codigo: string, titulo: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/licitaciones/external?code=${encodeURIComponent(codigo)}`);
    if (response.status === 429) {
      pausedUntil = Math.max(pausedUntil, Date.now() + RATE_LIMIT_PAUSE_MS);
      return null;
    }
    if (!response.ok) return null;

    const data = await response.json();
    if (data?.warning) {
      if (/429|sobrecarg|límite|rate limit/i.test(String(data.warning))) {
        pausedUntil = Math.max(pausedUntil, Date.now() + RATE_LIMIT_PAUSE_MS);
      }
      return null;
    }

    const detail = Array.isArray(data?.Listado) ? data.Listado[0] : null;
    const name = getRealOrganismo(detail, titulo);
    if (name) cacheOrganismo(codigo, name);
    return name;
  } catch {
    return null;
  }
}

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;

  while (queue.length > 0) {
    if (pausedUntil > Date.now()) await delay(pausedUntil - Date.now());

    const batch = queue.splice(0, MAX_CONCURRENT_REQUESTS);
    await Promise.all(batch.map(async (job) => {
      const name = await resolveOne(job.codigo, job.titulo);
      inFlight.delete(job.codigo);
      job.resolve(name);
    }));

    if (queue.length > 0) await delay(BATCH_DELAY_MS);
  }

  draining = false;
}

export function resolveOrganismo(codigo?: string, titulo = ''): Promise<string | null> {
  if (!codigo) return Promise.resolve(null);
  const key = normalizeCodigo(codigo);
  const cached = getCachedOrganismo(key);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = new Promise<string | null>((resolve) => {
    queue.push({ codigo: key, titulo, resolve });
  });
  inFlight.set(key, request);
  void drainQueue();
  return request;
}