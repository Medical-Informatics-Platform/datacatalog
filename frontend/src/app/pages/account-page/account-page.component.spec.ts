import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AccountPageComponent } from './account-page.component';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

describe('AccountPageComponent', () => {
  let component: AccountPageComponent;
  let fixture: ComponentFixture<AccountPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            logout: jasmine.createSpy('logout'),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserDetails: () => of({
              fullname: 'Test User',
              email: 'test@example.com',
              roles: ['DC_DOMAIN_EXPERT'],
            }),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
