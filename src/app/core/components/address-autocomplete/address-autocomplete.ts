import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { AddressLocation, KUWAIT_ADDRESS_OPTIONS, normalizeAddressSearch } from '../../data/kuwait-areas';

@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  templateUrl: './address-autocomplete.html',
  styleUrl: './address-autocomplete.css',
})
export class AddressAutocompleteComponent {
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  value = input('');
  fieldId = input('addressLine1');
  label = input('العنوان الأول');
  language = input<'ar' | 'en'>('ar');
  locationChange = output<AddressLocation>();
  isOpen = signal(false);
  query = signal('');
  activeIndex = signal(-1);
  filteredOptions = computed(() => {
    const words = normalizeAddressSearch(this.query()).split(/\s+/).filter(Boolean);
    return KUWAIT_ADDRESS_OPTIONS.filter(option => {
      const label = normalizeAddressSearch(option.addressLine1);
      return words.every(word => label.includes(word));
    });
  });

  open(): void {
    this.query.set('');
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else {
      this.host.nativeElement.querySelector('input')?.focus();
      this.open();
    }
  }

  onInput(event: Event): void {
    const addressLine1 = (event.target as HTMLInputElement).value;
    this.query.set(addressLine1);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
    // Typing a different address must not retain a previous area's delivery fee.
    this.locationChange.emit({ addressLine1, city: null, state: null });
  }

  select(option: AddressLocation): void {
    this.locationChange.emit({ ...option });
    this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.isOpen()) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
      return;
    }
    if (event.key === 'Enter' && this.isOpen() && this.activeIndex() >= 0) {
      event.preventDefault();
      this.select(this.filteredOptions()[this.activeIndex()]);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!this.isOpen()) this.open();
    const count = this.filteredOptions().length;
    if (!count) return;
    const current = this.activeIndex();
    this.activeIndex.set(event.key === 'ArrowDown'
      ? (current + 1) % count : (current <= 0 ? count - 1 : current - 1));
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="option"]')[this.activeIndex()]
      ?.scrollIntoView({ block: 'nearest' });
  }
}
