import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { FederationService } from '../../../services/federation.service';
import { EmbeddedFederationsComponent } from './embedded-federations.component';

describe('EmbeddedFederationsComponent', () => {
  let fixture: ComponentFixture<EmbeddedFederationsComponent>;
  let component: EmbeddedFederationsComponent;
  let federationService: jasmine.SpyObj<FederationService>;
  let hasRole: jasmine.Spy;

  async function setup(isAdmin: boolean): Promise<void> {
    TestBed.resetTestingModule();
    federationService = jasmine.createSpyObj<FederationService>(
      'FederationService',
      ['getFederationsWithPathologies', 'deleteFederation']
    );
    federationService.getFederationsWithPathologies.and.returnValue(of([]));
    federationService.deleteFederation.and.returnValue(of(void 0));
    hasRole = jasmine.createSpy('hasRole').and.returnValue(of(isAdmin));

    await TestBed.configureTestingModule({
      imports: [EmbeddedFederationsComponent],
      providers: [
        provideRouter([]),
        {
          provide: FederationService,
          useValue: federationService,
        },
        {
          provide: AuthService,
          useValue: {
            hasRole,
          }
        },
        {
          provide: ChangeDetectorRef,
          useValue: {
            detectChanges: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmbeddedFederationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should delete a federation after confirmation', async () => {
    await setup(false);
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteFederation('fed-1');

    expect(window.confirm).toHaveBeenCalled();
    expect(federationService.deleteFederation).toHaveBeenCalledWith('fed-1');
  });

  it('should show the add federation card for admins', async () => {
    await setup(true);

    const addCard = fixture.nativeElement.querySelector('app-add-federation-card');

    expect(addCard).not.toBeNull();
  });

  it('should hide the add federation card for non-admins', async () => {
    await setup(false);

    const addCard = fixture.nativeElement.querySelector('app-add-federation-card');

    expect(addCard).toBeNull();
  });

  it('should navigate to the add federation form', async () => {
    await setup(true);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    component.goToAddFederation();

    expect(router.navigate).toHaveBeenCalledWith(['/federations/add']);
  });
});
