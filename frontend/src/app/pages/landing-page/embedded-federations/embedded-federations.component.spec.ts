import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { FederationService } from '../../../services/federation.service';
import { EmbeddedFederationsComponent } from './embedded-federations.component';

describe('EmbeddedFederationsComponent', () => {
  let fixture: ComponentFixture<EmbeddedFederationsComponent>;
  let component: EmbeddedFederationsComponent;
  let federationService: jasmine.SpyObj<FederationService>;

  beforeEach(async () => {
    federationService = jasmine.createSpyObj<FederationService>(
      'FederationService',
      ['getFederationsWithPathologies', 'deleteFederation']
    );
    federationService.getFederationsWithPathologies.and.returnValue(of([]));
    federationService.deleteFederation.and.returnValue(of(void 0));

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
            hasRole: () => of(false),
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
  });

  it('should delete a federation after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteFederation('fed-1');

    expect(window.confirm).toHaveBeenCalled();
    expect(federationService.deleteFederation).toHaveBeenCalledWith('fed-1');
  });
});
