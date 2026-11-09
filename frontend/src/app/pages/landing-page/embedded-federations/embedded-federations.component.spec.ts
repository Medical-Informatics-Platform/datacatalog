import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { FederationService } from '../../../services/federation.service';
import { EmbeddedFederationsComponent } from './embedded-federations.component';

describe('EmbeddedFederationsComponent', () => {
  let fixture: ComponentFixture<EmbeddedFederationsComponent>;
  let component: EmbeddedFederationsComponent;
  let federationService: jasmine.SpyObj<FederationService>;
  let hasRole: jasmine.Spy;

  function createServiceMock(): jasmine.SpyObj<FederationService> {
    return jasmine.createSpyObj<FederationService>('FederationService', [
      'getFederationsWithPathologiesStrict',
      'deleteFederation',
    ]);
  }

  async function setup(isAdmin: boolean, response: 'success' | 'empty' | 'error'): Promise<void> {
    TestBed.resetTestingModule();
    federationService = createServiceMock();
    federationService.deleteFederation.and.returnValue(of(void 0));

    if (response === 'error') {
      federationService.getFederationsWithPathologiesStrict.and.returnValue(
        throwError(() => new Error('boom'))
      );
    } else {
      const data =
        response === 'success'
          ? [
              {
                code: 'fed-1',
                title: 'Fed One',
                url: 'https://example.com',
                description: 'desc',
                dataModelIds: [],
                pathologies: [],
                institutions: '1',
                records: '10',
              },
            ]
          : [];
      federationService.getFederationsWithPathologiesStrict.and.returnValue(of(data));
    }

    hasRole = jasmine.createSpy('hasRole').and.returnValue(of(isAdmin));

    await TestBed.configureTestingModule({
      imports: [EmbeddedFederationsComponent],
      providers: [
        provideRouter([]),
        { provide: FederationService, useValue: federationService },
        { provide: AuthService, useValue: { hasRole } },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: () => undefined },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmbeddedFederationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should delete a federation after confirmation', async () => {
    await setup(false, 'empty');
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteFederation('fed-1');

    expect(window.confirm).toHaveBeenCalled();
    expect(federationService.deleteFederation).toHaveBeenCalledWith('fed-1');
  });

  it('should show the add federation card for admins', async () => {
    await setup(true, 'empty');
    const addCard = fixture.nativeElement.querySelector('app-add-federation-card');
    expect(addCard).not.toBeNull();
  });

  it('should hide the add federation card for non-admins', async () => {
    await setup(false, 'empty');
    const addCard = fixture.nativeElement.querySelector('app-add-federation-card');
    expect(addCard).toBeNull();
  });

  it('should show an error state with a retry button when the request fails', async () => {
    await setup(false, 'error');

    expect(fixture.nativeElement.querySelector('.error-state')).not.toBeNull();
    const retry: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.error-state .btn-primary',
    );
    expect(retry).not.toBeNull();
    expect(retry!.textContent?.trim()).toBe('Retry');
  });

  it('should show the empty state when there are no federations and the user is not an admin', async () => {
    await setup(false, 'empty');

    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-state')).toBeNull();
  });
});
