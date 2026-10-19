import { ProductVariantUpdateDto } from './product.models';

export type ProductOptions = ProductVariantUpdateDto[];

export function optionsError(groups: ProductOptions, language: 'ar' | 'en'): string | null {
  const ar = language === 'ar';
  const names = new Set<string>();
  const key = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase();
  for (const group of groups) {
    const name = (ar ? group.nameAr || group.name : group.name || group.nameAr).trim();
    if (!name) return ar ? 'اكتب اسم المواصفة، مثل المقاس أو عدد القطع.' : 'Enter an option name, such as Size or Pack size.';
    if (group.name.length > 100 || group.nameAr.length > 100)
      return ar ? 'اسم المواصفة يجب ألا يتجاوز 100 حرف.' : 'Option names must be at most 100 characters.';
    if (names.has(key(name))) return ar ? 'اسم المواصفة مكرر. اجمع خياراتها ضمن نفس المواصفة.' : 'This option name is repeated. Keep its choices in one group.';
    names.add(key(name));
    if (!group.values.length) return ar ? `أضف خياراً واحداً على الأقل إلى «${name}».` : `Add at least one choice to ${name}.`;
    const choices = new Set<string>();
    for (const value of group.values) {
      const label = (ar ? value.valueAr || value.value : value.value || value.valueAr).trim();
      if (!label) return ar ? `اكتب اسم كل خيار ضمن «${name}».` : `Enter a label for each choice in ${name}.`;
      if (value.value.length > 100 || value.valueAr.length > 100)
        return ar ? 'اسم الخيار يجب ألا يتجاوز 100 حرف.' : 'Choice labels must be at most 100 characters.';
      if (choices.has(key(label))) return ar ? `الخيار «${label}» مكرر ضمن نفس المواصفة.` : `${label} appears more than once in this group.`;
      choices.add(key(label));
      if (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0.01
        || Math.abs(value.price * 1000 - Math.round(value.price * 1000)) > 0.000001)
        return ar ? `أدخل سعر بيع صحيحاً للخيار «${label}» (0.010 د.ك على الأقل، وحتى 3 خانات عشرية).`
          : `Enter a selling price for ${label} (at least 0.010 KWD, up to 3 decimal places).`;
    }
  }
  return null;
}

// A single-language entry remains usable in both storefront languages.
export function prepareOptions(groups: ProductOptions): ProductOptions {
  return groups.map(group => ({ ...group,
    name: group.name.trim() || group.nameAr.trim(),
    nameAr: group.nameAr.trim() || group.name.trim(),
    values: group.values.map(value => ({ ...value,
      value: value.value.trim() || value.valueAr.trim(),
      valueAr: value.valueAr.trim() || value.value.trim(),
    })),
  }));
}
