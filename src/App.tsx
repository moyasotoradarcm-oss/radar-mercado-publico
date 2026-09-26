import React, { useState } from 'react';
import { 
  Sparkles, Search, LayoutDashboard, FileText, Filter, TrendingUp, 
  AlertCircle, CheckCircle2, Clock, Building2, DollarSign, Calendar,
  ChevronRight, ExternalLink, RefreshCw, BarChart3, ShieldAlert
} from 'lucide-react';
import { AIEvaluatorModal } from './components/AIEvaluatorModal';

interface Tender {
  id: string;
  code: string;
  name: string;
  buyer: string;
  closingDate: string;
  budget: string;
  status: 'Activa' | 'Cierre Inminente' | 'Evaluación' | 'Adjudicada';
  category: string;
  matchScore: number;
}

const MOCK_TENDERS: Tender[] = [
  {
    id: '1',
    code: '1502-23-LE24',
    name: 'Servicio de Mantenimiento Integral de Sistemas Informáticos e Infraestructura Datacenter',
    buyer: 'Hospital San José de Santiago',
    closingDate: '2026-08-25',
    budget: '$45.000.000 CLP',
    status: 'Cierre Inminente',
    category: 'Tecnología & TI',
    matchScore: 94
  },
  {
    id: '2',
    code: '2234-12-LP24',
    name: 'Adquisición de Equipamiento Tecnológico, Servidores e Infraestructura Cloud Híbrida',
    buyer: 'Ministerio de Educación (MINEDUC)',
    closingDate: '2026-09-10',
    budget: '$120.000.000 CLP',
    status: 'Activa',
    category: 'Hardware & Nube',
    matchScore: 88
  },
  {
    id: '3',
    code: '854-5-LR24',
    name: 'Consultoría Especializada en Ciberseguridad, Hacking Ético y Auditoría SGSI ISO 27001',
    buyer: 'Subsecretaría de Telecomunicaciones (SUBTEL)',
    closingDate: '2026-08-18',
    budget: '$28.000.000 CLP',
    status: 'Cierre Inminente',
    category: 'Seguridad TI',
    matchScore: 96
  },
  {
    id: '4',
    code: '608-44-LE24',
    name: 'Desarrollo de Plataforma Web Transaccional y API Gateway para Servicios Ciudadanos',
    buyer: 'Municipalidad de Las Condes',
    closingDate: '2026-09-02',
    budget: '$65.000.000 CLP',
    status: 'Activa',
    category: 'Software & Dev',
    matchScore: 82
  },
  {
    id: '5',
    code: '1021-8-LP24',
    name: 'Soporte Técnico Especializado Nivel 2 y 3 para Redes Corporativas CISCO/Fortinet',
    buyer: 'Servicio de Impuestos Internos (SII)',
    closingDate: '2026-09-15',
    budget: '$90.000.000 CLP',
    status: 'Activa',
    category: 'Redes & Conectividad',
    matchScore: 90
  }
];

export function App() {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'licitaciones' | 'compra_agil' | 'convenio'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenAIModal = (tender?: Tender) => {
    setSelectedTender(tender || null);
    setIsAIModalOpen(true);
  };

  const filteredTenders = MOCK_TENDERS.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.buyer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex font-sans antialiased">
      {/* Sidebar de Navegación Lateral */}
      <aside className="w-68 bg-[#0B0F19] border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-none">Radar Público</h1>
              <span className="text-[10px] font-medium text-indigo-400 tracking-wider uppercase">AI Intelligence v2.5</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button className="flex items-center gap-3 w-full px-3.5 py-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 rounded-xl font-medium text-sm transition-all">
              <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Monitoreo Principal
            </button>
            <button className="flex items-center gap-3 w-full px-3.5 py-2.5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl text-sm transition-all">
              <Search className="w-4 h-4" /> Buscador Avanzado
            </button>
            <button className="flex items-center gap-3 w-full px-3.5 py-2.5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl text-sm transition-all">
              <BarChart3 className="w-4 h-4" /> Analítica de Mercado
            </button>
            <button className="flex items-center gap-3 w-full px-3.5 py-2.5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl text-sm transition-all">
              <ShieldAlert className="w-4 h-4" /> Alertas & Riesgos
            </button>
          </nav>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Motor AI Conectado
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sincronización activa con Mercado Público Chile (Ley 19.886).
          </p>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto">
        {/* Header Superior */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Centro de Monitoreo & Oportunidades</h2>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                En vivo
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Detección y auditoría automatizada con IA para Licitaciones, Convenio Marco y Compra Ágil
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleOpenAIModal()}
              className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all border border-indigo-400/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Evaluar con AI</span>
            </button>
          </div>
        </header>

        {/* Tarjetas KPI de Métricas */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-[#0B0F19] border border-slate-800/80 p-5 rounded-2xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Oportunidades Activas</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">309</span>
              <span className="text-xs text-emerald-400 font-medium">+12% hoy</span>
            </div>
            <p className="text-[11px] text-slate-500">Filtradas por concordancia de rubro</p>
          </div>

          <div className="bg-[#0B0F19] border border-slate-800/80 p-5 rounded-2xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Cierre Inminente</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">5</span>
              <span className="text-xs text-amber-400/80 font-medium">&lt; 48 horas</span>
            </div>
            <p className="text-[11px] text-slate-500">Requieren acción prioritaria</p>
          </div>

          <div className="bg-[#0B0F19] border border-slate-800/80 p-5 rounded-2xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Monto Total Disponible</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">$1.480M</span>
              <span className="text-xs text-slate-400">CLP</span>
            </div>
            <p className="text-[11px] text-slate-500">En licitaciones de alta coincidencia</p>
          </div>

          <div className="bg-[#0B0F19] border border-slate-800/80 p-5 rounded-2xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Compatibilidad AI</span>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-violet-400">92%</span>
              <span className="text-xs text-emerald-400 font-medium">Promedio</span>
            </div>
            <p className="text-[11px] text-slate-500">Basado en perfil técnico de tu empresa</p>
          </div>
        </section>

        {/* Sección de Filtros y Tabla Principal */}
        <section className="bg-[#0B0F19] border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Todas (309)
              </button>
              <button 
                onClick={() => setActiveTab('licitaciones')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'licitaciones' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Licitaciones públicas
              </button>
              <button 
                onClick={() => setActiveTab('compra_agil')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'compra_agil' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Compra Ágil
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código, nombre u organismo..." 
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-64 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Licitaciones */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Licitación / ID</th>
                  <th className="py-3.5 px-4">Organismo Comprador</th>
                  <th className="py-3.5 px-4">Monto Estimado</th>
                  <th className="py-3.5 px-4">Cierre</th>
                  <th className="py-3.5 px-4">Match AI</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4 max-w-md">
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {tender.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {tender.code}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {tender.category}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{tender.buyer}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-100">
                      {tender.budget}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        {tender.status === 'Cierre Inminente' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {tender.closingDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">{tender.closingDate}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${tender.matchScore > 90 ? 'bg-emerald-400' : 'bg-indigo-400'}`} 
                            style={{ width: `${tender.matchScore}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-200">{tender.matchScore}%</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenAIModal(tender)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Evaluar AI</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Componente Modal de Evaluación AI */}
        <AIEvaluatorModal 
          isOpen={isAIModalOpen} 
          onClose={() => setIsAIModalOpen(false)}
          tenderData={selectedTender}
        />
      </main>
    </div>
  );
}

export default App;
