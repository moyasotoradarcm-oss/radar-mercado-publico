import React, { useState, useMemo } from 'react';
import { Oportunidad } from '../types';
import { cleanOfficialId, formatFechaLimpia } from '../lib/dateUtils';
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

const GRID_COLS_CLASS =
  'grid grid-cols-[135px_minmax(220px,1.2fr)_minmax(210px,1.1fr)_115px_145px_270px] items-center gap-3 min-w-[1095px]';

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
    setSelectedClusters((current) =>
      current.includes(cluster)
        ? current.filter((selected) => selected !== cluster)
        : [...current, cluster]
    );
  };

  const rawList = oportunidades || items || [];

  const dataList: Oportunidad[] = useMemo(() => {
    return rawList.map((it: any) => {
      const nombre = it.Nombre || it.nombre || 'Sin título';
      const organismoRaw =
        it?.Comprador?.NombreOrganismo ||
        it?.organismoNombre ||
        it?.organismo?.nombre ||
        it?.NombreOrganismo ||
        (typeof it?.organismo === 'string' ? it.organismo : null) ||
        it?.nombreOrganismo ||
        (typeof it?.Organismo === 'string' ? it.Organismo : null);
      const organismo =
        typeof organismoRaw === 'string' &&
        organismoRaw.trim() &&
        organismoRaw.trim() !== String(it.Nombre || it.nombre || '').trim() &&
        ![ 'sin organismo', 'organismo no especificado', 'organismo mercado público' ].includes(
          organismoRaw.trim().toLowerCase()
        )
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
    return dataList.filter((item) => {
      if (!matchesSearchTerm(item, searchTerm)) return false;
      if (
        selectedClusters.length &&
        !matchKeywords(getItemSearchableText(item), selectedClusters).matches.length
      ) {
        return false;
      }
      return true;
    });
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
    <div className="w-full bg-slate-900 p-4 rounded-xl text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Buscador
            onSearchChange={setSearchTerm}
            placeholder="Buscar por código (ej: 425-37-LP26), nombre u organismo..."
            className="w-full px-4 py-2 bg-slate-950 text-white border border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs placeholder-slate-400"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {(filteredData || []).length} de {(dataList || []).length}
        </span>
        <ReportExportActions items={filteredData} className="ml-auto" />
      </div>

      <KeywordClusterFilter
        selectedClusters={selectedClusters}
        onToggle={toggleCluster}
        className="mb-3"
      />

      <div className="w-full overflow-x-auto border border-slate-800 rounded-lg">
        <div className="min-w-[1095px]">
          <div
            className={`${GRID_COLS_CLASS} bg-slate-800 px-3 py-2.5 border-b border-slate-700 text-xs font-bold text-slate-300`}
          >
            <div>ID (CÓDIGO)</div>
            <div>NOMBRE</div>
            <div>ORGANISMO</div>
            <div className="text-center">TIPO</div>
            <div>F. CIERRE</div>
            <div className="text-right pr-1">ACCIONES</div>
          </div>

          <div className="text-[13px] divide-y divide-slate-800">
            {(filteredData || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm bg-slate-950">
                {searchTerm
                  ? `No se encontraron resultados para "${searchTerm}"`
                  : 'No se encontraron oportunidades registradas.'}
              </div>
            ) : (
              (filteredData || []).map((item, idx) => {
                const organismoCandidate = [
                  item?.Comprador?.NombreOrganismo,
                  item?.NombreOrganismo,
                  item?.organismoNombre,
                  (item as any)?.organismo?.nombre,
                  item?.organismo,
                  item?.nombreOrganismo,
                  typeof item?.Organismo === 'string' ? item.Organismo : null,
                ].find(
                  (value) =>
                    typeof value === 'string' &&
                    value.trim() &&
                    value.trim() !== String(item.Nombre || item.nombre || '').trim() &&
                    ![ 'sin organismo', 'organismo no especificado', 'organismo mercado público' ].includes(
                      value.trim().toLowerCase()
                    )
                );
                const organismoDisplay = organismoCandidate || 'Mercado Público (Ver Ficha)';

                return (
                  <div
                    key={item.id || `${idx}`}
                    className={`${GRID_COLS_CLASS} px-3 py-2.5 bg-slate-950 hover:bg-slate-900/80 transition-colors`}
                  >
                    <div
                      className="font-mono text-slate-200 font-bold truncate"
                      title={cleanOfficialId(item.id)}
                    >
                      {cleanOfficialId(item.id)}
                    </div>

                    <div className="text-slate-100 pr-2 truncate" title={item.nombre}>
                      {item.nombre}
                    </div>

                    <div className="pr-2 truncate text-slate-300" title={organismoDisplay}>
                      <OrganismoName item={item} fallback={organismoDisplay} />
                    </div>

                    <div className="text-center truncate">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700 whitespace-nowrap">
                        {item.tipo}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatFechaLimpia(item.fecha_cierre)}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEvaluar(item);
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        ✨ IA
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlerta(item);
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        🔔 Alerta
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenFicha(e, item)}
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded text-[11px] whitespace-nowrap shrink-0 shadow-xs transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
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
    </div>
  );
};

export default OportunidadesTabla;
