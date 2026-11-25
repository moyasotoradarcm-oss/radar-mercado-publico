import React from 'react';
import {
  LayoutDashboard,
  Search,
  Kanban,
  CalendarDays,
  Bell,
  FileSpreadsheet,
  Sparkles,
  Building2
} from 'lucide-react';
import { AlertaNotificacion } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'radar' | 'ordenescompra' | 'oc' | 'postulaciones' | 'calendar' | 'compradores' | 'alertas' | 'alerts' | 'historial-ia';
  setActiveTab: (tab: any) => void;
  notificaciones: AlertaNotificacion[];
  setNotificaciones?: React.Dispatch<React.SetStateAction<AlertaNotificacion[]>>;
  onMarkAllNotifsRead?: () => void;
  openSettings?: () => void;
  openReportsModal?: () => void;
  openShareModal?: () => void;
  openAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notificaciones,
  onMarkAllNotifsRead,
}) => {
  const unreadCount = (notificaciones || []).filter((n) => n && !n.leida).length;

  const handleAlertsClick = () => {
    setActiveTab('alertas');
    if (onMarkAllNotifsRead) {
      onMarkAllNotifsRead();
    }
  };

  const navItems = [
    {
      key: 'dashboard',
      label: 'Panel',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'dashboard',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: () => setActiveTab('dashboard'),
    },
    {
      key: 'radar',
      label: 'Buscador Radar',
      icon: <Search className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'radar',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: () => setActiveTab('radar'),
    },
    {
      key: 'ordenescompra',
      label: 'Órdenes de Compra',
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />,
      isActive: activeTab === 'ordenescompra' || activeTab === 'oc',
      activeClass: 'bg-emerald-600 text-white shadow',
      onClick: () => setActiveTab('ordenescompra'),
    },
    {
      key: 'postulaciones',
      label: 'Mis Postulaciones',
      icon: <Kanban className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'postulaciones',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: () => setActiveTab('postulaciones'),
    },
    {
      key: 'calendar',
      label: 'Calendario',
      icon: <CalendarDays className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'calendar',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: () => setActiveTab('calendar'),
    },
    {
      key: 'compradores',
      label: 'Compradores',
      icon: <Building2 className="w-4 h-4 shrink-0 text-cyan-400" />,
      isActive: activeTab === 'compradores',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: () => setActiveTab('compradores'),
    },
    {
      key: 'historial-ia',
      label: 'Historial IA',
      icon: <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />,
      isActive: activeTab === 'historial-ia',
      activeClass: 'bg-indigo-600 text-white shadow',
      onClick: () => setActiveTab('historial-ia'),
    },
    {
      key: 'alertas',
      label: 'Alertas',
      icon: <Bell className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'alertas' || activeTab === 'alerts',
      activeClass: 'bg-blue-600 text-white shadow',
      onClick: handleAlertsClick,
      badge: unreadCount,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 min-h-[4rem]">
          <div
            className="flex items-center gap-3 shrink-0 cursor-pointer"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                  Centro de Monitoreo & Oportunidades
                </span>
                <span className="bg-blue-500/20 text-cyan-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 whitespace-nowrap">
                  Bot & Radar
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block whitespace-nowrap">
                Licitaciones • Convenio Marco • Compra Ágil Chile
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  item.isActive
                    ? item.activeClass
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="md:hidden flex items-center gap-1 overflow-x-auto bg-slate-950 px-2 py-1.5 border-t border-slate-800 text-xs">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`py-1.5 px-2.5 text-center whitespace-nowrap shrink-0 rounded ${
              item.isActive
                ? `${item.activeClass} font-medium`
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
            {typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
          </button>
        ))}
      </div>
    </header>
  );
};
