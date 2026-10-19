import { createInvoiceHTML, InvoiceDocumentData, paginateInvoice } from './invoice-document';

/** Render complete A4 pages individually so totals and product rows are never sliced. */
export async function createInvoicePDF(invoice: InvoiceDocumentData) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'), import('jspdf'),
  ]);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
  try {
    const loaded = new Promise<void>(resolve => frame.onload = () => resolve());
    frame.srcdoc = createInvoiceHTML(invoice, new URL('logo.png', document.baseURI).href);
    document.body.appendChild(frame);
    await loaded;
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Invoice document unavailable');
    await doc.fonts.ready;
    const pages = paginateInvoice(doc);
    await Promise.all(Array.from(doc.images).map(image => image.decode().catch(() => undefined)));
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title: `فاتورة ${invoice.orderNumber}`, author: 'Aljawhara', subject: 'Order invoice' });
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff',
        width: 794, height: 1123, windowWidth: 794, windowHeight: 1123,
      });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      canvas.width = canvas.height = 0;
    }
    return pdf;
  } finally {
    frame.remove();
  }
}

export async function downloadInvoicePDF(invoice: InvoiceDocumentData): Promise<void> {
  const pdf = await createInvoicePDF(invoice);
  const reference = invoice.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`Invoice_${reference}.pdf`);
}
