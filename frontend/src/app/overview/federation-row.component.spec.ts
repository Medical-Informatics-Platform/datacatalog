import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { FederationRowComponent } from './federation-row.component';

type Fed = Federation & { pathologies: Pathology[] };

const model = (uuid: string, label: string, version: string): Pathology =>
  ({ uuid, label, code: label.toLowerCase(), version, released: true });

const fed = (overrides: Partial<Fed> = {}): Fed => ({
  code: 'dementia',
  title: 'Dementia',
  url: 'https://mip.example/dementia',
  description: 'A federation of dementia cohorts.',
  institutions: 4,
  records: 6348,
  dataModelIds: ['m1'],
  pathologies: [model('m1', 'Dementia', 'v5')],
  ...overrides,
});

describe('FederationRowComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function render(fed: Fed, admin = false) {
    const f = TestBed.createComponent(FederationRowComponent);
    f.componentRef.setInput('fed', fed);
    f.componentRef.setInput('admin', admin);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('links the primary action to the explorer scoped to the federation, with no model selected', () => {
    const { el } = render(fed());
    const link = el.querySelector<HTMLAnchorElement>('a.btn-primary')!;
    expect(link).toBeTruthy();
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/pathology');
    expect(href).toContain('federationCode=dementia');
    expect(href).not.toContain('pathologyCode');
  });

  it('labels the primary action with the model count', () => {
    const { el } = render(fed({ pathologies: [model('m1', 'A', 'v1'), model('m2', 'B', 'v2'), model('m3', 'C', 'v3')] }));
    expect(el.querySelector('a.btn-primary')?.textContent).toContain('Explore 3 data models');
  });

  it('uses the singular label for one model', () => {
    const { el } = render(fed());
    expect(el.querySelector('a.btn-primary')?.textContent).toContain('Explore 1 data model');
  });

  it('hides the primary action and shows the empty text when there are no models', () => {
    const { el } = render(fed({ pathologies: [] }));
    expect(el.querySelector('a.btn-primary')).toBeNull();
    expect(el.textContent).toContain('No released data models yet.');
  });

  it('hides Open MIP when the federation has no URL, and marks it noopener otherwise', () => {
    const { el } = render(fed({ url: '' }));
    expect(el.querySelector('.mip-link')).toBeNull();

    const { el: el2 } = render(fed());
    const mip = el2.querySelector<HTMLAnchorElement>('.mip-link')!;
    expect(mip.getAttribute('rel')).toContain('noopener');
    expect(mip.getAttribute('target')).toBe('_blank');
  });

  it('hides admin buttons for anonymous visitors and shows them for admins', () => {
    const { el } = render(fed(), false);
    expect(el.querySelector('button[aria-label^="Edit"]')).toBeNull();
    expect(el.querySelector('button[aria-label^="Delete"]')).toBeNull();

    const { el: el2 } = render(fed(), true);
    expect(el2.querySelector('button[aria-label="Edit Dementia"]')).toBeTruthy();
    expect(el2.querySelector('button[aria-label="Delete Dementia"]')).toBeTruthy();
  });

  it('announces the federation name in the article label', () => {
    const { el } = render(fed());
    const article = el.querySelector('article')!;
    expect(article.getAttribute('aria-labelledby')).toBe('fed-dementia-title');
    expect(el.querySelector('#fed-dementia-title')?.textContent).toContain('Dementia');
  });
});
