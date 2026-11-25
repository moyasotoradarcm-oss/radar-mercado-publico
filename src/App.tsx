import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LicitacionesRadarView } from './components/LicitacionesRadarView';
import { PostulacionesPipelineView } from './components/PostulacionesPipelineView';
import { CalendarView } from './components/CalendarView';
import { AlertsView } from './components/AlertsView';
import { CompradoresView } from './components/CompradoresView';
import { AIEvaluatorModal } from './components/AIEvaluatorModal';
import { ShareModal } from './components/ShareModal';
import { ReportsModal } from './components/ReportsModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { AuthModal } from './components/AuthModal';
import { OrdenesCompraView } from './components/OrdenesCompraView';
import { HistorialEvaluacionesView } from './components/HistorialEvaluacionesView';
import { LicitacionItem, Postulacion, AlertaRule, AlertaNotificacion, OrdenCompraItem } from './types';
import { fetchOportunidadesMercadoPublico, fetch30DiasMercadoPublico, getLastApiWarning, resetApiWarning } from './services/mercadoPublicoApi';
import { filterOportunidades } from './utils/filterOportunidades';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'radar' | 'ordenescompra' | 'oc' | 'postulaciones' | 'calendar' | 'compradores' | 'alertas' | 'alerts' | 'historial-ia'>('dashboard');

  const [licitaciones, setLicitaciones] = useState<LicitacionItem[]>([]);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompraItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaRule[]>([]);
  const [notificaciones, setNotificaciones] = useState<AlertaNotificacion[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Modals state
  const [aiEvaluatorItem, setAiEvaluatorItem] = useState<LicitacionItem | null>(null);
  const [shareItem, setShareItem] = useState<LicitacionItem | undefined>(undefined);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportData, setReportData] = useState<any[] | undefined>(undefined);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [radarFilter7Days, setRadarFilter7Days] = useState(false);

  // Consumo directo de API Mercado Público (Barrido 30 Días + Oportunidades Clave)
  useEffect(() => {
    let isMounted = true;

    const loadOpportunitiesFromAPI = async () => {
      setIsLoadingApi(true);
      setApiNotice(null);
      resetApiWarning();
      try {
        const [api30Dias, apiOportunidades] = await Promise.all([
          fetch30DiasMercadoPublico(),
          fetchOportunidadesMercadoPublico()
        ]);

        // Unificar resultados
        const combinedItems = [...api30Dias, ...apiOportunidades];

        // Aplicar filtro: Conserva vigentes y vencidas hace menos de 24h
        const vigentesYRecientes = filterOportunidades(combinedItems);

        if (!isMounted) return;
        const catalogMap = new Map<string, LicitacionItem>();
        vigentesYRecientes.forEach((item) => {
          if (item && (item.id || item.codigo)) {
            catalogMap.set((item.id || item.codigo).toUpperCase(), item);
          }
        });
        setLicitaciones(Array.from(catalogMap.values()));

        const warning = getLastApiWarning();
        if (warning) {
          setApiNotice(`Datos incompletos: ${warning}`);
        } else if (catalogMap.size === 0) {
          setApiNotice('La API de Mercado Público no devolvió licitaciones vigentes.');
        }
      } catch (err) {
        console.warn('⚠️ Error al consultar la API de Mercado Público:', err);
        if (isMounted) setApiNotice('No fue posible obtener datos de Mercado Público. No se muestran datos de ejemplo.');
      } finally {
        if (isMounted) {
          setIsLoadingApi(false);
        }
      }
    };

    loadOpportunitiesFromAPI();

    return () => {
      isMounted = false;
    };
  }, []);

  // Incorporar resultados puntuales de búsqueda por código (Fast-Track)
  const handleAddFastTrackItems = useCallback((newItems: LicitacionItem[]) => {
    if (!newItems || newItems.length === 0) return;
    setLicitaciones((prevList) => {
      const catalogMap = new Map<string, LicitacionItem>();
      prevList.forEach((item) => {
        if (item && (item.id || item.codigo)) {
          catalogMap.set((item.id || item.codigo).toUpperCase(), item);
        }
      });
      newItems.forEach((item) => {
        if (item && (item.id || item.codigo)) {
          catalogMap.set((item.id || item.codigo).toUpperCase(), item);
        }
      });
      return Array.from(catalogMap.values());
    });
  }, []);

  // Filtrado reactivo de licitaciones vigentes y límite de renderizado para evitar lag en el DOM
  const licitacionesFiltradasVigentes = useMemo(() => {
    const filtradas = filterOportunidades(licitaciones);
    return filtradas;
  }, [licitaciones]);

  const handleOpenReportsModal = (type?: string, data?: any[]) => {
    setReportData(data);
    setShowReportsModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notificaciones={notificaciones}
        setNotificaciones={setNotificaciones}
        openAuthModal={() => setShowAuthModal(true)}
        openSettings={() => setShowSettingsModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {isLoadingApi && (
          <div className="mb-4 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
            Consultando la API oficial de Mercado Público…
          </div>
        )}
        {!isLoadingApi && apiNotice && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {apiNotice}
          </div>
        )}
        {activeTab === 'dashboard' && (
          <DashboardView
            licitaciones={licitacionesFiltradasVigentes}
            postulaciones={postulaciones}
            ordenesCompra={ordenesCompra}
            setActiveTab={setActiveTab}
            setRadarFilter7Days={setRadarFilter7Days}
            onSelectLicitacionAI={(item) => setAiEvaluatorItem(item)}
            onAddPostulacion={(item) => {
              const newPostulacion: Postulacion = {
                id: `post-${Date.now()}`,
                codigoLicitacion: item.codigo,
                licitacionNombre: item.nombre,
                cliente: item.cliente,
                tipo: item.tipo,
                url: item.url,
                montoOfertaClp: item.montoEstimadoClp,
                estadoPostulacion: 'Preparando',
                responsable: 'Equipo Licitaciones',
                fechaCierreOriginal: item.fechaCierre,
                fechaLimiteInterna: item.fechaCierre,
                notas: 'Postulación creada desde Dashboard',
                checklist: [],
                historial: [],
                updatedAt: new Date().toISOString()
              };
              setPostulaciones((prev) => [newPostulacion, ...prev]);
              setActiveTab('postulaciones');
            }}
            onNavigateToRadar={(filter7Days) => {
              if (filter7Days !== undefined) setRadarFilter7Days(filter7Days);
              setActiveTab('radar');
            }}
            openReportsModal={() => handleOpenReportsModal('dashboard')}
            openShareModal={() => setShowShareModal(true)}
            openAuthModal={() => setShowAuthModal(true)}
            onAddAlerta={(alerta) => setAlertas((prev) => [alerta, ...prev])}
            onFastTrackSearchResult={handleAddFastTrackItems}
          />
        )}

        {activeTab === 'radar' && (
          <LicitacionesRadarView
            licitaciones={licitacionesFiltradasVigentes}
            radarFilter7Days={radarFilter7Days}
            setRadarFilter7Days={setRadarFilter7Days}
            setActiveTab={setActiveTab}
            openAiEvaluator={(item) => setAiEvaluatorItem(item)}
            onSelectLicitacionAI={(item) => setAiEvaluatorItem(item)}
            onFastTrackSearchResult={handleAddFastTrackItems}
            onAddPostulacion={(item) => {
              const newPostulacion: Postulacion = {
                id: `post-${Date.now()}`,
                codigoLicitacion: item.codigo,
                licitacionNombre: item.nombre,
                cliente: item.cliente,
                tipo: item.tipo,
                url: item.url,
                montoOfertaClp: item.montoEstimadoClp,
                estadoPostulacion: 'Preparando',
                responsable: 'Equipo Licitaciones',
                fechaCierreOriginal: item.fechaCierre,
                fechaLimiteInterna: item.fechaCierre,
                notas: 'Postulación creada desde Radar',
                checklist: [],
                historial: [],
                updatedAt: new Date().toISOString()
              };
              setPostulaciones((prev) => [newPostulacion, ...prev]);
              setActiveTab('postulaciones');
            }}
            openShareModal={(item) => {
              setShareItem(item);
              setShowShareModal(true);
            }}
            onAddAlerta={(alerta) => setAlertas((prev) => [alerta, ...prev])}
          />
        )}

        {(activeTab === 'ordenescompra' || activeTab === 'oc') && (
          <OrdenesCompraView
            ordenesCompra={ordenesCompra}
            openReportsModal={(type, data) => handleOpenReportsModal('ordenescompra', data || ordenesCompra)}
          />
        )}

        {activeTab === 'postulaciones' && (
          <PostulacionesPipelineView
            postulaciones={postulaciones}
            setPostulaciones={setPostulaciones}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView postulaciones={postulaciones} />
        )}

        {activeTab === 'compradores' && (
          <CompradoresView />
        )}

        {(activeTab === 'alerts' || activeTab === 'alertas') && (
          <AlertsView
            alertas={alertas}
            setAlertas={setAlertas}
          />
        )}

        {activeTab === 'historial-ia' && (
          <HistorialEvaluacionesView />
        )}
      </main>

      {/* Modales globales */}
      {aiEvaluatorItem && (
        <AIEvaluatorModal
          item={aiEvaluatorItem}
          onClose={() => setAiEvaluatorItem(null)}
          onAddPostulacion={(item) => {
            const newPostulacion: Postulacion = {
              id: `post-${Date.now()}`,
              codigoLicitacion: item.codigo,
              licitacionNombre: item.nombre,
              cliente: item.cliente,
              tipo: item.tipo,
              url: item.url,
              montoOfertaClp: item.montoEstimadoClp,
              estadoPostulacion: 'Preparando',
              responsable: 'Equipo Licitaciones',
              fechaCierreOriginal: item.fechaCierre,
              fechaLimiteInterna: item.fechaCierre,
              notas: 'Añadido desde Evaluación IA Gemini',
              checklist: [],
              historial: [],
              updatedAt: new Date().toISOString()
            };
            setPostulaciones((prev) => [newPostulacion, ...prev]);
            setActiveTab('postulaciones');
          }}
        />
      )}

      {showShareModal && shareItem && (
        <ShareModal
          item={shareItem}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showReportsModal && (
        <ReportsModal
          licitaciones={licitacionesFiltradasVigentes}
          postulaciones={postulaciones}
          ordenesCompra={ordenesCompra}
          data={reportData}
          onClose={() => {
            setShowReportsModal(false);
            setReportData(undefined);
          }}
        />
      )}

      {showSettingsModal && (
        <SystemSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
