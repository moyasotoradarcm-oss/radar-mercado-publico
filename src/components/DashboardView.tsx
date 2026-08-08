import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Briefcase,
  TrendingUp,
  Calendar,
  ExternalLink,
  ChevronRight,
  Plus,
  FileText,
  AlertCircle,
  Share2,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Key,
  Table,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Bell
} from 'lucide-react';
import { LicitacionItem, Postulacion, AlertaRule } from '../types';
import { openGoogleCalendar } from '../lib/googleCalendar';
import { formatChileDateTime, calculateChileRemainingTime, getItemOfficialUrl } from '../lib/dateUtils';
import { matchesDeepSearch, matchesFlexibleTipo, cleanTextPrefixes } from '../lib/searchUtils';
import { CreateAlertModal } from './CreateAlertModal';

interface DashboardViewProps {
  licitaciones: LicitacionItem[];
  postulaciones: Postulacion[];
  onSelectLicitacionAI: (item: LicitacionItem) => void;
  onAddPostulacion: (item: LicitacionItem) => void;
  onNavigateToRadar: (filter7Days?: boolean) => void;
  openReportsModal: () => void;
  openShareModal: () => void;
  openAuthModal: () => void;
  onAddAlerta?: (alerta: AlertaRule) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  licitaciones,
  postulaciones,
  onSelectLicitacionAI,
  onAddPostulacion,
  onNavigateToRadar,
  openReportsModal,
  openShareModal,
  openAuthModal,
  onAddAlerta
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [tableTipo, setTableTipo] = useState<string>('TODOS');
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [alertModalItem, setAlertModalItem] = useState<LicitacionItem | null>(null);

  // Compute Stats
  const totalVigentes = licitaciones.length;
  const ultimos7Dias = licitaciones.filter((item) => item.esUltimos7Dias);
  const urgentes = licitaciones.filter((item) => item.diasRestantes <= 3 && item.diasRestantes >= 0);
  const postulacionesEnCurso = postulaciones.filter((p) => p.estadoPostulacion !== 'Adjudicada' && p.estadoPostulacion !== 'Desestimada');

  const montoTotalLicitado = licitaciones.reduce(
    (acc, curr) => acc + (curr.montoEstimadoClp || 0),
    0
  );

  // Filter active extracted items with diasRestantes > 0
  const activeExtractedItems = licitaciones.filter((item) => item.diasRestantes > 0);

