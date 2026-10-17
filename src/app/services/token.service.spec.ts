import { TokenService } from './token.service';

describe('JWT role claims', () => {
  let service: TokenService;
  let getToken: jasmine.Spy;

  beforeEach(() => {
    service = new TokenService();
    getToken = spyOn(service, 'getToken');
  });

  function useClaims(claims: object): void {
    const payload = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    getToken.and.returnValue(`header.${payload}.signature`);
  }

  it('recognizes the role claim emitted by the existing .NET backend', () => {
    useClaims({ 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['User', 'SuperAdmin'] });
    expect(service.hasRole('SuperAdmin')).toBeTrue();
    expect(service.hasRole('Admin')).toBeFalse();
  });

  it('recognizes Admin and both Super Admin spellings in single and array claims', () => {
    useClaims({ role: 'Admin' });
    expect(service.hasRole('Admin')).toBeTrue();
    useClaims({ roles: ['User', 'Super Admin'] });
    expect(service.hasRole('SuperAdmin')).toBeTrue();
  });

  it('does not confuse a user role or a partial role name with an administrator', () => {
    useClaims({ role: 'User', roles: ['NotAdmin', 'SuperAdminAssistant'] });
    expect(service.hasRole('Admin')).toBeFalse();
    expect(service.hasRole('SuperAdmin')).toBeFalse();
  });

  it('rejects missing and malformed tokens or claims', () => {
    for (const token of [null, '', 'bad-token', 'a.%%%.c', 'a.bnVsbA.c']) {
      getToken.and.returnValue(token);
      expect(service.hasRole('SuperAdmin')).toBeFalse();
    }
    useClaims({ role: 1, roles: [null, {}] });
    expect(service.hasRole('SuperAdmin')).toBeFalse();
  });
});
