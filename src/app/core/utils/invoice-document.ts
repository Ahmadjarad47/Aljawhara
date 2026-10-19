/** Shared invoice layout for customer and admin downloads. All dimensions are A4 at 96 dpi. */
export interface InvoiceDocumentData {
  orderNumber: string;
  orderCreatedAt: string;
  status: number | string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  couponCode?: string | null;
  couponDiscountAmount?: number | null;
  items: { name: string; price: number; quantity: number; total: number }[];
  shippingAddress: {
    fullName: string; phone: string; street: string;
    city?: string | null; state?: string | null; country?: string | null; postalCode?: string | null;
    alQataa?: string; alSharee?: string; alJada?: string;
    alManzil?: string; alDor?: string; alShakka?: string;
  };
}

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

const money = (amount: number): string => `<span class="money" dir="ltr">${
  new Intl.NumberFormat('en-KW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(amount)
} <small>KWD</small></span>`;

function orderStatus(value: number | string): { text: string; tone: string } {
  const statuses = [
    ['Pending', 'قيد الانتظار', 'amber'], ['Processing', 'قيد المعالجة', 'blue'],
    ['Shipped', 'تم الشحن', 'blue'], ['Delivered', 'تم التسليم', 'green'],
    ['Cancelled', 'ملغي', 'red'], ['Refunded', 'تم الاسترداد', 'neutral'],
    ['Expired', 'منتهي الصلاحية', 'red'], ['RequiresReconciliation', 'بانتظار مراجعة الدفع', 'amber'],
  ];
  const normalized = String(value).trim().toLowerCase();
  const found = statuses.find((status, index) => status[0].toLowerCase() === normalized || String(index) === normalized);
  return { text: found?.[1] ?? 'حالة غير معروفة', tone: found?.[2] ?? 'neutral' };
}

