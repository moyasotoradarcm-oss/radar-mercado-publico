export type TipoCompraClasificado = 'Licitación Pública' | 'Convenio Marco / Gran Compra' | 'Compra Ágil';
export type TipoProcesoClasificado = 'Licitación' | 'Convenio Marco' | 'Compra Ágil';

export interface ClasificacionProceso {
  tipo: TipoProcesoClasificado;
  tipo_compra: TipoCompraClasificado;
}

export const CODIGO_LICITACION_REGEX = /^(?:(?:CM|CO|COT|AG)-[A-Z0-9]+(?:-[A-Z0-9]+)*|\d+-\d+-[A-Z0-9]+|\d+-\d+[A-Z][A-Z0-9]*)$/i;

function normalizeLabel(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isCodigoLicitacion(value: unknown): boolean {
  const code = String(value || '').trim();
  return CODIGO_LICITACION_REGEX.test(code);
}

export function classifyMercadoPublicoProcess(item: any, rawCode?: unknown): ClasificacionProceso {
  const code = String(
    rawCode || item?.CodigoExterno || item?.IdCotizacion || item?.Codigo || item?.CodigoLicitacion || item?.codigo || item?.id || ''
  ).trim().toUpperCase();
  const codeWithoutPrefix = code.replace(/^(?:CM|CO|COT|AG)-/i, '');
  const suffix = codeWithoutPrefix.match(/^\d+-\d+-([A-Z0-9]+)$/)?.[1]
    || codeWithoutPrefix.match(/^\d+-\d+([A-Z][A-Z0-9]*)$/)?.[1]
    || '';
  const labels = [
    item?.tipo,
    item?.type,
    item?.Tipo,
    item?.TipoLicitacion,
    item?.TipoCompra,
    item?.tipo_compra,
    item?.tipo_proceso,
    item?.['Tipo de Proceso'],
    item?.TipoConvocatoria,
    item?.CodigoTipo,
    item?.NombreTipo
  ].map(normalizeLabel).join(' ');

  const isAgil = Boolean(item?.EsCompraAgil || item?.CompraAgil) ||
    labels.includes('compra agil') || labels.includes('cotizacion') || labels.includes('cotizaciones') ||
    suffix.includes('COT') || suffix.startsWith('AG') || code.startsWith('CO-') || code.startsWith('COT-') || code.startsWith('AG-');
  if (isAgil) {
    return { tipo: 'Compra Ágil', tipo_compra: 'Compra Ágil' };
  }

  const isConvenio = Boolean(item?.IdCotizacion || item?.EsConvenioMarco || item?.EsGranCompra) ||
    labels.includes('convenio marco') || labels.includes('gran compra') || labels.includes('grandes compras') ||
    code.startsWith('CM-') || code.includes('AISP') || suffix.includes('MRVC') || suffix.startsWith('MR') || suffix.startsWith('CM');
  if (isConvenio) {
    return { tipo: 'Convenio Marco', tipo_compra: 'Convenio Marco / Gran Compra' };
  }

  return { tipo: 'Licitación', tipo_compra: 'Licitación Pública' };
}