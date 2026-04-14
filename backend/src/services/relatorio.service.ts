import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Column {
  header: string;
  key: string;
  width?: number;
  style?: Partial<ExcelJS.Style>;
  format?: 'currency' | 'date' | 'percent' | 'text';
}

interface ReportConfig {
  titulo: string;
  subtitulo?: string;
  empresa?: string;
  periodo?: string;
  columns: Column[];
  data: Record<string, unknown>[];
  totals?: Record<string, number>;
}

export class RelatorioService {
  static async exportExcel(res: Response, config: ReportConfig): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SisFin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(config.titulo.substring(0, 31));

    // Header
    sheet.mergeCells(1, 1, 1, config.columns.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = config.titulo;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    if (config.subtitulo) {
      sheet.mergeCells(2, 1, 2, config.columns.length);
      const subCell = sheet.getCell('A2');
      subCell.value = config.subtitulo;
      subCell.font = { size: 12, italic: true };
      subCell.alignment = { horizontal: 'center' };
    }

    const headerRow = config.subtitulo ? 4 : 3;

    if (config.empresa) {
      sheet.mergeCells(headerRow - 1, 1, headerRow - 1, config.columns.length);
      const empCell = sheet.getCell(`A${headerRow - 1}`);
      empCell.value = `Empresa: ${config.empresa} | ${config.periodo || ''}`;
      empCell.font = { size: 10 };
    }

    // Column headers
    const cols = config.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));
    sheet.columns = cols;

    const headerRowObj = sheet.getRow(headerRow);
    config.columns.forEach((col, idx) => {
      const cell = headerRowObj.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A1D21' },
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin' },
      };
    });

    // Data rows
    config.data.forEach((row) => {
      const dataRow = sheet.addRow(row);
      config.columns.forEach((col, idx) => {
        const cell = dataRow.getCell(idx + 1);
        if (col.format === 'currency') {
          cell.numFmt = 'R$ #,##0.00';
        } else if (col.format === 'date' && cell.value instanceof Date) {
          cell.numFmt = 'DD/MM/YYYY';
        } else if (col.format === 'percent') {
          cell.numFmt = '0.00%';
        }
      });
    });

    // Totals row
    if (config.totals) {
      const totalRow = sheet.addRow({});
      totalRow.font = { bold: true };
      totalRow.getCell(1).value = 'TOTAL';
      config.columns.forEach((col, idx) => {
        if (config.totals![col.key] !== undefined) {
          const cell = totalRow.getCell(idx + 1);
          cell.value = config.totals![col.key];
          if (col.format === 'currency') {
            cell.numFmt = 'R$ #,##0.00';
          }
        }
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${config.titulo}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  static async exportPDF(res: Response, config: ReportConfig): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${config.titulo}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text(config.titulo, { align: 'center' });
    doc.moveDown(0.3);

    if (config.subtitulo) {
      doc.fontSize(12).font('Helvetica').text(config.subtitulo, { align: 'center' });
      doc.moveDown(0.3);
    }

    if (config.empresa) {
      doc.fontSize(10).text(`Empresa: ${config.empresa}`, { align: 'left' });
    }
    if (config.periodo) {
      doc.fontSize(10).text(`Período: ${config.periodo}`, { align: 'left' });
    }

    doc.fontSize(8).text(
      `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      { align: 'right' }
    );

    doc.moveDown(1);

    // Table
    const startX = 40;
    const colWidths = config.columns.map((col) => (col.width || 15) * 5);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, (doc.page.width - 80) / totalWidth);
    const scaledWidths = colWidths.map((w) => w * scale);
    let y = doc.y;

    // Header
    doc.font('Helvetica-Bold').fontSize(8);
    let x = startX;
    config.columns.forEach((col, idx) => {
      doc.text(col.header, x, y, { width: scaledWidths[idx], align: 'center' });
      x += scaledWidths[idx];
    });
    y += 18;
    doc.moveTo(startX, y).lineTo(startX + scaledWidths.reduce((a, b) => a + b, 0), y).stroke();
    y += 5;

    // Data
    doc.font('Helvetica').fontSize(7);
    for (const row of config.data) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      x = startX;
      config.columns.forEach((col, idx) => {
        let value = String(row[col.key] ?? '');
        if (col.format === 'currency' && row[col.key] != null) {
          value = `R$ ${Number(row[col.key]).toFixed(2)}`;
        }
        doc.text(value, x, y, { width: scaledWidths[idx], align: col.format === 'currency' ? 'right' : 'left' });
        x += scaledWidths[idx];
      });
      y += 14;
    }

    // Totals
    if (config.totals) {
      y += 5;
      doc.moveTo(startX, y).lineTo(startX + scaledWidths.reduce((a, b) => a + b, 0), y).stroke();
      y += 5;
      doc.font('Helvetica-Bold');
      x = startX;
      config.columns.forEach((col, idx) => {
        if (idx === 0) {
          doc.text('TOTAL', x, y, { width: scaledWidths[idx] });
        } else if (config.totals![col.key] !== undefined) {
          const val = col.format === 'currency'
            ? `R$ ${config.totals![col.key].toFixed(2)}`
            : String(config.totals![col.key]);
          doc.text(val, x, y, { width: scaledWidths[idx], align: 'right' });
        }
        x += scaledWidths[idx];
      });
    }

    doc.end();
  }
}