export function createInvoiceHTML(invoice: InvoiceDocumentData, logoUrl: string): string {
  const address = invoice.shippingAddress;
  const status = orderStatus(invoice.status);
  const date = new Date(invoice.orderCreatedAt);
  const formattedDate = Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('ar-KW', {
    calendar: 'gregory', numberingSystem: 'latn', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
  const line = (label: string, value: unknown, ltr = false) => value
    ? `<div class="detail"><span>${label}</span><b ${ltr ? 'class="ltr" dir="ltr"' : ''}>${escapeHtml(value)}</b></div>` : '';
  const location = [address.state, address.city, address.country].filter(Boolean).join('، ');
  const building = [
    address.alQataa && `قطعة ${address.alQataa}`, address.alJada && `جادة ${address.alJada}`,
    address.alManzil && `منزل ${address.alManzil}`, address.alDor && `دور ${address.alDor}`,
    address.alShakka && `شقة ${address.alShakka}`,
  ].filter(Boolean).join(' · ');
  const streets = [...new Set([address.street, address.alSharee].filter(Boolean))].join('، ');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <title>فاتورة ${escapeHtml(invoice.orderNumber)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { padding: 0; margin: 0; background: #fff; }
      body { color: #243b38; font: 13px/1.85 Tahoma, Arial, sans-serif; direction: rtl; }
      .invoice-page { width: 794px; height: 1123px; padding: 38px 44px 25px; background: #fff;
        display: flex; flex-direction: column; position: relative; page-break-after: always; }
      .invoice-page::before { content: ''; position: absolute; top: 0; right: 44px; left: 44px;
        height: 6px; background: #084c42; border-radius: 0 0 4px 4px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .brand { display: flex; gap: 14px; align-items: center; }
      .logo { width: 76px; height: 76px; object-fit: contain; }
      .brand-name { font-size: 25px; font-weight: bold; color: #084c42; }
      .brand-en { font: 10px/1.8 Arial, sans-serif; letter-spacing: 2.5px; color: #778783; }
      .document-title { text-align: left; }
      h1 { font-size: 30px; line-height: 1.5; margin: 0; color: #084c42; }
      .eyebrow { font: 10px/1.8 Arial, sans-serif; letter-spacing: 3px; color: #a27b3f; }
      .meta { display: flex; gap: 16px; background: #f2f7f5; border: 1px solid #e0eae5;
        border-radius: 10px; padding: 15px 18px; margin-bottom: 24px; }
      .meta-cell { flex: 1; min-width: 0; }
      .meta-cell:first-child { flex: 1.25; }
      .label { font-size: 10px; color: #6b7e78; margin-bottom: 4px; }
      .meta-value { font-weight: bold; font-size: 12px; }
      .reference { font: bold 13px/1.9 Arial, sans-serif; text-align: right; }
      .badge { display: inline-block; padding: 2px 10px 4px; border-radius: 5px;
        font-size: 10px; font-weight: bold; line-height: 1.9; }
      .green { background: #dceee4; color: #176044; } .blue { background: #e2edf7; color: #275b85; }
      .red { background: #f9e8e6; color: #a83e36; } .amber { background: #fbefdb; color: #8b641f; }
      .neutral { background: #e7eae9; color: #51615c; }
      .page-body { flex: 1; min-height: 0; }
      .parties { display: flex; gap: 20px; margin-bottom: 24px; }
      .party { flex: 1; min-width: 0; border: 1px solid #e0e8e4; border-radius: 10px; padding: 15px 17px; }
      h2 { font-size: 12px; line-height: 1.8; margin: 0 0 12px; color: #084c42; }
      .party h2 { border-bottom: 1px solid #e8eeeb; padding-bottom: 8px; }
      .name { font-size: 13px; font-weight: bold; margin-bottom: 6px; overflow-wrap: anywhere; }
      .detail { display: flex; gap: 10px; font-size: 11px; margin-top: 3px; }
      .detail > span { flex: 0 0 auto; color: #7b8883; }
      .detail > b { font-weight: normal; overflow-wrap: anywhere; min-width: 0; }
      .address-line { font-size: 11px; margin-top: 4px; overflow-wrap: anywhere; }
      .ltr, .money { direction: ltr; unicode-bidi: isolate; display: inline-block; }
      .money { white-space: nowrap; font-family: Arial, sans-serif; font-size: 12px; }
      .money small { color: #7a8883; font-size: 9px; margin-left: 3px; }
      .items-section { margin-bottom: 22px; }
      .items-heading { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
      .items-heading h2 { margin: 0; font-size: 14px; }
      .item-count { font-size: 10px; color: #7b8883; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      thead { background: #084c42; color: #fff; }
      th { text-align: right; font-size: 10px; font-weight: normal; padding: 10px 12px; }
      th:first-child { border-radius: 0 6px 0 0; } th:last-child { border-radius: 6px 0 0 0; }
      td { padding: 13px 12px; border-bottom: 1px solid #e4ebe7; font-size: 12px; vertical-align: top; overflow-wrap: anywhere; }
      tbody tr:nth-child(even) { background: #f7f9f8; }
      .index { color: #8b9b94; text-align: center; font: 11px/1.9 Arial, sans-serif; }
      .quantity { text-align: center; font: 12px/1.9 Arial, sans-serif; }
      .line-total { font-weight: bold; }
      .closing { display: flex; align-items: flex-start; gap: 28px; margin-top: 5px; }
      .closing-note { flex: 1; padding-top: 18px; font-size: 11px; color: #76867e; }
      .closing-note strong { display: block; color: #084c42; font-size: 13px; margin-bottom: 6px; }
      .summary { width: 310px; flex: 0 0 310px; background: #f4f7f5; border-radius: 10px; padding: 13px 18px 0; }
      .summary-row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; padding: 5px 0; font-size: 11px; }
      .discount { color: #24734b; }
      .summary-total { display: flex; align-items: center; justify-content: space-between; gap: 10px;
        margin: 12px -18px 0; padding: 14px 18px; border-radius: 0 0 10px 10px; background: #084c42; color: #fff; }
      .summary-total > span:first-child { font-size: 12px; font-weight: bold; }
      .summary-total .money { font-size: 21px; font-weight: bold; }
      .summary-total small { color: #d6e7df; font-size: 10px; }
      .footer { border-top: 1px solid #dce6df; padding-top: 14px; margin-top: 24px;
        display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #819087; }
      .footer-brand { color: #426054; } .page-number { font-family: Arial, Tahoma, sans-serif; }
      @page { size: A4; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-page:last-child { page-break-after: auto; } }
    </style></head><body>
    <template id="page-template"><article class="invoice-page">
      <header class="header"><div class="brand"><img class="logo" src="${escapeHtml(logoUrl)}" alt="">
        <div><div class="brand-name">الجوهرة</div><div class="brand-en" dir="ltr">ALJAWHARA</div></div></div>
        <div class="document-title"><div class="eyebrow">INVOICE</div><h1>فاتورة</h1></div></header>
      <div class="meta"><div class="meta-cell"><div class="label">رقم الفاتورة / الطلب</div>
        <div class="meta-value reference" dir="ltr">${escapeHtml(invoice.orderNumber)}</div></div>
        <div class="meta-cell"><div class="label">تاريخ الطلب</div><div class="meta-value">${escapeHtml(formattedDate)}</div></div>
        <div class="meta-cell"><div class="label">حالة الطلب</div><span class="badge ${status.tone}">${status.text}</span></div></div>
      <main class="page-body"></main>
      <footer class="footer"><span class="footer-brand">الجوهرة <span dir="ltr">/ ALJAWHARA</span></span>
        <span class="page-number"></span></footer>
    </article></template>
    <template id="parties-template"><section class="parties">
      <div class="party"><h2>بيانات العميل</h2><div class="name">${escapeHtml(invoice.customerName)}</div>
        ${line('الهاتف', invoice.customerPhone || address.phone, true)}
        ${line('البريد الإلكتروني', invoice.customerEmail, true)}</div>
      <div class="party"><h2>عنوان التوصيل</h2><div class="name">${escapeHtml(address.fullName)}</div>
        <div class="address-line">${escapeHtml(location)}</div>
        ${streets ? `<div class="address-line">${escapeHtml(streets)}</div>` : ''}
        ${building ? `<div class="address-line">${escapeHtml(building)}</div>` : ''}
        ${line('الهاتف', address.phone, true)}${line('الرمز البريدي', address.postalCode, true)}</div>
    </section></template>
    <template id="table-template"><section class="items-section"><div class="items-heading"><h2>تفاصيل المنتجات</h2>
      <span class="item-count">عدد المنتجات: ${invoice.items.length}</span></div><table>
      <colgroup><col style="width:6%"><col style="width:38%"><col style="width:21%"><col style="width:12%"><col style="width:23%"></colgroup>
      <thead><tr><th>#</th><th>المنتج</th><th>سعر الوحدة</th><th style="text-align:center">الكمية</th><th>الإجمالي</th></tr></thead>
      <tbody></tbody></table></section></template>
    <template id="rows-template"><table><tbody>${invoice.items.map((item, index) => `<tr>
      <td class="index">${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${money(item.price)}</td>
      <td class="quantity">${escapeHtml(item.quantity)}</td><td class="line-total">${money(item.total)}</td>
    </tr>`).join('')}</tbody></table></template>
    <template id="closing-template"><section class="closing"><div class="closing-note">
      <strong>شكراً لاختيارك الجوهرة</strong>يسعدنا أن نكون جزءاً من اختياراتك.<br>
      <span dir="ltr">Thank you for choosing Aljawhara.</span></div><div class="summary">
      <div class="summary-row"><span>المجموع الفرعي</span>${money(invoice.subtotal)}</div>
      ${invoice.couponDiscountAmount && invoice.couponDiscountAmount > 0 ? `<div class="summary-row discount">
        <span>الخصم${invoice.couponCode ? ` (${escapeHtml(invoice.couponCode)})` : ''}</span>${money(-invoice.couponDiscountAmount)}</div>` : ''}
      <div class="summary-row"><span>الشحن</span>${money(invoice.shipping)}</div>
      <div class="summary-row"><span>الضريبة</span>${money(invoice.tax)}</div>
      <div class="summary-total"><span>الإجمالي</span>${money(invoice.total)}</div>
    </div></section></template>
    </body></html>`;
}

/** Measure the actual rendered content; never cut a row or the totals across A4 pages. */
export function paginateInvoice(doc: Document): HTMLElement[] {
  const clone = (id: string): HTMLElement => {
    const template = doc.getElementById(id) as HTMLTemplateElement;
    return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  };
  const pages: HTMLElement[] = [];
  const addPage = () => {
    const page = clone('page-template');
    doc.body.appendChild(page);
    pages.push(page);
    return page.querySelector<HTMLElement>('.page-body')!;
  };
  const fits = (body: HTMLElement) => body.scrollHeight <= body.clientHeight + 1;
  let body = addPage();
  body.appendChild(clone('parties-template'));
  let section = clone('table-template');
  body.appendChild(section);
  let tbody = section.querySelector('tbody')!;
  const source = doc.getElementById('rows-template') as HTMLTemplateElement;
  const rows = Array.from(source.content.querySelectorAll('tr'));
  for (const row of rows) {
    tbody.appendChild(row);
    if (!fits(body)) {
      row.remove();
      if (!tbody.rows.length) section.remove();
      body = addPage();
      section = clone('table-template');
      body.appendChild(section);
      tbody = section.querySelector('tbody')!;
      tbody.appendChild(row);
      if (!fits(body)) throw new Error('Invoice row exceeds the printable page height');
    }
  }
  const closing = clone('closing-template');
  body.appendChild(closing);
  if (!fits(body)) {
    closing.remove();
    // Carry the last product with the totals so the final page is not an isolated summary.
    const lastRow = tbody.lastElementChild;
    body = addPage();
    const lastSection = clone('table-template');
    if (lastRow) {
      body.appendChild(lastSection);
      lastSection.querySelector('tbody')!.appendChild(lastRow);
    }
    body.appendChild(closing);
    if (!fits(body) && lastRow) {
      tbody.appendChild(lastRow);
      lastSection.remove();
    } else if (!tbody.rows.length) {
      section.remove();
    }
  }
  if (!fits(body)) throw new Error('Invoice summary exceeds the printable page height');
  pages.forEach((page, index) => {
    page.querySelector('.page-number')!.textContent = `صفحة ${index + 1} من ${pages.length}`;
  });
  return pages;
}
