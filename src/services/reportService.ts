import ExcelJS from 'exceljs';
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFichaUrl } from '../lib/openFicha';
import { formatChileDateTime } from '../lib/dateUtils';
import {
  cleanTextPrefixes,
  getItemCodigo,
  getItemEstado,
  getItemFechaCierre,
  getItemMonto,
  getItemNombre,
  getItemOrganismo,
  getItemTipo,
  getItemSearchableText,
  matchKeywords
} from '../lib/searchUtils';

interface ReportRow {
  codigo: string;
  nombre: string;
  organismo: string;
  tipo: string;
  montoClp: number;
  montoUtm: number | null;
  estado: string;
  fechaCierre: string;
  score: number;
  keywords: string[];
  fichaUrl: string;
}

const BLUE = '1F497D';
const BLUE_RGB: [number, number, number] = [31, 73, 125];

function buildRows(items: any[]): ReportRow[] {
  return items.map((item) => {
    const keywords = matchKeywords(getItemSearchableText(item));
    const rawUtm = item?.montoUTM ?? item?.MontoUTM ?? item?.monto_estimado_utm ?? item?.MontoEstimadoUTM;
    const parsedUtm = rawUtm === undefined || rawUtm === null || rawUtm === '' ? null : Number(rawUtm);

    return {
      codigo: getItemCodigo(item) || 'Sin código',
      nombre: cleanTextPrefixes(getItemNombre(item) || 'Sin título'),
      organismo: getItemOrganismo(item) || 'Sin organismo',
      tipo: getItemTipo(item) || 'Licitación',
      montoClp: getItemMonto(item),
      montoUtm: parsedUtm !== null && Number.isFinite(parsedUtm) ? parsedUtm : null,
      estado: getItemEstado(item) || 'Publicada',
      fechaCierre: formatChileDateTime(getItemFechaCierre(item)),
      score: Number.isFinite(Number(item?.matchScore)) ? Number(item.matchScore) : keywords.score,
      keywords: Array.from(new Set(keywords.matches.map((match) => match.term))),
      fichaUrl: getFichaUrl(item)
    };
  });
}

function formatClp(value: number): string {
  return value > 0 ? `$${value.toLocaleString('es-CL')}` : 'No informado';
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function getFilenameBase(): string {
  return `Radar_Mercado_Publico_${new Date().toISOString().slice(0, 10)}`;
}

export async function exportOpportunitiesToExcel(items: any[]): Promise<void> {
  const rows = buildRows(items);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Radar de Licitaciones Mercado Público';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Oportunidades', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  sheet.columns = [
    { header: 'Código', key: 'codigo', width: 23 },
    { header: 'Nombre Licitación', key: 'nombre', width: 48 },
    { header: 'Organismo', key: 'organismo', width: 38 },
    { header: 'Monto Estimado CLP', key: 'montoClp', width: 22 },
    { header: 'Monto Estimado UTM', key: 'montoUtm', width: 20 },
    { header: 'Estado', key: 'estado', width: 20 },
    { header: 'Fecha Cierre', key: 'fechaCierre', width: 24 },
    { header: 'Score Coincidencia', key: 'score', width: 20 },
    { header: 'Palabras Clave', key: 'keywords', width: 42 },
    { header: 'Ficha Oficial', key: 'fichaUrl', width: 24 }
  ];

  sheet.getRow(1).height = 30;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BLUE}` } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.autoFilter = { from: 'A1', to: 'J1' };

  rows.forEach((row) => {
    const excelRow = sheet.addRow({
      codigo: row.codigo,
      nombre: row.nombre,
      organismo: row.organismo,
      montoClp: row.montoClp || null,
      montoUtm: row.montoUtm,
      estado: row.estado,
      fechaCierre: row.fechaCierre,
      score: row.score,
      keywords: row.keywords.join(', '),
      fichaUrl: row.fichaUrl ? { text: 'Abrir Ficha', hyperlink: row.fichaUrl } : 'No disponible'
    });
    excelRow.alignment = { vertical: 'top', wrapText: true };
    excelRow.getCell('montoClp').numFmt = '"$"#,##0';
    excelRow.getCell('montoUtm').numFmt = '#,##0.00';
    excelRow.getCell('score').numFmt = '0"/100"';
    excelRow.getCell('fichaUrl').font = { color: { argb: 'FF0563C1' }, underline: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${getFilenameBase()}.xlsx`
  );
}

function wordCell(text: string, header = false): TableCell {
  return new TableCell({
    width: { size: header ? 20 : 20, type: WidthType.PERCENTAGE },
    shading: header ? { fill: BLUE, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: header, color: header ? 'FFFFFF' : '1F2937', size: 18 })]
    })]
  });
}

