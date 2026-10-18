import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddressAutocompleteComponent } from './address-autocomplete';

describe('Address search dropdown', () => {
  let fixture: ComponentFixture<AddressAutocompleteComponent>;
  let input: HTMLInputElement;
  let change: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(AddressAutocompleteComponent);
    fixture.componentRef.setInput('fieldId', 'test-address');
    change = jasmine.createSpy('locationChange');
    fixture.componentInstance.locationChange.subscribe(change);
    fixture.detectChanges();
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  });

  async function search(value: string): Promise<void> {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('opens on focus and shows the governorate and its area in each row', async () => {
    input.focus();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const option = fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement;
    expect(option.textContent).toContain('محافظة العاصمة');
    expect(option.textContent).toContain('مدينة الكويت');
  });

  it('searches both governorate and area while ignoring Arabic marks and alef variations', async () => {
    await search('الاحمدي خِيران');
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('محافظة الأحمدي');
    expect(options[0].textContent).toContain('الخيران');
  });

  it('selects with the keyboard without submitting its enclosing form', async () => {
    await search('السالمية');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('test-address-option-0');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBeTrue();
    expect(change).toHaveBeenCalledWith({ addressLine1: 'محافظة حولي — السالمية', city: 'السالمية', state: 'محافظة حولي' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('selects with a pointer and closes the results', async () => {
    await search('المطلاع');
    (fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledWith({ addressLine1: 'محافظة الجهراء — المطلاع', city: 'المطلاع', state: 'محافظة الجهراء' });
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('keeps existing free-text addresses and clears stale geography only when edited', async () => {
    fixture.componentRef.setInput('value', 'Street 45, Building 23');
    await fixture.whenStable();
    expect(input.value).toBe('Street 45, Building 23');
    input.focus();
    await fixture.whenStable();
    expect(change).not.toHaveBeenCalled();
    await search('عنوان مختلف');
    expect(change).toHaveBeenCalledWith({ addressLine1: 'عنوان مختلف', city: null, state: null });
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('لا توجد نتائج');
  });

  it('closes on Escape and blur without changing the address', async () => {
    input.focus();
    await fixture.whenStable();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.isOpen()).toBeFalse();
    input.blur();
    input.focus();
    await fixture.whenStable();
    input.blur();
    await fixture.whenStable();
    expect(fixture.componentInstance.isOpen()).toBeFalse();
    expect(change).not.toHaveBeenCalled();
  });
});
