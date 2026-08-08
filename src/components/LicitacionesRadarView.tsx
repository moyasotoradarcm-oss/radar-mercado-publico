import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Calendar,
  ExternalLink,
  Plus,
  Flame,
  Clock,
  LayoutGrid,
  List,
  Share2,
  Tag,
  Building2,
  Check,
  RefreshCw,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { LicitacionItem, TipoProceso, AlertaRule, SET_PALABRAS_CLAVE_MASTER } from '../types';
import { openGoogleCalendar } from '../lib/googleCalendar';
import { formatChileDateTime, calculateChileRemainingTime, getItemOfficialUrl } from '../lib/dateUtils';
import { matchesDeepSearch, matchesAllTagsDeep, matchesFlexibleTipo, cleanTextPrefixes } from '../lib/searchUtils';
import { CreateAlertModal } from './CreateAlertModal';

interface LicitacionesRadarViewProps {
  licitaciones: LicitacionItem[];
  onSelectLicitacionAI: (item: LicitacionItem) => void;
  onAddPostulacion: (item: LicitacionItem) => void;
  onShareItem: (item: LicitacionItem) => void;
  onAddAlerta?: (alerta: AlertaRule) => void;
  initial7DaysFilter?: boolean;
}

const PRESET_KEYWORDS = SET_PALABRAS_CLAVE_MASTER;

