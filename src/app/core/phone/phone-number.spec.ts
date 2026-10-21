import { CountryCode } from 'libphonenumber-js/max';
import { formatPhoneInput, normalizePhone } from './phone-number';

describe('International phone numbers', () => {
  const cases: [string, CountryCode, string | null][] = [
    ['50000000', 'KW', '+96550000000'], ['+96550000000', 'DE', '+96550000000'],
    ['0096550000000', 'DE', '+96550000000'], ['96550000000', 'KW', '+96550000000'],
    ['+4915112345678', 'KW', '+4915112345678'], ['004915112345678', 'KW', '+4915112345678'],
    ['015112345678', 'DE', '+4915112345678'], ['4915112345678', 'KW', null],
    ['015112345678', 'KW', null], ['123', 'DE', null], ['965+50000000', 'KW', null],
    ['call +4915112345678', 'DE', null], ['+14155552671', 'DE', '+14155552671'],
  ];
  for (const [input, country, expected] of cases) {
    it(`normalizes ${input} with ${country}`, () => expect(normalizePhone(input, country)).toBe(expected));
  }
  it('preserves identity during formatting and does not repair invalid text', () => {
    expect(normalizePhone(formatPhoneInput('015112345678', 'DE'), 'DE')).toBe('+4915112345678');
    expect(formatPhoneInput('bad phone', 'DE')).toBe('bad phone');
  });
});
