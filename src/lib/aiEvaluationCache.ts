import type { GeminiAnalysisResult, LicitacionItem } from '../types';

const STORAGE_KEY = 'mercado-publico:ai-analysis:v1';
const SUCCESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, { result: GeminiAnalysisResult; savedAt: number }>();

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function getCacheKey(item: LicitacionItem, profile: string): string {
  const source = JSON.stringify({
    codigo: item.CodigoExterno || item.codigo || item.id,
    nombre: item.Nombre || item.nombre,
    organismo: item.Comprador?.NombreOrganismo || item.organismo || item.cliente,
    descripcion: item.descripcion,
    monto: item.montoEstimadoClp || item.monto,
    perfil: profile
  });
  return hash(source);
}

function readStorage(): Record<string, { result: GeminiAnalysisResult; savedAt: number }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getCachedAiEvaluation(
  item: LicitacionItem,
  profile: string
): GeminiAnalysisResult | null {
  const key = getCacheKey(item, profile);
  const entry = memoryCache.get(key) || readStorage()[key];
  const ttl = (entry?.result as (GeminiAnalysisResult & { fallback?: boolean }) | undefined)?.fallback
    ? FALLBACK_CACHE_TTL_MS
    : SUCCESS_CACHE_TTL_MS;
  if (!entry || Date.now() - entry.savedAt > ttl) return null;
  memoryCache.set(key, entry);
  return entry.result;
}

export function cacheAiEvaluation(
  item: LicitacionItem,
  profile: string,
  result: GeminiAnalysisResult & { cacheable?: boolean }
): void {
  if (result.cacheable === false) return;
  const key = getCacheKey(item, profile);
  const entry = { result, savedAt: Date.now() };
  memoryCache.set(key, entry);

  try {
    const stored = readStorage();
    stored[key] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // La caché en memoria sigue disponible si el almacenamiento está bloqueado o lleno.
  }
}
