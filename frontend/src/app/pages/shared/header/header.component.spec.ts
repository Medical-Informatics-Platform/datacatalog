import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../services/auth.service';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let loginSpy: jasmine.Spy;
  let loggedIn: boolean;

  beforeEach(async () => {
    loggedIn = false;
    loginSpy = jasmine.createSpy('login');
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => loggedIn,
            login: loginSpy,
            logout: jasmine.createSpy('logout'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show a labeled Sign in button when logged out', () => {
    const signInBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.sign-in-btn');
    expect(signInBtn).not.toBeNull();
    expect(signInBtn.textContent.trim()).toBe('Sign in');
  });

  it('should call login() when the Sign in button is clicked', () => {
    const signInBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.sign-in-btn');
    signInBtn!.click();
    expect(loginSpy).toHaveBeenCalled();
  });

  it('should show the account avatar when logged in', () => {
    loggedIn = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-avatar-btn')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.sign-in-btn')).toBeNull();
  });

  it('should keep the navigation links', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.navbar a'),
    ).map((el: HTMLElement) => el.textContent?.trim());
    expect(labels).toContain('Home');
    expect(labels).toContain('Federations');
    expect(labels).toContain('About');
  });
});
