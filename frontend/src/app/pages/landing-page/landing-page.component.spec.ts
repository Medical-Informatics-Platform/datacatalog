import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FederationService } from '../../services/federation.service';
import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  let fixture: ComponentFixture<LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: FederationService,
          useValue: {
            getFederationsWithPathologiesStrict: () =>
              of([
                {
                  code: 'publicmip',
                  title: 'Public MIP',
                  url: 'https://hbpmip.link',
                  description: 'Federated access for MIP datasets.',
                  dataModelIds: [],
                  pathologies: [],
                  institutions: '7',
                  records: '524133',
                },
              ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    fixture.componentRef.instance.dataQualityToolUrl = 'https://dqt.example.org';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the hero headline with the gradient phrase', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('h1.title');
    expect(title.textContent).toContain('Explore the frontiers of');
    const gradient: HTMLElement = title.querySelector('.text-gradient');
    expect(gradient?.textContent).toContain('clinical discovery.');
  });

  it('should expose a primary CTA to the federations section', () => {
    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.hero-actions a'),
    ) as HTMLAnchorElement[];
    const primary = links.find((a) => a.classList.contains('btn-primary'));
    expect(primary).toBeDefined();
    expect(primary?.getAttribute('href')).toBe('#federations');
    expect(primary?.textContent?.trim()).toContain('Explore Federations');
  });

  it('should expose an external Data Quality Tool CTA', () => {
    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.hero-actions a'),
    ) as HTMLAnchorElement[];
    const dqt = links.find((a) => a.classList.contains('btn-outline'));
    expect(dqt).toBeDefined();
    expect(dqt?.textContent?.trim()).toContain('Data Quality Tool');
    expect(dqt?.getAttribute('href')).toBe('https://dqt.example.org');
    expect(dqt?.getAttribute('target')).toBe('_blank');
    expect(dqt?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should list the supported data models as non-clickable badges', () => {
    const pills = fixture.nativeElement.querySelectorAll('.data-model-pill');
    expect(pills.length).toBe(3);
    const texts = Array.from(pills).map((p) => p.textContent?.trim());
    expect(texts).toEqual(['OMOP v5.4', 'CDM v6.1', 'CDM v5.3.1']);
  });

  it('should show the network proof stats in the hero card', () => {
    const stats = fixture.nativeElement.querySelector('.proof-stats').textContent;
    expect(stats).toContain('30+');
    expect(stats).toContain('500k+');
    expect(stats).toContain('12');
  });

  it('should render the core capability cards', () => {
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.feature-title'),
    ).map((el: HTMLElement) => el.textContent?.trim());
    expect(titles).toEqual([
      'Federated Network',
      'Secure Environment',
      'Privacy-Preserving Analytics',
    ]);
  });

  it('should render the four FAIR principle cards', () => {
    const letters = Array.from(
      fixture.nativeElement.querySelectorAll('.fair-letter'),
    ).map((el: HTMLElement) => el.textContent?.trim());
    expect(letters).toEqual(['F', 'A', 'I', 'R']);
  });

  it('should render federation cards from service data', () => {
    const cards: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.card-fed');

    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Public MIP');
    expect(cards[0].textContent).toContain('524,133');
  });
});
