import { AsYouType, CountryCode, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';

/** Bare numbers belong only to the selected country. Never guess a foreign calling code. */
export function normalizePhone(value: string | null | undefined, country: CountryCode = 'KW'): string | null {
  if (!value || value.length > 40 || !/^[+0-9\s()-]+$/.test(value)) return null;
  let text = value.replace(/[\s()-]/g, '');
  if (text.startsWith('00')) text = '+' + text.slice(2);
  const international = text.startsWith('+');
  if (!/^\+?[0-9]+$/.test(text)) return null;
  // Accept the selected country's explicit calling code without '+', as in 96550000000.
  const callingCode = getCountryCallingCode(country);
  if (!international && text.startsWith(callingCode)) {
    const prefixed = parsePhoneNumberFromString('+' + text, { extract: false });
    if (prefixed?.isValid() && prefixed.countryCallingCode === callingCode) return prefixed.number;
  }
  const phone = parsePhoneNumberFromString(text, { defaultCountry: country, extract: false });
  if (!phone?.isValid() || phone.ext || (!international && phone.country !== country)) return null;
  return phone.number;
}

export function formatPhoneInput(value: string, country: CountryCode): string {
  if (!/^[+0-9\s()-]*$/.test(value) || value.length > 40) return value;
  const text = value.startsWith('00') ? '+' + value.slice(2) : value;
  return new AsYouType(country).input(text);
}
