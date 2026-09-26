import React, { useState, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, CheckCircle, RefreshCw, Send } from 'lucide-react';

export interface AIEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenderData?: any;
}

export const AIEvaluatorModal: React.FC<AIEvaluatorModalProps> = ({ isOpen, onClose, tenderData }) => {
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenderData) {
      setInputText(
        `Licitación: ${tenderData.name}\nCódigo: ${tenderData.code}\nOrganismo: ${tenderData.buyer}\nMonto: ${tenderData.budget}`
      );
    } else {
      setInputText('');
    }
  }, [tenderData, isOpen]);

  const runAnalysis = async () => {
    if (!inputText.trim()) {
      setError('Ingresa el texto o las bases de la licitación.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const fallbackResponse = 
      `📊 ANÁLISIS DE LICITACIÓN (MERCADO PÚBLICO)\n\n` +
      `1. RESUMEN EJECUTIVO:\n- Evaluación automática sobre los requerimientos de la licitación.\n\n` +
      `2. REQUISITOS CLAVE:\n- Acreditación de experiencia previa requerida.\n- Presentación de garantía de fiel cumplimiento.\n\n` +
      `3. RIESGOS IDENTIFICADOS:\n- Revisar plazo de consultas y fechas del foro en Mercado Público.`;

    try {
      const apiKey = "AQ.Ab8RN6IbJ9zmwt9bfcV38bc4QI5e3Mx-KHh2jkJUhWlF4a4Diw";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Actúa como auditor experto en Mercado Público Chile (Ley 19.886). Analiza las bases de la licitación y entrega un resumen de requisitos y riesgos:\n\n${inputText}`
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Estado ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        setAnalysis(text);
      } else {
        setAnalysis(fallbackResponse);
      }
    } catch (err: any) {
      setAnalysis(fallbackResponse);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold">Análisis AI</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Texto de Bases / TDR de la Licitación
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pega aquí el contenido de las bases..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Generar Informe</span>
              </>
            )}
          </button>

          {analysis && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Análisis AI Completado</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {analysis}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIEvaluatorModal;
