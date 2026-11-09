import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { FederationService } from '../../../services/federation.service';
import { PathologyService } from '../../../services/pathology.service';
import { FederationFormComponent } from './federation-form.component';

describe('FederationFormComponent', () => {
  let fixture: ComponentFixture<FederationFormComponent>;
  let component: FederationFormComponent;
  let federationService: jasmine.SpyObj<FederationService>;

  async function setup(isUpdate: boolean): Promise<void> {
    TestBed.resetTestingModule();
    federationService = jasmine.createSpyObj<FederationService>(
      'FederationService',
      ['getFederationsWithPathologies', 'updateFederation', 'createFederation']
    );
    federationService.getFederationsWithPathologies.and.returnValue(
      of([
        {
          code: 'fed-1',
          title: 'Federation One',
          url: 'https://example.com',
          description: 'A federation used for testing updates.',
          dataModelIds: ['model-1'],
          pathologies: [],
          institutions: '4',
          records: '6348',
        },
      ])
    );
    federationService.updateFederation.and.returnValue(
      of({
        code: 'fed-1',
        title: 'Federation One',
        url: 'https://example.com',
        description: 'A federation used for testing updates.',
        dataModelIds: ['model-1'],
        pathologies: [],
        institutions: '4',
        records: '6348',
      })
    );
    federationService.createFederation.and.returnValue(
      of({
        code: 'fed-2',
        title: 'Federation Two',
        url: 'https://example.com/new',
        description: 'A new federation.',
        dataModelIds: [],
        pathologies: [],
        institutions: '1',
        records: '10',
      })
    );

    await TestBed.configureTestingModule({
      imports: [FederationFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: FederationService,
          useValue: federationService,
        },
        {
          provide: PathologyService,
          useValue: {
            getAllReleasedPathologies: () => of([]),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { isUpdate },
              queryParamMap: convertToParamMap({ federationCode: 'fed-1' }),
            },
            data: of({ isUpdate }),
            queryParamMap: of(convertToParamMap({ federationCode: 'fed-1' })),
            queryParams: of({ federationCode: 'fed-1' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FederationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should send numeric records and institutions when updating', async () => {
    await setup(true);

    component.submitForm();

    expect(federationService.updateFederation).toHaveBeenCalledWith('fed-1', jasmine.objectContaining({
      code: 'fed-1',
      records: 6348,
      institutions: 4,
      dataModelIds: ['model-1'],
    }));
  });

  it('should not call the service when the form is invalid', async () => {
    await setup(false);

    component.submitForm();

    expect(federationService.createFederation).not.toHaveBeenCalled();
    expect(federationService.updateFederation).not.toHaveBeenCalled();
    expect(component.federationForm.touched).toBeTrue();
    expect(component.submitted).toBeTrue();
  });

  it('loads the federation from snapshot data even if route data is async', async () => {
    TestBed.resetTestingModule();
    federationService = jasmine.createSpyObj<FederationService>(
      'FederationService',
      ['getFederationsWithPathologies', 'updateFederation', 'createFederation']
    );
    federationService.getFederationsWithPathologies.and.returnValue(
      of([
        {
          code: 'fed-1',
          title: 'Federation One',
          url: 'https://example.com',
          description: 'A federation used for testing updates.',
          dataModelIds: ['model-1'],
          pathologies: [],
          institutions: '4',
          records: '6348',
        },
      ])
    );

    await TestBed.configureTestingModule({
      imports: [FederationFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: FederationService,
          useValue: federationService,
        },
        {
          provide: PathologyService,
          useValue: {
            getAllReleasedPathologies: () => of([]),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { isUpdate: true },
              queryParamMap: convertToParamMap({ federationCode: 'fed-1' }),
            },
            data: EMPTY,
            queryParamMap: of(convertToParamMap({ federationCode: 'fed-1' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FederationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isUpdateMode).toBeTrue();
    expect(federationService.getFederationsWithPathologies).toHaveBeenCalled();
    expect(component.federationForm.value.code).toBe('fed-1');
  });

  it('marks the federation as not found when no federation matches the code', async () => {
    await setup(true);
    federationService.getFederationsWithPathologies.and.returnValue(of([]));

    component.loadFederation('missing-code');

    expect(component.federationNotFound).toBeTrue();
  });
});
