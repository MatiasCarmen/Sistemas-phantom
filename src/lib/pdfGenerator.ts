import { jsPDF } from 'jspdf';
import { Quote, Sale, CompanySettings } from '../types';
import { formatAmount } from './formatters';

export function generateQuotePDF(quote: Quote, settings: CompanySettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header / Brand
  doc.setFillColor(37, 99, 235); // Blue #2563eb
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Company Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.companyName, 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  y += 5;
  doc.text(`RUC/NIT/Tax ID: ${settings.taxId}`, 14, y);
  y += 4;
  doc.text(`${settings.address}, ${settings.cityCountry}`, 14, y);
  y += 4;
  doc.text(`Tel: ${settings.phone} | Email: ${settings.email}`, 14, y);

  // Quote Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 75, 15, 61, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('COTIZACIÓN COMERCIAL', pageWidth - 70, 22);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`N° ${quote.quoteNumber}`, pageWidth - 70, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${quote.date}`, pageWidth - 70, 34);
  doc.text(`Válido Hasta: ${quote.expiryDate}`, pageWidth - 70, 39);

  // Customer Section
  y = 52;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL CLIENTE / RECEPTOR:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cliente: ${quote.customerName}`, 18, y + 12);
  doc.text(`RUC/Doc: ${quote.customerTaxId || 'N/A'}`, 18, y + 17);
  doc.text(`Email: ${quote.customerEmail || 'N/A'} | Tel: ${quote.customerPhone || 'N/A'}`, 18, y + 22);

  // Items Table Header
  y = 84;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SKU / ÍTEM', 18, y + 5.5);
  doc.text('DESCRIPCIÓN', 45, y + 5.5);
  doc.text('CANT', 115, y + 5.5);
  doc.text('P. UNIT', 135, y + 5.5);
  doc.text('DESC %', 155, y + 5.5);
  doc.text('TOTAL', pageWidth - 20, y + 5.5, { align: 'right' });

  // Items List
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  quote.items.forEach((item, index) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
    }

    doc.text(item.sku, 18, y + 5);
    const splitName = doc.splitTextToSize(item.name, 65);
    doc.text(splitName[0] || item.name, 45, y + 5);
    doc.text(`${item.quantity} ${item.unit || ''}`, 115, y + 5);
    doc.text(`${quote.currency} ${formatAmount(item.unitPrice)}`, 135, y + 5);
    doc.text(`${item.discountPercent > 0 ? item.discountPercent + '%' : '-'}`, 155, y + 5);
    doc.text(`${quote.currency} ${formatAmount(item.total)}`, pageWidth - 20, y + 5, { align: 'right' });

    y += 7;
  });

  // Summary Box
  y += 5;
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  const totalsX = pageWidth - 80;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, y, 66, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', totalsX + 4, y + 7);
  doc.text(`${quote.currency} ${formatAmount(quote.subtotal)}`, pageWidth - 18, y + 7, { align: 'right' });

  doc.text('Descuentos:', totalsX + 4, y + 13);
  doc.text(`-${quote.currency} ${formatAmount(quote.discountTotal)}`, pageWidth - 18, y + 13, { align: 'right' });

  doc.text(`Impuestos (${settings.defaultTaxRate}%):`, totalsX + 4, y + 19);
  doc.text(`${quote.currency} ${formatAmount(quote.taxTotal)}`, pageWidth - 18, y + 19, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 4, y + 22, pageWidth - 18, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('TOTAL:', totalsX + 4, y + 28);
  doc.text(`${quote.currency} ${formatAmount(quote.total)}`, pageWidth - 18, y + 28, { align: 'right' });

  // Notes & Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('CONDICIONES COMERCIALES & FORMA DE PAGO:', 14, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const terms = quote.termsAndConditions || settings.quoteTermsDefault;
  const splitTerms = doc.splitTextToSize(terms, 100);
  doc.text(splitTerms, 14, y + 13);

  if (quote.notes) {
    const notesY = y + 15 + (splitTerms.length * 3.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', 14, notesY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(quote.notes, 100);
    doc.text(splitNotes, 14, notesY + 4);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${settings.companyName} | ${settings.website || settings.email} | Emitido por: ${quote.createdBy}`, pageWidth / 2, footerY, { align: 'center' });

  // Save / Download
  doc.save(`${quote.quoteNumber}_${quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function generateSaleInvoicePDF(sale: Sale, settings: CompanySettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Color Bar
  const isCancelled = sale.status === 'CANCELLED';
  doc.setFillColor(isCancelled ? 220 : 16, isCancelled ? 38 : 185, isCancelled ? 38 : 129); // Red or Emerald
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Company Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.companyName, 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  y += 5;
  doc.text(`RUC/Tax ID: ${settings.taxId}`, 14, y);
  y += 4;
  doc.text(`${settings.address}, ${settings.cityCountry}`, 14, y);
  y += 4;
  doc.text(`Tel: ${settings.phone} | Email: ${settings.email}`, 14, y);

  // Voucher Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 75, 15, 61, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`COMPROBANTE: ${sale.voucherType}`, pageWidth - 70, 22);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`N° ${sale.saleNumber}`, pageWidth - 70, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${sale.date}`, pageWidth - 70, 34);
  doc.text(`Método: ${sale.paymentMethod}`, pageWidth - 70, 39);

  // Cancelled watermark if applicable
  if (isCancelled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(239, 68, 68);
    doc.text('ANULADO', pageWidth / 2, 70, { align: 'center' });
  }

  // Customer Section
  y = 52;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL ADQUIRIENTE / CLIENTE:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nombre/Razón: ${sale.customerName}`, 18, y + 11);
  doc.text(`RUC/DNI: ${sale.customerTaxId || 'N/A'}`, 18, y + 16);
  doc.text(`Atendido por: ${sale.sellerName || 'Cajero'}`, 120, y + 11);
  doc.text(`Estado Pago: ${sale.paymentStatus}`, 120, y + 16);

  // Items Table Header
  y = 80;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SKU', 18, y + 5.5);
  doc.text('DESCRIPCIÓN DEL PRODUCTO', 45, y + 5.5);
  doc.text('CANT', 120, y + 5.5);
  doc.text('P. UNIT', 140, y + 5.5);
  doc.text('TOTAL', pageWidth - 20, y + 5.5, { align: 'right' });

  // Items List
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  sale.items.forEach((item, index) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
    }

    doc.text(item.sku, 18, y + 5);
    const splitName = doc.splitTextToSize(item.name, 70);
    doc.text(splitName[0] || item.name, 45, y + 5);
    doc.text(`${item.quantity}`, 120, y + 5);
    doc.text(`${sale.currency} ${formatAmount(item.unitPrice)}`, 140, y + 5);
    doc.text(`${sale.currency} ${formatAmount(item.total)}`, pageWidth - 20, y + 5, { align: 'right' });

    y += 7;
  });

  // Summary
  y += 6;
  const totalsX = pageWidth - 80;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, y, 66, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', totalsX + 4, y + 7);
  doc.text(`${sale.currency} ${formatAmount(sale.subtotal)}`, pageWidth - 18, y + 7, { align: 'right' });

  doc.text(`Impuesto (${settings.defaultTaxRate}%):`, totalsX + 4, y + 13);
  doc.text(`${sale.currency} ${formatAmount(sale.taxTotal)}`, pageWidth - 18, y + 13, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 4, y + 17, pageWidth - 18, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL A PAGAR:', totalsX + 4, y + 25);
  doc.text(`${sale.currency} ${formatAmount(sale.total)}`, pageWidth - 18, y + 25, { align: 'right' });

  if (sale.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Nota: ${sale.notes}`, 14, y + 10);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${settings.companyName} - Sistema de Gestión Comercial Integrado`, pageWidth / 2, footerY, { align: 'center' });

  doc.save(`${sale.saleNumber}_${sale.voucherType}.pdf`);
}
