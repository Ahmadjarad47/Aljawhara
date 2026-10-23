import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneInputComponent } from './phone-input';

describe('Searchable phone country selector', () => {
  let fixture: ComponentFixture<PhoneInputComponent>;
  let input: HTMLInputElement;
  let countryChange: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(PhoneInputComponent);
    fixture.componentRef.setInput('fieldId', 'test-phone');
    countryChange = jasmine.createSpy('countryChange');
    fixture.componentInstance.countryChange.subscribe(countryChange);
    fixture.detectChanges();
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('[role="combobox"]');
  });

  async function search(query: string): Promise<void> {
    input.focus();
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('finds countries by Arabic, English, ISO code and Arabic calling-code digits', async () => {
    for (const query of ['أَلْمَانِيَا', 'Germany', 'de', '+٤٩']) {
      await search(query);
      expect(fixture.nativeElement.querySelector('[role="listbox"]').textContent).toContain('ألمانيا');
    }
    expect(countryChange).not.toHaveBeenCalled();
  });

  it('selects a filtered country by keyboard without submitting the checkout', async () => {
    await search('Germany');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('test-phone-country-option-0');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBeTrue();
    expect(countryChange).toHaveBeenCalledOnceWith('DE');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    fixture.componentRef.setInput('country', 'DE');
    await fixture.whenStable();
    expect(input.value).toContain('+49');
  });

  it('selects by pointer and shows an empty state without changing the selected country', async () => {
    await search('سوريا');
    (fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(countryChange).toHaveBeenCalledOnceWith('SY');
    countryChange.calls.reset();
    await search('no-such-country');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('لا توجد دول');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBeTrue();
    expect(countryChange).not.toHaveBeenCalled();
  });

  it('restores the selected country after Escape or blur and clears the next search', async () => {
    await search('Germany');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(input.value).toContain('الكويت');
    input.blur();
    await search('Syria');
    input.blur();
    await fixture.whenStable();
    expect(input.value).toContain('الكويت');
    input.focus();
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBeGreaterThan(200);
    expect(countryChange).not.toHaveBeenCalled();
  });

  it('disables both phone and country editing', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(input.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('input[type="tel"]').disabled).toBeTrue();
    (fixture.nativeElement.querySelector('.country-toggle') as HTMLButtonElement).click();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    expect(countryChange).not.toHaveBeenCalled();
  });
});