  const filteredTableItems = activeExtractedItems.filter((item) => {
    if (tableSearch.trim() && !matchesDeepSearch(item, tableSearch)) {
      return false;
    }
    if (tableTipo !== 'TODOS' && !matchesFlexibleTipo(item.tipo, tableTipo, item.codigo)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Welcome */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-blue-900/40 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-full border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sincronización Inteligente Mercado Público Chile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Centro de Monitoreo & Oportunidades Licitatorias
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Detección automatizada de Licitaciones, Convenio Marco y Compra Ágil.
              Los procesos de los <strong className="text-amber-300">últimos 30 días</strong> se destacan como alta prioridad con sincronización directa a Google Calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openAuthModal}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition transform active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-200" />
              <span>Conectar ClaveÚnica</span>
            </button>
            <button
              onClick={openReportsModal}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition transform active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Reportes</span>
            </button>
            <button
              onClick={() => onNavigateToRadar(false)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-cyan-500/30 transition"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Filtrar Últimos 30 Días</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vista de Tabla Interactiva / Lista de Oportunidades Extraídas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  Oportunidades Extraídas (Vista de Tabla)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {filteredTableItems.length} Activas (últimos 30 días)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Listado de todas las oportunidades extraídas: ID, Nombre, Organismo, Tipo de Compra y Días Restantes
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              {isTableExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Contraer Tabla</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Expandir Tabla</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isTableExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Table Filters bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, nombre u organismo..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={tableTipo}
                  onChange={(e) => setTableTipo(e.target.value)}
                  className="text-xs font-semibold border border-slate-300 rounded-lg bg-white px-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos los Tipos de Compra</option>
                  <option value="Licitacion Publica">Licitación Pública</option>
                  <option value="Convenio Marco">Convenio Marco</option>
                  <option value="Compra Agil">Compra Ágil</option>
                </select>
              </div>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">ID (Código)</th>
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">Organismo</th>
                    <th className="py-3 px-4">Tipo de Compra</th>
                    <th className="py-3 px-4">F. Cierre (Chile CLT)</th>
                    <th className="py-3 px-4 text-center">Tiempo Restante</th>
                    <th className="py-3 px-4 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredTableItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                        No se encontraron oportunidades activas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredTableItems.map((item) => {
                      const timeInfo = calculateChileRemainingTime(item.fechaCierre);
                      return (
                        <tr
                          key={item.codigo}
                          className="hover:bg-slate-100/90 cursor-pointer transition-colors duration-200"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                              {item.codigo}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs sm:max-w-md">
                            <p className="line-clamp-2" title={cleanTextPrefixes(item.nombre)}>
                              {cleanTextPrefixes(item.nombre)}
                            </p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                            {item.cliente}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                item.tipo === 'Compra Agil'
                                  ? 'bg-purple-100 text-purple-800'
                                  : item.tipo === 'Convenio Marco'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-mono font-semibold text-xs">
                            {formatChileDateTime(item.fechaCierre)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                                timeInfo.dias <= 3
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              ⏳ {timeInfo.badgeText}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setAlertModalItem(item)}
                                className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-lg border border-amber-200 transition text-[11px]"
                                title="Crear Alerta Personalizada"
                              >
                                <Bell className="w-3.5 h-3.5 text-amber-600" />
                                <span>🔔 Crear Alerta</span>
                              </button>

                              <a
                                href={getItemOfficialUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg border border-slate-200 transition text-[11px]"
                                title="Ver Ficha Oficial Mercado Público"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                <span>🔗 Ver Ficha</span>
                              </a>

                              <button
                                onClick={() => onSelectLicitacionAI(item)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg font-bold text-[11px] transition shadow-xs"
                                title="Evaluar con IA"
                              >
                                Evaluar IA
                              </button>

                              <button
                                onClick={() => onAddPostulacion(item)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-bold text-[11px] transition"
                                title="Añadir a Postulaciones"
                              >
                                + Postular
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Oportunidades Vigentes
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalVigentes}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Activas
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Licitaciones, Convenios y Compra Ágil</p>
        </div>

        {/* Stat 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Destacados Últimos 7 Días
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-600">{ultimos7Dias.length}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-semibold">
              Prioridad Alta
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Publicadas o con cierres recientes</p>
        </div>

        {/* Stat 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Por Vencer (≤3 Días)
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-600">{urgentes.length}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
              Cierre Inminente
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Requieren propuesta inmediata</p>
        </div>

        {/* Stat 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monto Estimado Licitado
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              ${(montoTotalLicitado / 1000000).toFixed(0)}M
            </span>
            <span className="text-xs text-slate-500">CLP Aprox.</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{postulacionesEnCurso.length} postulaciones en cartera</p>
        </div>
      </div>

      {/* Prominent Section: PROCESOS DESTACADOS ÚLTIMOS 7 DÍAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">
              Procesos Importantes - ÚLTIMOS 7 DÍAS
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Prioridad
            </span>
          </div>

          <button
            onClick={() => onNavigateToRadar(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>Ver todos ({ultimos7Dias.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ultimos7Dias.slice(0, 6).map((item) => (
            <div
              key={item.codigo}
              className="bg-white rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between overflow-hidden relative"
            >
              {/* Highlight bar */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

              <div className="p-5 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-slate-900 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                      {item.codigo}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        item.tipo === 'Compra Agil'
                          ? 'bg-purple-100 text-purple-800'
                          : item.tipo === 'Convenio Marco'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.tipo}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      item.diasRestantes <= 3
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    ⏳ {item.diasRestantes} días
                  </span>
                </div>

                {/* Cliente & Title */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
                    {item.cliente}
                  </p>
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mt-0.5">
                    {item.nombre}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {item.descripcion}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => openGoogleCalendar(item)}
                  className="flex items-center space-x-1 text-slate-700 hover:text-blue-600 font-medium"
                  title="Sincronizar con Google Calendar"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google Cal</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectLicitacionAI(item)}
                    className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>IA Gemini</span>
                  </button>

                  <button
                    onClick={() => onAddPostulacion(item)}
                    className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Postular</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Postulaciones En Pipeline Summary & Quick Calendar Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Summary (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span>Estado de Mis Postulaciones en Curso</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {postulacionesEnCurso.length} activas
            </span>
          </div>

          <div className="space-y-3">
            {postulacionesEnCurso.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">
                No tienes postulaciones activas. Explora el buscador y haz clic en "Postular" en las licitaciones de tu interés.
              </p>
            ) : (
              postulacionesEnCurso.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border">
                        {post.codigoLicitacion}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {post.estadoPostulacion}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {post.licitacionNombre}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Responsable: <strong>{post.responsable}</strong> | Límite interno: {new Date(post.fechaLimiteInterna).toLocaleDateString('es-CL')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => openGoogleCalendar(post)}
                      className="flex items-center space-x-1 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg font-medium transition"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sync Calendar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Helper Box */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Sincronización Google Calendar</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Agrega automáticamente eventos y alertas a tu Google Calendar o descarga archivos .ics para mantener las fechas de presentación y preguntas al día.
            </p>
          </div>

          <div className="pt-6 space-y-2">
            <button
              onClick={openShareModal}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir Oportunidades</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Exportación instantánea a PDF, WhatsApp o Correo
            </p>
          </div>
        </div>
      </div>

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
