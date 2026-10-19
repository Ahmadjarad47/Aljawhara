import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductVariantUpdateDto, ProductVariantValueUpdateDto } from './product.models';
import { optionsError, ProductOptions } from './product-options';

@Component({
  selector: 'app-product-options-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-options-editor.html',
  styleUrl: './product-options-editor.css',
})
export class ProductOptionsEditor {
  variants = input<ProductOptions>([]);
  variantsChange = output<ProductOptions>();
  language = input<'ar' | 'en'>('ar');
  basePrice = input(0);
  stockQuantity = input(0);
  showErrors = input(false);
  disabled = input(false);
  idPrefix = input('product-options');
  error = computed(() => optionsError(this.variants(), this.language()));
  private previousOptions: ProductOptions = [];
  readonly presets: ('size' | 'color' | 'pack')[] = ['size', 'color', 'pack'];

  readonly text = {
    ar: {
      title: 'كيف تبيع هذا المنتج؟', fixed: 'بسعر واحد', fixedHint: 'بدون خيارات؛ يستخدم سعر البيع الأساسي أعلاه.',
      options: 'بخيارات وأسعار مختلفة', optionsHint: 'مثل المقاس أو اللون أو عدد القطع في العبوة.',
      guide: 'سمّ المواصفة، ثم أضف خياراتها وحدد سعر بيع كل خيار. يُحفظ كل ما تكتبه عند حفظ المنتج.',
      example: 'مثال توضيحي: عدد القطع ← عبوة 10 قطع بسعر 1.500 د.ك، وعبوة 20 قطعة بسعر 2.500 د.ك.',
      stock: 'المخزون مشترك لكل الخيارات', stockHint: 'الكمية أعلاه هي إجمالي مخزون المنتج، وليست كمية مستقلة لكل خيار.',
      group: 'اسم المواصفة', groupPlaceholder: 'مثال: المقاس، اللون، عدد القطع', size: 'المقاس', color: 'اللون', pack: 'عدد القطع',
      choice: 'الخيار المتاح للعميل', choicePlaceholder: 'مثال: صغير، أحمر، عبوة 10 قطع', price: 'سعر بيع الخيار (د.ك)',
      priceHint: 'اكتب السعر الكامل للخيار. سعره يستبدل السعر الأساسي عند اختياره في صفحة المنتج.',
      addChoice: 'إضافة خيار آخر', removeChoice: 'حذف الخيار', addGroup: 'إضافة مواصفة أخرى', removeGroup: 'حذف المواصفة',
      translation: 'إضافة ترجمة إنجليزية (اختياري)', translatedGroup: 'اسم المواصفة بالإنجليزية', translatedChoice: 'الخيار بالإنجليزية',
      translationHint: 'إذا تركت الترجمة فارغة، سيُستخدم الاسم الذي أدخلته.',
      preview: 'معاينة الخيارات', emptyPreview: 'أدخل أسماء الخيارات وأسعارها لتظهر المعاينة هنا.',
      multiple: 'مع عدة مواصفات، تعتمد صفحة المنتج سعر آخر خيار يحدده العميل. إذا كان السعر مرتبطاً بالمقاس واللون معاً، اجمعهما في خيار واحد مثل «كبير — أحمر».',
      emptyChoices: 'أضف الخيارات التي يمكن للعميل الاختيار بينها.',
    },
    en: {
      title: 'How is this product sold?', fixed: 'One price', fixedHint: 'No choices; uses the base selling price above.',
      options: 'Choices with their own prices', optionsHint: 'For example: size, color, or pieces per pack.',
      guide: 'Name the option, then add its choices and selling prices. Everything is saved when you save the product.',
      example: 'Example: Pack size → 10-piece pack for 1.500 KWD; 20-piece pack for 2.500 KWD.',
      stock: 'All choices share the same stock', stockHint: 'The quantity above is total product stock, not a separate quantity for each choice.',
      group: 'Option name', groupPlaceholder: 'For example: Size, Color, Pack size', size: 'Size', color: 'Color', pack: 'Pack size',
      choice: 'Choice shown to customers', choicePlaceholder: 'For example: Small, Red, 10-piece pack', price: 'Choice selling price (KWD)',
      priceHint: 'Enter the full selling price. Selecting this choice replaces the base price on the product page.',
      addChoice: 'Add another choice', removeChoice: 'Remove choice', addGroup: 'Add another option', removeGroup: 'Remove option',
      translation: 'Add Arabic translation (optional)', translatedGroup: 'Option name in Arabic', translatedChoice: 'Choice in Arabic',
      translationHint: 'If left blank, the name you entered is used.',
      preview: 'Choices preview', emptyPreview: 'Enter choice labels and prices to see the preview here.',
      multiple: 'With several options, the product page uses the price of the last choice selected. If price depends on size and color together, combine them in one choice such as “Large — Red”.',
      emptyChoices: 'Add the choices customers can select.',
    },
  };

  t(key: keyof typeof this.text.ar): string { return this.text[this.language()][key]; }

  setMode(withOptions: boolean): void {
    if (this.disabled() || withOptions === (this.variants().length > 0)) return;
    if (!withOptions) {
      this.previousOptions = this.variants();
      this.variantsChange.emit([]);
    } else if (this.previousOptions.length) this.variantsChange.emit(this.previousOptions);
    else this.addGroup();
  }

  addGroup(): void {
    this.variantsChange.emit([...this.variants(), { name: '', nameAr: '', values: [this.blankChoice()] }]);
  }

  removeGroup(index: number): void {
    const remaining = this.variants().filter((_, i) => i !== index);
    if (!remaining.length) this.previousOptions = [];
    this.variantsChange.emit(remaining);
  }

  setPreset(index: number, kind: 'size' | 'color' | 'pack'): void {
    this.updateGroup(index, { name: this.text.en[kind], nameAr: this.text.ar[kind] });
  }

  updateGroup(index: number, fields: Partial<ProductVariantUpdateDto>): void {
    this.variantsChange.emit(this.variants().map((group, i) => i === index ? { ...group, ...fields } : group));
  }

  addChoice(index: number): void {
    this.updateGroup(index, { values: [...this.variants()[index].values, this.blankChoice()] });
  }

  removeChoice(groupIndex: number, index: number): void {
    this.updateGroup(groupIndex, { values: this.variants()[groupIndex].values.filter((_, i) => i !== index) });
  }

  updateChoice(groupIndex: number, index: number, fields: Partial<ProductVariantValueUpdateDto>): void {
    this.updateGroup(groupIndex, { values: this.variants()[groupIndex].values.map((value, i) => i === index ? { ...value, ...fields } : value) });
  }

  groupLabel(group: ProductVariantUpdateDto): string {
    return this.language() === 'ar' ? group.nameAr || group.name : group.name || group.nameAr;
  }

  choiceLabel(value: ProductVariantValueUpdateDto): string {
    return this.language() === 'ar' ? value.valueAr || value.value : value.value || value.valueAr;
  }

  private blankChoice(): ProductVariantValueUpdateDto {
    return { value: '', valueAr: '', price: this.basePrice() > 0 ? this.basePrice() : 0 };
  }
}