export const LicitacionesRadarView: React.FC<LicitacionesRadarViewProps> = ({
  licitaciones,
  onSelectLicitacionAI,
  onAddPostulacion,
  onShareItem,
  onAddAlerta,
  initial7DaysFilter = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<TipoProceso | 'TODOS'>('TODOS');
  // Date filter mode: '30DIAS' (default), '7DIAS', 'URGENTES', 'TODOS'
  const [selectedRange, setSelectedRange] = useState<'30DIAS' | '7DIAS' | 'URGENTES' | 'TODOS'>(
    initial7DaysFilter ? '7DIAS' : '30DIAS'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [alertModalItem, setAlertModalItem] = useState<LicitacionItem | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredLicitaciones = useMemo(() => {
    return licitaciones.filter((item) => {
      // REQUIREMENT 1: Automatically exclude any opportunity with diasRestantes <= 0
      if (item.diasRestantes <= 0) {
        return false;
      }

      // Search term: Evaluate 100% of full text across all fields (accent & case insensitive)
      if (searchTerm.trim() && !matchesDeepSearch(item, searchTerm)) {
        return false;
      }

      // Process Type
      if (selectedTipo !== 'TODOS' && !matchesFlexibleTipo(item.tipo, selectedTipo, item.codigo)) {
        return false;
      }

      // Date Range Filter (Default: 30 Days)
      if (selectedRange === '7DIAS' && !item.esUltimos7Dias) {
        return false;
      }
      if (selectedRange === 'URGENTES' && item.diasRestantes > 3) {
        return false;
      }
      if (selectedRange === '30DIAS') {
        // Filter published within last 30 days or active in 30 days
        const closeDate = new Date(item.fechaCierre);
        const now = new Date();
        const diffDays = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          return false;
        }
      }

      // Tags / Preset Keywords filter: Deep search across ID, Name, Organismo (Cliente), Description, and Tags
      if (selectedTags.length > 0 && !matchesAllTagsDeep(item, selectedTags)) {
        return false;
      }

      return true;
    });
  }, [licitaciones, searchTerm, selectedTipo, selectedRange, selectedTags]);

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Header Title based on Active Range */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Radar de Oportunidades
            </span>
            <span className="bg-slate-800 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-700">
              Mercado Público Chile
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
            Procesos Importantes - {
              selectedRange === '30DIAS'
                ? 'ÚLTIMOS 30 DÍAS'
                : selectedRange === '7DIAS'
                ? 'ÚLTIMOS 7 DÍAS'
                : selectedRange === 'URGENTES'
                ? 'POR VENCER (≤3 DÍAS)'
                : 'TODAS ACTIVAS'
            }
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Monitoreo en tiempo real de licitaciones públicas, convenios marco y compras ágiles extraídas.
          </p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400">Mostrando en Radar</div>
            <div className="text-lg font-black text-cyan-400">
              {filteredLicitaciones.length} Oportunidades
            </div>
          </div>
        </div>
      </div>

      {/* Search Header & Filter Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ej. 587-32-LE26), palabra clave, tecnología o cliente..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-2 py-1 rounded"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
                }`}
                title="Vista Tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Tipo selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Tipo:
            </span>
            {(['TODOS', 'Licitacion', 'Convenio Marco', 'Compra Agil'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setSelectedTipo(tipo)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedTipo === tipo
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tipo === 'TODOS'
                  ? 'Todos'
                  : tipo === 'Compra Agil'
                  ? '⚡ Compra Ágil'
                  : tipo === 'Convenio Marco'
                  ? '🤝 Convenio Marco'
                  : '📋 Licitaciones'}
              </button>
            ))}
          </div>

          {/* Date range filter buttons (Default: 30 Días) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Rango:</span>
            
            <button
              onClick={() => setSelectedRange('30DIAS')}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                selectedRange === '30DIAS'
                  ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Últimos 30 Días (Por Defecto)</span>
            </button>

            <button
              onClick={() => setSelectedRange('7DIAS')}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                selectedRange === '7DIAS'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Últimos 7 Días</span>
            </button>

            <button
              onClick={() => setSelectedRange('URGENTES')}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                selectedRange === 'URGENTES'
                  ? 'bg-rose-100 text-rose-900 border-rose-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Por Vencer (≤3 Días)</span>
            </button>

            <button
              onClick={() => setSelectedRange('TODOS')}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                selectedRange === 'TODOS'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Todas Activas</span>
            </button>
          </div>
        </div>

        {/* Preset Keywords */}
        <div className="flex items-center space-x-2 pt-1 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 font-medium whitespace-nowrap">Keywords rápidas:</span>
          {PRESET_KEYWORDS.map((kw) => {
            const active = selectedTags.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => toggleTag(kw)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{kw}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-slate-700">
          Mostrando <strong className="text-blue-600">{filteredLicitaciones.length}</strong> oportunidades vigentes
        </p>

        {(selectedTipo !== 'TODOS' || selectedRange !== '30DIAS' || selectedTags.length > 0 || searchTerm) && (
          <button
            onClick={() => {
              setSelectedTipo('TODOS');
              setSelectedRange('30DIAS');
              setSelectedTags([]);
              setSearchTerm('');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer Filtros</span>
          </button>
        )}
      </div>

      {/* Cards View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLicitaciones.map((item) => {
            const timeInfo = calculateChileRemainingTime(item.fechaCierre);
            return (
              <div
                key={item.codigo}
                className={`bg-white rounded-2xl border transition flex flex-col justify-between shadow-xs hover:shadow-md ${
                  item.esUltimos7Dias
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-5 space-y-3">
                  {/* Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-slate-900 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                        {item.codigo}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.tipo === 'Compra Agil'
                            ? 'bg-purple-100 text-purple-800'
                            : item.tipo === 'Convenio Marco'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.tipo}
                      </span>
                      {item.esUltimos7Dias && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>7 Días</span>
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        timeInfo.dias <= 3
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      ⏳ {timeInfo.badgeText}
                    </span>
                  </div>

                  {/* Cliente and Title */}
                  <div>
                    <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span className="truncate">{item.cliente}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mt-1">
                      {cleanTextPrefixes(item.nombre)}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3">
                    {cleanTextPrefixes(item.descripcion)}
                  </p>

                  {/* Info row */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 border-t border-slate-100 gap-1">
                    <span>
                      Cierre: <strong className="text-slate-800 font-mono">{formatChileDateTime(item.fechaCierre)}</strong>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {item.montoEstimadoClp
                        ? `$${(item.montoEstimadoClp / 1000000).toFixed(1)}M CLP`
                        : 'Monto N/I'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={getItemOfficialUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-slate-600 hover:text-blue-600 font-semibold"
                    title="Abrir Ficha Oficial en Mercado Público"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ficha MP</span>
                  </a>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openGoogleCalendar(item)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition"
                      title="Añadir a Google Calendar"
                    >
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </button>

                    <button
                      onClick={() => onShareItem(item)}
                      className="p-1.5 text-slate-600 hover:text-cyan-600 hover:bg-slate-200 rounded-lg transition"
                      title="Compartir Licitación"
                    >
                      <Share2 className="w-4 h-4 text-cyan-500" />
                    </button>

                    <button
                      onClick={() => onSelectLicitacionAI(item)}
                      className="flex items-center space-x-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>IA Gemini</span>
                    </button>

                    <button
                      onClick={() => onAddPostulacion(item)}
                      className="flex items-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Postular</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Organismo Comprador</th>
                  <th className="px-4 py-3">Título / Requerimiento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">F. Cierre (Chile CLT)</th>
                  <th className="px-4 py-3">Tiempo Restante</th>
                  <th className="px-4 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLicitaciones.map((item) => {
                  const timeInfo = calculateChileRemainingTime(item.fechaCierre);
                  return (
                    <tr
                      key={item.codigo}
                      className="hover:bg-slate-100/90 cursor-pointer transition-colors duration-200"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {item.codigo}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 max-w-[200px] truncate">
                        {item.cliente}
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <p className="font-semibold text-slate-900 line-clamp-1">{cleanTextPrefixes(item.nombre)}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{cleanTextPrefixes(item.descripcion)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-mono font-semibold">
                        {formatChileDateTime(item.fechaCierre)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            timeInfo.dias <= 3
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          ⏳ {timeInfo.badgeText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setAlertModalItem(item)}
                            className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200 transition text-[11px]"
                            title="Crear Alerta Personalizada"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-600" />
                            <span>🔔 Crear Alerta</span>
                          </button>

                          <a
                            href={getItemOfficialUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition text-[11px]"
                            title="Ver Ficha Oficial Mercado Público"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>🔗 Ver Ficha</span>
                          </a>

                          <button
                            onClick={() => openGoogleCalendar(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 bg-blue-50/50"
                            title="Añadir a Google Calendar"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectLicitacionAI(item)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 bg-indigo-50/50"
                            title="Evaluar TDR con Gemini IA"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onAddPostulacion(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-xs"
                          >
                            + Postular
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert Modal preloaded for selected row */}
      {alertModalItem && (
        <CreateAlertModal
          item={alertModalItem}
          onClose={() => setAlertModalItem(null)}
          onAddAlerta={(newRule) => {
            if (onAddAlerta) onAddAlerta(newRule);
          }}
        />
      )}
    </div>
  );
};
