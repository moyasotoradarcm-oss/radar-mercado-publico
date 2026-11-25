import React, { useEffect, useRef, useState } from 'react';
import { cacheOrganismo, getCachedOrganismo, resolveOrganismo } from '../lib/organismosCache';

interface OrganismoNameProps {
  item: any;
  className?: string;
  fallback?: string;
}

function getItemOrganismo(item: any): string | null {
  const title = String(item?.Nombre || item?.nombre || '').trim();
  const candidates = [
    item?.Comprador?.NombreOrganismo,
    item?.NombreOrganismo,
    item?.organismoNombre,
    item?.organismo?.nombre,
    typeof item?.organismo === 'string' ? item.organismo : null,
    item?.nombreOrganismo,
    typeof item?.Organismo === 'string' ? item.Organismo : null
  ];
  const match = candidates.find((candidate) =>
    typeof candidate === 'string' &&
    candidate.trim() &&
    candidate.trim() !== title &&
    !['sin organismo', 'organismo no especificado', 'organismo público', 'mercado público (ver ficha)', 'consultar en ficha'].includes(candidate.trim().toLowerCase())
  );
  return typeof match === 'string' ? match.trim() : null;
}

export const OrganismoName: React.FC<OrganismoNameProps> = ({
  item,
  className,
  fallback = 'Mercado Público (Ver Ficha)'
}) => {
  const codigo = String(item?.CodigoExterno || item?.codigo || item?.id || '').trim();
  const titulo = String(item?.Nombre || item?.nombre || '').trim();
  const itemOrganismo = getItemOrganismo(item);
  const [resolvedName, setResolvedName] = useState<string | null>(
    () => getCachedOrganismo(codigo) || itemOrganismo
  );
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cached = getCachedOrganismo(codigo);
    if (cached) {
      setResolvedName(cached);
      return;
    }

    if (itemOrganismo) {
      cacheOrganismo(codigo, itemOrganismo);
      setResolvedName(itemOrganismo);
      return;
    }

    setResolvedName(null);
  }, [codigo, itemOrganismo]);

  useEffect(() => {
    if (!codigo || getCachedOrganismo(codigo) || itemOrganismo) return;

    let active = true;
    const resolve = () => {
      void resolveOrganismo(codigo, titulo).then((name) => {
        if (active && name) setResolvedName(name);
      });
    };
    const node = elementRef.current;

    if (!node || typeof IntersectionObserver === 'undefined') {
      resolve();
      return () => { active = false; };
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        resolve();
      }
    }, { rootMargin: '80px' });
    observer.observe(node);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [codigo, itemOrganismo, titulo]);

  const displayName = getCachedOrganismo(codigo) || itemOrganismo || resolvedName || fallback;
  return <span ref={elementRef} className={className} title={displayName}>{displayName}</span>;
};