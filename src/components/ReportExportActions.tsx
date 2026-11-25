import React, { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';

type ReportFormat = 'xlsx' | 'docx' | 'pdf';

interface ReportExportActionsProps {
  items: any[];
  className?: string;
}

export const ReportExportActions: React.FC<ReportExportActionsProps> = ({ items, className = '' }) => {
  const [format, setFormat] = useState<ReportFormat>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!items.length || isExporting) return;
    setIsExporting(true);
    setError('');

    try {
      const reportService = await import('../services/reportService');
      if (format === 'xlsx') await reportService.exportOpportunitiesToExcel(items);
      if (format === 'docx') await reportService.exportOpportunitiesToWord(items);
      if (format === 'pdf') reportService.exportOpportunitiesToPdf(items);
    } catch (exportError) {
      console.error('No se pudo generar el reporte:', exportError);
      setError('No se pudo generar el reporte. Intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        aria-label="Formato del reporte"
        value={format}
        onChange={(event) => setFormat(event.target.value as ReportFormat)}
        disabled={isExporting}
        className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="docx">Word (.docx)</option>
        <option value="pdf">PDF (.pdf)</option>
      </select>
      <button
        type="button"
        onClick={handleExport}
        disabled={!items.length || isExporting}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        title={items.length ? `Exportar ${items.length} oportunidades filtradas` : 'No hay oportunidades para exportar'}
      >
        {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span>Exportar Reporte</span>
      </button>
      {error && <span role="alert" className="w-full text-xs text-rose-700">{error}</span>}
    </div>
  );
};
