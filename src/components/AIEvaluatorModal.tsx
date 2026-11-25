import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  UserCheck,
  X,
  Loader2,
  Plus,
  CalendarDays,
  Download
} from 'lucide-react';
import { LicitacionItem, GeminiAnalysisResult } from '../types';
import { generateAIEvaluationPDF } from '../lib/aiEvaluationPdf';
import { resolveOrganismo } from '../lib/organismosCache';
import { cacheAiEvaluation, getCachedAiEvaluation } from '../lib/aiEvaluationCache';

const AI_EVALUATION_PROFILE = 'Empresa Chilena de Software, Consultoría TI, Inteligencia Artificial, Servicios Nube (GCP/AWS/Azure), Geolocalización (Maps/GIS) y Ciberseguridad.';

interface AIEvaluatorModalProps {
  item?: LicitacionItem | null;
  onClose: () => void;
  onAddPostulacion?: (item: LicitacionItem) => void;
  preloadedAnalysis?: GeminiAnalysisResult;
}

export const AIEvaluatorModal: React.FC<AIEvaluatorModalProps> = ({
  item,
  onClose,
  onAddPostulacion,
  preloadedAnalysis
}) => {
  const safeItem = item ?? null;
  const codigoConsulta = String(safeItem?.CodigoExterno || safeItem?.codigo || safeItem?.id || '').trim();
  const codigoDisplay = safeItem?.codigo || safeItem?.id || 'Sin código';
  const nombreDisplay = safeItem?.nombre || safeItem?.licitacionNombre || 'Sin título de licitación';
  const cachedAnalysis = safeItem ? getCachedAiEvaluation(safeItem, AI_EVALUATION_PROFILE) : null;

  const [loading, setLoading] = useState(!preloadedAnalysis && !cachedAnalysis && !!safeItem);
  const [submitting, setSubmitting] = useState(false);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(preloadedAnalysis || cachedAnalysis || null);
  const [organismoDetalle, setOrganismoDetalle] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!codigoConsulta) return () => { isMounted = false; };

    void resolveOrganismo(codigoConsulta, nombreDisplay).then((nombre) => {
      if (isMounted && nombre) setOrganismoDetalle({ codigo: codigoConsulta, nombre });
    });

    return () => {
      isMounted = false;
    };
  }, [codigoConsulta, nombreDisplay]);

  const itemOrganismo = [
    safeItem?.Comprador?.NombreOrganismo,
    safeItem?.NombreOrganismo,
    safeItem?.organismoNombre,
    safeItem?.organismo,
    safeItem?.nombreOrganismo
  ].find((value) =>
    typeof value === 'string' &&
    value.trim() &&
    value.trim() !== String(safeItem?.Nombre || safeItem?.nombre || '').trim() &&
    !['sin organismo', 'organismo no especificado', 'organismo mercado público', 'mercado público (ver ficha)'].includes(value.trim().toLowerCase())
  );
  const organismoDisplay = (organismoDetalle?.codigo === codigoConsulta ? organismoDetalle.nombre : null)
    || itemOrganismo
    || 'Consultar en Ficha';

  useEffect(() => {
    let isMounted = true;
    let requestController: AbortController | null = null;

    if (!safeItem) {
      setLoading(false);
      setError(null);
      setAnalysis(null);
      return;
    }

    if (preloadedAnalysis) {
      setAnalysis(preloadedAnalysis);
      setLoading(false);
      return;
    }

    const cached = getCachedAiEvaluation(safeItem, AI_EVALUATION_PROFILE);
    if (cached) {
      setAnalysis(cached);
      setError(null);
      setLoading(false);
      return;
    }

    async function runAI() {
      const controller = new AbortController();
      requestController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      setLoading(true);
      setError(null);
      setAnalysis(null);

      try {
        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            licitacion: safeItem,
            perfilEmpresa: AI_EVALUATION_PROFILE
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Error consultando servicio Gemini AI.');
        }

        const data = await response.json();
        if (isMounted) {
          setAnalysis(data);
          cacheAiEvaluation(safeItem, AI_EVALUATION_PROFILE, data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error AI Analzye:", err);
          setError(controller.signal.aborted
            ? 'La consulta superó 5 segundos; mostramos una evaluación de respaldo.'
            : 'Aviso: Error de conexión detectado. Cargando evaluación de respaldo.');
          const fallbackAnalysis = {
            matchScore: 0,
            resumenEjecutivo: "Análisis de Inteligencia Artificial no disponible temporalmente por interrupción de conexión o servicio. Recomendamos revisar las bases directamente.",
            requisitosClave: ["Revisar las bases administrativas y técnicas adjuntas en la plataforma Mercado Público."],
            riesgosDetectados: ["Análisis de riesgo no disponible por desconexión temporal."],
            recomendacionesEstrategicas: ["Reintente la evaluación más tarde cuando la conexión se estabilice."],
            perfilesRequeridos: ["Sin información (Error de red)"],
            cartaGantt: "No disponible.",
            cacheable: true,
            fallback: true
          } as any;
          setAnalysis(fallbackAnalysis);
          cacheAiEvaluation(safeItem, AI_EVALUATION_PROFILE, fallbackAnalysis);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      }
    }

    runAI();

    return () => {
      isMounted = false;
      requestController?.abort();
    };
  }, [safeItem, preloadedAnalysis]);

  const handleAddPostulacion = async () => {
    if (!safeItem) {
      setError('No hay información disponible para registrar la postulación.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        id: safeItem.codigo || (safeItem as any).id,
        codigo: safeItem.codigo,
        licitacion: safeItem,
        aiAnalysis: {
          requisitos: analysis?.requisitosClave || (analysis as any)?.requisitos || [],
          riesgos: analysis?.riesgosDetectados || (analysis as any)?.riesgos || [],
          recomendaciones: analysis?.recomendacionesEstrategicas || (analysis as any)?.recomendaciones || [],
          perfiles: analysis?.perfilesRequeridos || [],
          matchScore: analysis?.matchScore,
          resumenEjecutivo: analysis?.resumenEjecutivo,
          cartaGantt: analysis?.cartaGantt
        }
      };

      const response = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo registrar la postulación en el servidor.');
      }

      setToastSuccess('Añadido a Mis Postulaciones correctamente');

      if (onAddPostulacion) {
        onAddPostulacion(safeItem);
      }

      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      console.error('Error guardando postulación:', err);
      setError(err.message || 'Error al conectar con la base de datos de postulaciones.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!safeItem) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200">
          <p className="text-base font-bold text-slate-900 mb-2">No hay información disponible</p>
          <p className="text-sm text-slate-600">No hay datos para mostrar de esta licitación.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Toast Notification Alert */}
      {toastSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastSuccess}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded">
                {codigoDisplay}
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Análisis Términos de Referencia TDR con Gemini AI</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {nombreDisplay}
            </h3>
            <p className="text-xs font-semibold text-slate-500">Organismo: {organismoDisplay}</p>
          </div>

          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-indigo-600">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-sm font-bold text-slate-800">
              Evaluando requerimientos técnicos e idoneidad con Gemini AI...
            </p>
            <p className="text-xs text-slate-400">Resumen estimado en ~3 segundos. Analizando perfil, garantías y competitividad.</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
            <p className="font-bold flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" /> Error de Evaluación IA
            </p>
            <p>{error}</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {analysis?.fallback && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  Esta evaluación <strong>no fue generada por IA</strong>: Gemini no estuvo disponible. El puntaje se estimó solo por palabras clave y no considera las bases de la licitación.
                </span>
              </div>
            )}
            {/* Match score card */}
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md">
              <div>
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Nivel de Afinidad Estimado (Match Score)
                </span>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {analysis?.matchScore || 0}%
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {analysis?.fallback
                    ? 'Estimación por palabras clave (sin IA).'
                    : 'Estimado por IA según el perfil de la empresa. Verifique las bases antes de postular.'}
                </p>
              </div>

              <div className="w-16 h-16 rounded-full border-4 border-indigo-400 flex items-center justify-center font-extrabold text-xl text-indigo-300 bg-indigo-950/50">
                {analysis?.matchScore || 0}%
              </div>
            </div>

            {/* Resumen Ejecutivo */}
            <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Resumen Ejecutivo
              </h4>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {analysis?.resumenEjecutivo || 'No disponible'}
              </p>
            </div>

            {/* Requisitos Clave & Riesgos (2 grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Requisitos */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-2">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Requisitos Clave TDR
                </h4>
                <ul className="text-xs text-emerald-950 space-y-1 list-disc pl-4">
                  {(analysis?.requisitosClave || (analysis as any)?.requisitos || [])?.map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Riesgos */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                  Riesgos y Barreras Detectadas
                </h4>
                <ul className="text-xs text-amber-950 space-y-1 list-disc pl-4">
                  {(analysis?.riesgosDetectados || (analysis as any)?.riesgos || [])?.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recomendaciones Estratégicas */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center">
                <Lightbulb className="w-4 h-4 mr-1.5 text-blue-600" />
                Recomendaciones Ganadoras para la Propuesta
              </h4>
              <ul className="text-xs text-blue-950 space-y-1 list-disc pl-4">
                {(analysis?.recomendacionesEstrategicas || (analysis as any)?.recomendaciones || [])?.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Perfiles Requeridos */}
            {analysis?.perfilesRequeridos && analysis?.perfilesRequeridos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-500" /> Perfiles y Capacidades Requeridas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis?.perfilesRequeridos?.map((p, i) => (
                    <span key={i} className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Carta Gantt (Markdown) */}
            {analysis?.cartaGantt && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 overflow-x-auto">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center">
                  <CalendarDays className="w-4 h-4 mr-1.5 text-slate-600" />
                  Carta Gantt Preliminar (Markdown)
                </h4>
                <pre className="text-xs text-slate-700 font-mono whitespace-pre bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-2">
                  {analysis?.cartaGantt}
                </pre>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 disabled:opacity-50"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={() => generateAIEvaluationPDF(item, analysis)}
                disabled={submitting || loading}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Reporte PDF</span>
              </button>
            )}

            {onAddPostulacion && (
              <button
                onClick={handleAddPostulacion}
                disabled={submitting || loading}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Añadir a Mis Postulaciones</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
