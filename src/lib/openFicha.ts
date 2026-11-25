export function cleanOfficialId(codigo: string): string {
  if (!codigo) return '';
  return String(codigo).replace(/^CM-/, '').trim();
}

export const getFichaUrl = (licitacion: any): string => {
  const codigoValue = typeof licitacion === 'string'
    ? licitacion
    : licitacion?.codigo || licitacion?.CodigoExterno || licitacion?.id || '';
  const codigo = String(codigoValue).trim();

  if (licitacion && typeof licitacion === 'object') {
    if (typeof licitacion.enc === 'string' && licitacion.enc.trim()) {
      return `https://www.mercadopublico.cl/fichaLicitacion.html?enc=${encodeURIComponent(licitacion.enc.trim())}`;
    }

    if (typeof licitacion.qs === 'string' && licitacion.qs.trim()) {
      return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(licitacion.qs.trim())}`;
    }

    const directUrl = licitacion.UrlFicha || licitacion.fichaUrl;
    if (typeof directUrl === 'string' && /^https:\/\/([\w-]+\.)?mercadopublico\.cl\//i.test(directUrl)) {
      return directUrl;
    }

    if (typeof licitacion.url === 'string' && /\/DetailsAcquisition\.aspx\?qs=/i.test(licitacion.url)) {
      return licitacion.url;
    }
  }

  if (!codigo) return '';

  const cleanCode = encodeURIComponent(codigo);
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${cleanCode}`;
};

export function getOfficialFichaUrl(codigoLicitacion: string): string {
  return getFichaUrl(codigoLicitacion);
}

export const handleOpenFichaSegura = (e: React.SyntheticEvent, item: any): void => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  const url = getFichaUrl(item);
  if (!url) {
    console.error('No se encontró el código de la licitación', item);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};

export const abrirFichaOficial = (codigoLicitacion?: string, e?: React.SyntheticEvent): void => {
  if (!e) {
    const url = getFichaUrl(codigoLicitacion || '');
    if (!url) {
      console.error('No se encontró el código de la licitación', codigoLicitacion);
      return;
    }
    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }
  handleOpenFichaSegura(e, codigoLicitacion);
};
