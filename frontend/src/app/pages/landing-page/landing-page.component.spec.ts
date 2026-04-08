import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FederationService } from '../../services/federation.service';
import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: FederationService,
          useValue: {
            getFederationsWithPathologies: () =>
              of([
                {
                  code: 'publicmip',
                  title: 'Public MIP',
                  url: 'https://hbpmip.link',
                  description: 'Federated access for MIP datasets.',
                  dataModelIds: [],
                  pathologies: [],
                  institutions: '7',
                  records: '524133'
                }
              ])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render federation cards from service data', () => {
    const cards: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.card-fed');

    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Public MIP');
    expect(cards[0].textContent).toContain('524,133');
  });
});
