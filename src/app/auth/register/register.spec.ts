import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { ServiceAuth } from '../service-auth';
import { RegisterComponent } from './register';

describe('Registration field errors', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let register: jasmine.Spy;

  beforeEach(() => {
    register = jasmine.createSpy('register');
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: ServiceAuth, useValue: { register } }],
    });
    fixture = TestBed.createComponent(RegisterComponent);
    spyOn(fixture.componentInstance, 'ngOnInit');
    fixture.detectChanges();
    fixture.componentInstance.currentLanguage.set('ar');
    fixture.componentInstance.registerForm.setValue({
      username: 'أحمد ٢٢٣', email: 'customer@example.test', phoneNumber: '1234567890',
      password: 'Example!1', confirmPassword: 'Example!1',
    });
  });

  function submitError(error: object): string {
    register.and.returnValue(throwError(() => ({ error })));
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(register).toHaveBeenCalledWith(jasmine.objectContaining({ username: 'أحمد ٢٢٣' }));
    return fixture.nativeElement.querySelector('form').textContent;
  }

  it('submits Arabic names and shows username errors under the username only', () => {
    const form = submitError({ fieldErrors: { username: ['DuplicateUserName'] } });
    expect(form).toContain('اسم المستخدم مستخدم بالفعل');
    expect(fixture.componentInstance.getError('password')).toBeNull();
  });

  it('does not treat the older username message mentioning digits as a password error', () => {
    const form = submitError({ message: "Registration failed: Username 'أحمد ٢٢٣' is invalid, can only contain letters or digits." });
    expect(form).toContain('استخدم حروفاً أو أرقاماً');
    expect(fixture.componentInstance.getError('password')).toBeNull();
  });

  it('shows actual password errors on the password field', () => {
    submitError({ fieldErrors: { password: ['PasswordRequiresDigit'] } });
    expect(fixture.componentInstance.getError('username')).toBeNull();
    expect(fixture.componentInstance.getError('password')).toContain('رقم واحد');
  });
});