export async function exportOpportunitiesToWord(items: any[]): Promise<void> {
  const rows = buildRows(items);
  const summaryRows = [
    new TableRow({
      tableHeader: true,
      children: ['Código', 'Licitación', 'Organismo', 'Estado', 'Score'].map((cell) => wordCell(cell, true))
    }),
    ...rows.map((row) => new TableRow({
      cantSplit: true,
      children: [row.codigo, row.nombre, row.organismo, row.estado, `${row.score}/100`].map((cell) => wordCell(cell))
    }))
  ];

  const detailParagraphs = rows.flatMap((row) => [
    new Paragraph({ text: row.nombre, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'Código: ', bold: true }), new TextRun(row.codigo)] }),
    new Paragraph({ children: [new TextRun({ text: 'Organismo: ', bold: true }), new TextRun(row.organismo)] }),
    new Paragraph({ children: [new TextRun({ text: 'Estado: ', bold: true }), new TextRun(row.estado)] }),
    new Paragraph({ children: [new TextRun({ text: 'Monto estimado CLP: ', bold: true }), new TextRun(formatClp(row.montoClp))] }),
    new Paragraph({ children: [new TextRun({ text: 'Monto estimado UTM: ', bold: true }), new TextRun(row.montoUtm === null ? 'No informado' : row.montoUtm.toLocaleString('es-CL'))] }),
    new Paragraph({ children: [new TextRun({ text: 'Cierre: ', bold: true }), new TextRun(row.fechaCierre)] }),
    new Paragraph({ children: [new TextRun({ text: 'Score de coincidencia: ', bold: true }), new TextRun(`${row.score}/100`)] }),
    new Paragraph({ children: [new TextRun({ text: 'Palabras clave detectadas: ', bold: true }), new TextRun(row.keywords.length ? row.keywords.join(', ') : 'Sin coincidencias')] }),
    new Paragraph({ children: [new TextRun({ text: 'Ficha oficial: ', bold: true }), ...(row.fichaUrl
      ? [new ExternalHyperlink({ link: row.fichaUrl, children: [new TextRun({ text: 'Abrir Ficha', style: 'Hyperlink' })] })]
      : [new TextRun('No disponible')])] })
  ]);

  const document = new Document({
    creator: 'Radar de Licitaciones Mercado Público',
    title: 'Informe Ejecutivo de Oportunidades',
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'RADAR DE LICITACIONES', bold: true, color: BLUE, size: 30 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: `Informe ejecutivo | ${new Date().toLocaleDateString('es-CL')} | ${rows.length} oportunidades`, color: '475569', size: 20 })]
        }),
        new Paragraph({ text: 'Resumen de oportunidades', heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: summaryRows
        }),
        new Paragraph({ text: 'Detalle ejecutivo', heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } }),
        ...detailParagraphs
      ]
    }]
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${getFilenameBase()}.docx`);
}

export function exportOpportunitiesToPdf(items: any[]): void {
  const rows = buildRows(items);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BLUE_RGB);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RADAR DE LICITACIONES | INFORME EJECUTIVO', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${new Date().toLocaleDateString('es-CL')} | ${rows.length} oportunidades`, 14, 19);

  const totalClp = rows.reduce((total, row) => total + row.montoClp, 0);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Monto estimado CLP informado: ${formatClp(totalClp)}`, 14, 33);
  doc.setFont('helvetica', 'normal');
  doc.text('Montos UTM se muestran solo cuando fueron informados por la fuente.', 14, 39);

  autoTable(doc, {
    startY: 45,
    head: [['Código', 'Nombre Licitación', 'Organismo', 'Monto CLP', 'Monto UTM', 'Estado', 'Fecha Cierre', 'Score', 'Palabras clave', 'Ficha']],
    body: rows.map((row) => [
      row.codigo,
      row.nombre,
      row.organismo,
      formatClp(row.montoClp),
      row.montoUtm === null ? 'No informado' : row.montoUtm.toLocaleString('es-CL'),
      row.estado,
      row.fechaCierre,
      `${row.score}/100`,
      row.keywords.join(', ') || '—',
      row.fichaUrl ? 'Abrir Ficha' : 'No disponible'
    ]),
    theme: 'grid',
    headStyles: { fillColor: BLUE_RGB, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 46 },
      2: { cellWidth: 37 },
      3: { cellWidth: 23 },
      4: { cellWidth: 19 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 15 },
      8: { cellWidth: 37 },
      9: { cellWidth: 20, textColor: [5, 99, 193] }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const fichaUrl = rows[data.row.index]?.fichaUrl;
        if (fichaUrl) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: fichaUrl });
      }
    },
    margin: { left: 10, right: 10, top: 45, bottom: 15 }
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Radar Mercado Público | Página ${page} de ${pageCount}`, 10, 202);
  }

  doc.save(`${getFilenameBase()}.pdf`);
}
