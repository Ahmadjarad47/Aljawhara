import { createInvoiceHTML, InvoiceDocumentData, paginateInvoice } from './invoice-document';

describe('Arabic invoice page layout', () => {
  let frame: HTMLIFrameElement;
  const invoice: InvoiceDocumentData = {
    orderNumber: 'ORD-20261019-0001', orderCreatedAt: '2026-10-19T14:53:10', status: 6,
    customerName: 'Customer', customerEmail: 'customer@example.com',
    subtotal: 638.802, shipping: 0, tax: 0, total: 638.802,
    shippingAddress: {
      fullName: 'أحمد جرار', phone: '7891162781', state: 'محافظة العاصمة', city: 'الفيحاء',
      street: 'محافظة العاصمة - الفيحاء', alQataa: '8', alManzil: '16', alDor: '2', alShakka: '5',
    },
    items: [
      { name: 'منتج هواتف ذكية 1', quantity: 1, price: 284.133, total: 284.133 },
      { name: 'منتج هواتف ذكية 3', quantity: 1, price: 354.669, total: 354.669 },
    ],
  };

  async function render(data = invoice): Promise<Document> {
    frame = document.createElement('iframe');
    frame.style.cssText = 'width:794px;height:1123px;position:absolute;left:-10000px;border:0;';
    const loaded = new Promise<void>(resolve => frame.onload = () => resolve());
    frame.srcdoc = createInvoiceHTML(data, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    document.body.appendChild(frame);
    await loaded;
    await frame.contentDocument!.fonts.ready;
    return frame.contentDocument!;
  }
  afterEach(() => frame?.remove());

  it('fits a complete two-item invoice and its totals on one A4 page', async () => {
    const doc = await render();
    const pages = paginateInvoice(doc);
    expect(pages.length).toBe(1);
    expect(doc.querySelectorAll('.items-section tbody tr').length).toBe(2);
    expect(doc.querySelector('.summary-total')!.textContent).toContain('638.802');
    expect(doc.querySelector('.badge')!.textContent).toBe('منتهي الصلاحية');
    expect(doc.querySelector('.meta')!.textContent).toContain('2026');
    expect(doc.querySelector('.page-number')!.textContent).toBe('صفحة 1 من 1');
  });

  it('paginates many long product names with repeated headings and intact totals', async () => {
    const items = Array.from({ length: 45 }, (_, index) => ({
      name: `منتج ${index + 1} ${'وصف طويل للمنتج باللغة العربية '.repeat(4)}`,
      price: 10, quantity: 1, total: 10,
    }));
    const doc = await render({ ...invoice, items, couponCode: 'SAVE10', couponDiscountAmount: 10 });
    const pages = paginateInvoice(doc);
    expect(pages.length).toBeGreaterThan(1);
    expect(doc.querySelectorAll('.items-section tbody tr').length).toBe(45);
    expect(doc.querySelectorAll('.summary-total').length).toBe(1);
    expect(doc.querySelector('.discount')!.textContent).toContain('SAVE10');
    expect(pages[pages.length - 1].querySelector('.items-section tbody tr')).not.toBeNull();
    for (const page of pages) {
      const body = page.querySelector<HTMLElement>('.page-body')!;
      expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight + 1);
      expect(page.querySelector('.header')).not.toBeNull();
      expect(page.querySelector('.page-number')!.textContent).toContain(`من ${pages.length}`);
    }
  });

  it('escapes customer content and skips missing address fields', async () => {
    const doc = await render({ ...invoice, customerName: '<img src=x onerror=alert(1)>',
      customerEmail: undefined, shippingAddress: { fullName: 'عميل', phone: '', street: '' } });
    paginateInvoice(doc);
    expect(doc.querySelector('.name')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(doc.querySelector('.party img')).toBeNull();
    expect(doc.body.textContent).not.toContain('undefined');
    expect(doc.body.textContent).not.toContain('null');
  });
});
