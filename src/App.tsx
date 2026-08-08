import React, { useState } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LicitacionesRadarView } from './components/LicitacionesRadarView';
import { PostulacionesPipelineView } from './components/PostulacionesPipelineView';
import { CalendarView } from './components/CalendarView';
import { AlertsView } from './components/AlertsView';
import { AIEvaluatorModal } from './components/AIEvaluatorModal';
import { ShareModal } from './components/ShareModal';
import { ReportsModal } from './components/ReportsModal';
import { TicketSettingsModal } from './components/TicketSettingsModal';
import { AuthModal } from './components/AuthModal';

import {
  INITIAL_LICITACIONES,
  INITIAL_POSTULACIONES,
  INITIAL_ALERTAS,
  INITIAL_NOTIFICACIONES
} from './data/mockData';
import { LicitacionItem, Postulacion, AlertaRule, AlertaNotificacion } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'radar' | 'postulaciones' | 'calendar' | 'alertas'>('dashboard');

  const [licitaciones, setLicitaciones] = useState<LicitacionItem[]>(INITIAL_LICITACIONES);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>(INITIAL_POSTULACIONES);
  const [alertas, setAlertas] = useState<AlertaRule[]>(INITIAL_ALERTAS);
  const [notificaciones, setNotificaciones] = useState<AlertaNotificacion[]>(INITIAL_NOTIFICACIONES);

  // Modals state
  const [aiEvaluatorItem, setAiEvaluatorItem] = useState<LicitacionItem | null>(null);
  const [shareItem, setShareItem] = useState<LicitacionItem | undefined>(undefined);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [radarFilter7Days, setRadarFilter7Days] = useState(false);

  // Actions
  const handleAddPostulacion = (item: LicitacionItem) => {
    const exists = postulaciones.some((p) => p.codigoLicitacion === item.codigo);
    if (exists) {
      setActiveTab('postulaciones');
      return;
    }

    const newPost: Postulacion = {
      id: `post-${Date.now()}`,
      codigoLicitacion: item.codigo,
      licitacionNombre: item.nombre,
      cliente: item.cliente,
      tipo: item.tipo,
      url: item.url,
      montoOfertaClp: item.montoEstimadoClp,
      estadoPostulacion: 'Interes',
      responsable: 'Mauricio Moya',
      fechaCierreOriginal: item.fechaCierre,
      fechaLimiteInterna: new Date(new Date(item.fechaCierre).getTime() - 24 * 60 * 60 * 1000).toISOString(),
      notas: `Licitación agregada desde el Buscador Radar el ${new Date().toLocaleDateString('es-CL')}.`,
      checklist: [
        { id: 'c1', label: 'Anexo N°1: Identificación del Oferente', completed: false },
        { id: 'c2', label: 'Garantía de Seriedad de la Oferta', completed: false },
        { id: 'c3', label: 'Propuesta Técnica y Arquitectura', completed: false },
        { id: 'c4', label: 'Oferta Económica Formulario Mercado Público', completed: false }
      ],
      historial: [
        {
          id: `h-${Date.now()}`,
          fecha: new Date().toLocaleString('es-CL'),
          titulo: 'Postulación Creada',
          detalle: 'Iniciada cartera de seguimiento.'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    setPostulaciones((prev) => [newPost, ...prev]);
    setActiveTab('postulaciones');
  };

  const handleUpdatePostulacion = (updated: Postulacion) => {
    setPostulaciones((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeletePostulacion = (id: string) => {
    setPostulaciones((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddAlerta = (newAlerta: AlertaRule) => {
    setAlertas((prev) => [newAlerta, ...prev]);
  };

  const handleDeleteAlerta = (id: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleAlerta = (id: string) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, activa: !a.activa } : a))
    );
  };

  const handleMarkNotifRead = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const handleClearNotifs = () => {
    setNotificaciones([]);
  };

  const handleNavigateToRadar7Days = (filter7Days = false) => {
    setRadarFilter7Days(filter7Days);
    setActiveTab('radar');
  };

  const handleOpenShareForItem = (item: LicitacionItem) => {
    setShareItem(item);
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notificaciones={notificaciones}
        onMarkAllNotifsRead={handleMarkAllNotifsRead}
        openSettings={() => setShowSettingsModal(true)}
        openReportsModal={() => setShowReportsModal(true)}
        openShareModal={() => {
          setShareItem(undefined);
          setShowShareModal(true);
        }}
        openAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            licitaciones={licitaciones}
            postulaciones={postulaciones}
            onSelectLicitacionAI={(item) => setAiEvaluatorItem(item)}
            onAddPostulacion={handleAddPostulacion}
            onNavigateToRadar={handleNavigateToRadar7Days}
            openReportsModal={() => setShowReportsModal(true)}
            openShareModal={() => {
              setShareItem(undefined);
              setShowShareModal(true);
            }}
            openAuthModal={() => setShowAuthModal(true)}
            onAddAlerta={handleAddAlerta}
          />
        )}

        {activeTab === 'radar' && (
          <LicitacionesRadarView
            licitaciones={licitaciones}
            onSelectLicitacionAI={(item) => setAiEvaluatorItem(item)}
            onAddPostulacion={handleAddPostulacion}
            onShareItem={handleOpenShareForItem}
            onAddAlerta={handleAddAlerta}
            initial7DaysFilter={radarFilter7Days}
          />
        )}

        {activeTab === 'postulaciones' && (
          <PostulacionesPipelineView
            postulaciones={postulaciones}
            onUpdatePostulacion={handleUpdatePostulacion}
            onDeletePostulacion={handleDeletePostulacion}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            licitaciones={licitaciones}
            postulaciones={postulaciones}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertsView
            alertas={alertas}
            notificaciones={notificaciones}
            onAddAlerta={handleAddAlerta}
            onDeleteAlerta={handleDeleteAlerta}
            onToggleAlerta={handleToggleAlerta}
            onMarkNotifRead={handleMarkNotifRead}
            onMarkAllNotifsRead={handleMarkAllNotifsRead}
            onClearNotifs={handleClearNotifs}
          />
        )}
      </main>

      {/* AI Evaluator Modal */}
      {aiEvaluatorItem && (
        <AIEvaluatorModal
          item={aiEvaluatorItem}
          onClose={() => setAiEvaluatorItem(null)}
          onAddPostulacion={handleAddPostulacion}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          item={shareItem}
          allItems={licitaciones}
          onClose={() => {
            setShowShareModal(false);
            setShareItem(undefined);
          }}
        />
      )}

      {/* Reports Modal */}
      {showReportsModal && (
        <ReportsModal
          licitaciones={licitaciones}
          postulaciones={postulaciones}
          onClose={() => setShowReportsModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <TicketSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
