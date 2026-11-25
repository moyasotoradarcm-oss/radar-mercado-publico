import React, { useState, useMemo } from 'react';
import { Oportunidad } from '../types';
import { getItemOfficialUrl, cleanOfficialId, formatChileDateTime, formatFechaLimpia } from '../lib/dateUtils';
import { getFichaUrl } from '../lib/openFicha';
import { OrganismoName } from './OrganismoName';
import { Buscador } from './Buscador';
import { ReportExportActions } from './ReportExportActions';
import { KeywordClusterFilter } from './KeywordClusterFilter';
import { type KeywordClusterKey } from '../config/keywords';
import { getItemSearchableText, matchKeywords, matchesSearchTerm } from '../lib/searchUtils';

interface Props {
  oportunidades?: Oportunidad[];
  items?: Oportunidad[];
  onEvaluarIA?: (item: Oportunidad) => void;
  onSelectLicitacionAI?: (item: Oportunidad) => void;
  onIaReview?: (item: Oportunidad) => void;
  onAsignarAlerta?: (item: Oportunidad) => void;
  onAddAlert?: (item: Oportunidad) => void;
  onAddAlerta?: (item: any) => void;
  onAddPostulacion?: (item: Oportunidad) => void;
}

export const OportunidadesTabla: React.FC<Props> = ({
  oportunidades,
  items,
  onEvaluarIA,
  onSelectLicitacionAI,
  onIaReview,
  onAsignarAlerta,
  onAddAlert,
  onAddAlerta,
  onAddPostulacion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClusters, setSelectedClusters] = useState<KeywordClusterKey[]>([]);

  const toggleCluster = (cluster: KeywordClusterKey) => {
    setSelectedClusters((current) => current.includes(cluster)
      ? current.filter((selected) => selected !== cluster)
      : [...current, cluster]);
  };

  const rawList = oportunidades || items || [];

  const dataList: Oportunidad[] = useMemo(() => {
    return rawList.map((it: any) => {
      const nombre = it.Nombre || it.nombre || 'Sin título';
      const organismoRaw = it?.Comprador?.NombreOrganismo ||
        it?.organismoNombre ||
        it?.organismo?.nombre ||
        it?.NombreOrganismo ||
        (typeof it?.organismo === 'string' ? it.organismo : null) ||
        it?.nombreOrganismo ||
        (typeof it?.Organismo === 'string' ? it.Organismo : null);
      const organismo = typeof organismoRaw === 'string' &&
        organismoRaw.trim() &&
        organismoRaw.trim() !== String(it.Nombre || it.nombre || '').trim() &&
        !['sin organismo', 'organismo no especificado', 'organismo mercado público'].includes(organismoRaw.trim().toLowerCase())
        ? organismoRaw.trim()
        : 'Mercado Público (Ver Ficha)';

      return {
        ...it,
        id: it.id || it.codigo || '',
        nombre,
        organismo,
        organismoNombre: organismo,
        organismo_limpio: organismo,
        tipo: it.tipo || 'Licitación',
        fecha_cierre: it.fecha_cierre || it.fechaCierre || '',
        diasRestantes: it.diasRestantes,
        url: it.url,
      };
    });
  }, [rawList]);

  const filteredData = useMemo(() => {
    return dataList.filter(
      (item) => {
        if (!matchesSearchTerm(item, searchTerm)) return false;
        if (selectedClusters.length && !matchKeywords(getItemSearchableText(item), selectedClusters).matches.length) return false;
        return true;
      }
    );
  }, [dataList, searchTerm, selectedClusters]);

  const handleOpenFicha = (e: React.MouseEvent<HTMLButtonElement>, item: Oportunidad) => {
    e.stopPropagation();
    e.preventDefault();
    const fichaUrl = getFichaUrl(item);
    if (!fichaUrl) {
      console.error('No se encontró el código de la licitación', item);
      return;
    }
    window.open(fichaUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEvaluar = (item: Oportunidad) => {
    if (onEvaluarIA) {
      onEvaluarIA(item);
    } else if (onSelectLicitacionAI) {
      onSelectLicitacionAI(item);
    } else if (onIaReview) {
      onIaReview(item);
    } else {
      alert(`Evaluando con IA: ${item.nombre || item.id}`);
    }
  };

  const handleAlerta = (item: Oportunidad) => {
    if (onAsignarAlerta) {
      onAsignarAlerta(item);
    } else if (onAddAlert) {
      onAddAlert(item);
    } else if (onAddAlerta) {
      onAddAlerta({
        id: `alert-${Date.now()}`,
        nombre: `Alerta para ${item.nombre || item.id}`,
        palabrasClave: [item.id || ''],
        organismos: [item.organismo || ''],
        tipos: [item.tipo || 'Licitacion'],
        notificarEmail: true,
        notificarApp: true,
        activa: true,
        creadaEn: new Date().toISOString(),
      });
    } else {
      alert(`🔔 Alerta creada para ID: ${item.id}`);
    }
  };

  return (
    <div style={{ width: '100%', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', color: '#ffffff' }}>
      {/* BUSCADOR ULTRA RÁPIDO SIN LATENCIA CON DEBOUNCE LOCAL */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="relative w-full max-w-md">
          <Buscador
            onSearchChange={setSearchTerm}
            placeholder="Buscar por código (ej: 425-37-LP26), nombre u organismo..."
            className="w-full px-4 py-2 bg-slate-900 text-white border border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs placeholder-slate-400"
          />
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
          {(filteredData || []).length} de {(dataList || []).length}
        </span>
        <ReportExportActions items={filteredData} className="ml-auto" />
      </div>
      <KeywordClusterFilter selectedClusters={selectedClusters} onToggle={toggleCluster} className="mb-3" />

      {/* CONTENEDOR GRID DE ANCHOS ESTRICTOS (ELIMINA EL ESPACIO SOBRANTE) */}
      <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
        {/* ENCABEZADO */}
        <div
          className="grid grid-cols-[130px_200px_200px_110px_150px_auto] items-center gap-2"
          style={{
            backgroundColor: '#1e293b',
            padding: '10px 12px',
            borderBottom: '1px solid #334155',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#94a3b8',
          }}
        >
          <div>ID (CÓDIGO)</div>
          <div>NOMBRE</div>
          <div>ORGANISMO</div>
          <div style={{ textAlign: 'center' }}>TIPO</div>
          <div>F. CIERRE</div>
          <div style={{ textAlign: 'right' }}>ACCIONES</div>
        </div>

        {/* FILAS DE DATOS */}
        <div style={{ fontSize: '13px' }}>
          {(filteredData || []).length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px', backgroundColor: '#0f172a' }}>
              {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : 'No se encontraron oportunidades registradas.'}
            </div>
          ) : (
            (filteredData || []).map((item) => {
              const organismoCandidate = [
                item?.Comprador?.NombreOrganismo,
                item?.NombreOrganismo,
                item?.organismoNombre,
                (item as any)?.organismo?.nombre,
                item?.organismo,
                item?.nombreOrganismo,
                typeof item?.Organismo === 'string' ? item.Organismo : null
              ].find((value) =>
                typeof value === 'string' &&
                value.trim() &&
                value.trim() !== String(item.Nombre || item.nombre || '').trim() &&
                !['sin organismo', 'organismo no especificado', 'organismo mercado público'].includes(value.trim().toLowerCase())
              );
              const organismoDisplay = organismoCandidate || 'Mercado Público (Ver Ficha)';

              return (
              <div
                key={item.id || Math.random()}
                className="grid grid-cols-[130px_200px_200px_110px_150px_auto] items-center gap-2"
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: '#0f172a',
                }}
              >
                {/* 1. ID */}
                <div style={{ fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cleanOfficialId(item.id)}
                </div>

                {/* 2. NOMBRE */}
                <div style={{ color: '#f1f5f9', paddingRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.nombre}>
                  {item.nombre}
                </div>

                {/* 3. ORGANISMO */}
                <div className="max-w-[200px] truncate pr-4 text-slate-300" title={organismoDisplay}>
                  <OrganismoName item={item} fallback={organismoDisplay} />
                </div>

                {/* 4. TIPO DE COMPRA */}
                <div className="w-[110px] text-left">
                  <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700">
                    {item.tipo}
                  </span>
                </div>

                {/* 5. FECHA CIERRE */}
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                  {formatFechaLimpia(item.fecha_cierre)}
                </div>

                {/* 6. ACCIONES CON EL BOTÓN DE ALERTA OBLIGATORIO */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  {/* Botón IA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEvaluar(item);
                    }}
                    style={{
                      padding: '5px 9px',
                      backgroundColor: '#9333ea',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ✨ IA
                  </button>

                  {/* Botón Alerta */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlerta(item);
                    }}
                    style={{
                      padding: '5px 9px',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🔔 Alerta
                  </button>

                  {/* Botones Ficha y Postular */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenFicha(e, item)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow-sm transition-colors"
                  >
                    Ficha ↗
                  </button>
                  {onAddPostulacion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddPostulacion(item);
                      }}
                      style={{
                        padding: '5px 9px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      Postular
                    </button>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OportunidadesTabla;
