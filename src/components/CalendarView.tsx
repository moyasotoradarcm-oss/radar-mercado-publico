import React, { useState } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  ExternalLink,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { LicitacionItem, Postulacion } from '../types';
import { openGoogleCalendar, downloadICSFile } from '../lib/googleCalendar';
import { formatChileDateTime, calculateChileRemainingTime } from '../lib/dateUtils';

interface CalendarViewProps {
  licitaciones: LicitacionItem[];
  postulaciones: Postulacion[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  licitaciones,
  postulaciones
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'postulaciones'>('all');

  // Days in current month simulation (August 2026)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Group events by day of August 2026
  const eventsByDay = React.useMemo(() => {
    const map: Record<number, { title: string; code: string; type: string; dateStr: string; item: LicitacionItem; updated?: boolean }[]> = {};

    const itemsToProcess = filterMode === 'postulaciones'
      ? licitaciones.filter(l => postulaciones.some(p => p.codigoLicitacion === l.codigo))
      : licitaciones;

    itemsToProcess.forEach((item) => {
      try {
        const d = new Date(item.fechaCierre);
        if (!isNaN(d.getTime())) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({
            title: item.nombre,
            code: item.codigo,
            type: item.tipo,
            dateStr: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            item: item,
            updated: item.fechaActualizada
          });
        }
      } catch {
        // ignore invalid dates
      }
    });

    return map;
  }, [licitaciones, postulaciones, filterMode]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              <span>Calendario de Fechas Clave & Google Calendar Sync</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión centralizada de límites de recepción de ofertas, preguntas/respuestas y apertura técnica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
              }`}
            >
              Todas las Oportunidades
            </button>
            <button
              onClick={() => setFilterMode('postulaciones')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'postulaciones' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
              }`}
            >
              Mis Postulaciones ({postulaciones.length})
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Month Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-slate-900">Agosto 2026</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              Sincronización Activa
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" /> Cierre Licitación
            </span>
            <span className="flex items-center ml-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" /> Fecha Actualizada
            </span>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 py-2 border-b">
          <div>Lunes</div>
          <div>Martes</div>
          <div>Miércoles</div>
          <div>Jueves</div>
          <div>Viernes</div>
          <div>Sábado</div>
          <div>Domingo</div>
        </div>

        {/* Calendar Grid (31 days) */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day) => {
            const dayEvents = eventsByDay[day] || [];
            const isToday = day === 7; // August 7 2026 simulated today

            return (
              <div
                key={day}
                className={`min-h-[100px] p-2 rounded-xl border flex flex-col justify-between text-xs transition ${
                  isToday
                    ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span className={isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : ''}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 my-1 overflow-y-auto max-h-[75px] scrollbar-none">
                  {dayEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      onClick={() => openGoogleCalendar(ev.item)}
                      className={`p-1.5 rounded border text-[10px] cursor-pointer font-semibold transition hover:scale-102 ${
                        ev.updated
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-white border-blue-200 text-blue-900 shadow-2xs'
                      }`}
                      title={`Haz clic para agregar a Google Calendar: ${ev.title}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold truncate">{ev.code}</span>
                        <span>{ev.dateStr}</span>
                      </div>
                      <p className="line-clamp-1 font-normal text-slate-700 mt-0.5">{ev.title}</p>
                    </div>
                  ))}
                </div>

                <div className="text-[9px] text-slate-400 font-medium text-right">
                  {isToday ? 'Hoy' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events Detailed List & Quick Sync */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Próximos Hitos y Cierres Importantes</span>
        </h3>

        <div className="divide-y divide-slate-100">
          {licitaciones.map((item) => {
            const timeInfo = calculateChileRemainingTime(item.fechaCierre);
            return (
              <div
                key={item.codigo}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-3 rounded-xl transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                      {item.codigo}
                    </span>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      Cierre: {formatChileDateTime(item.fechaCierre)}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ⏳ {timeInfo.badgeText}
                    </span>
                    {item.fechaActualizada && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Fecha Actualizada</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-slate-900 text-sm">{item.nombre}</h4>
                  <p className="text-xs text-slate-500">{item.cliente}</p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => downloadICSFile(item)}
                    className="flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition"
                    title="Descargar archivo .ics"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Descargar .ics</span>
                  </button>

                  <button
                    onClick={() => openGoogleCalendar(item)}
                    className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Google Calendar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
