import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductOptionsEditor } from './product-options-editor';
import { optionsError, prepareOptions, ProductOptions } from './product-options';

@Component({ standalone: true, imports: [ProductOptionsEditor],
  template: `<app-product-options-editor [variants]="groups()" (variantsChange)="groups.set($event)"
    [basePrice]="1.5" [stockQuantity]="25" [language]="language()" [showErrors]="true" />` })
class OptionsHost {
  groups = signal<ProductOptions>([]);
  language = signal<'ar' | 'en'>('ar');
}

describe('Guided product options', () => {
  let fixture: ComponentFixture<OptionsHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [OptionsHost], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OptionsHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => fixture.destroy());

  async function enter(selector: string, value: string) {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('edits choices directly, previews their full prices, and fills optional translations for saving', async () => {
    fixture.nativeElement.querySelector('[value="options"]').click();
    await fixture.whenStable();
    const preset = Array.from(fixture.nativeElement.querySelectorAll('.preset'))
      .find(button => (button as HTMLElement).textContent?.includes('عدد القطع')) as HTMLButtonElement;
    preset.click();
    await fixture.whenStable();
    await enter('#product-options-choice-0-0', 'عبوة 10 قطع');
    await enter('#product-options-price-0-0', '1.5');
    fixture.nativeElement.querySelector('.add-choice').click();
    await fixture.whenStable();
    await enter('#product-options-choice-0-1', 'عبوة 20 قطعة');
    await enter('#product-options-price-0-1', '2.5');
    expect(optionsError(fixture.componentInstance.groups(), 'ar')).toBeNull();
    expect(prepareOptions(fixture.componentInstance.groups())[0].values).toEqual([
      { value: 'عبوة 10 قطع', valueAr: 'عبوة 10 قطع', price: 1.5 },
      { value: 'عبوة 20 قطعة', valueAr: 'عبوة 20 قطعة', price: 2.5 },
    ]);
    expect(fixture.nativeElement.querySelector('.choices-preview').textContent).toContain('2.500');
    expect(fixture.nativeElement.querySelector('.shared-stock').textContent).toContain('25');
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]').length).toBe(2);
  });

  it('restores entered choices after switching selling modes without saving', async () => {
    fixture.componentInstance.groups.set([{ name: 'Size', nameAr: 'المقاس', values: [{ value: 'Small', valueAr: 'صغير', price: 3.125 }] }]);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[value="fixed"]').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.groups()).toEqual([]);
    fixture.nativeElement.querySelector('[value="options"]').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.groups()[0].values[0].price).toBe(3.125);
  });

  it('updates the chosen group without changing another group or losing existing IDs', async () => {
    fixture.componentInstance.groups.set([
      { id: 11, name: 'Size', nameAr: 'المقاس', values: [{ id: 21, value: 'Small', valueAr: 'صغير', price: 2 }] },
      { id: 12, name: 'Color', nameAr: 'اللون', values: [{ id: 22, value: 'Red', valueAr: 'أحمر', price: 3 }] },
    ]);
    await fixture.whenStable();
    await enter('#product-options-price-0-0', '4.125');
    const prepared = prepareOptions(fixture.componentInstance.groups());
    expect(prepared[0].values[0]).toEqual({ id: 21, value: 'Small', valueAr: 'صغير', price: 4.125 });
    expect(prepared[1].values[0].price).toBe(3);
    expect(prepared[1].id).toBe(12);
  });

  it('explains missing labels, duplicate choices and invalid prices before submission', () => {
    expect(optionsError([{ name: '', nameAr: '', values: [] }], 'ar')).toContain('اسم المواصفة');
    const group = { name: 'Size', nameAr: 'المقاس', values: [
      { value: '', valueAr: 'صغير', price: 2 }, { value: '', valueAr: 'صغير', price: 3 },
    ] };
    expect(optionsError([group], 'ar')).toContain('مكرر');
    group.values = [{ value: '', valueAr: 'صغير', price: 0 }];
    expect(optionsError([group], 'ar')).toContain('سعر بيع');
    group.values[0].price = 1.2345;
    expect(optionsError([group], 'en')).toContain('3 decimal places');
  });

  it('uses English labels and left-to-right layout in English mode', async () => {
    fixture.componentInstance.language.set('en');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.options-editor').dir).toBe('ltr');
    expect(fixture.nativeElement.textContent).toContain('One price');
    expect(fixture.nativeElement.textContent).toContain('All choices share the same stock');
  });
});
