import { TestBed } from '@angular/core/testing';
import { Federation } from '../interfaces/federations.interface';
import { EuropeMapComponent } from './europe-map.component';
import { MAP_H } from './europe-map-data';

const fed = (code: string, institutions: number): Federation =>
  ({ code, title: code, url: '', description: '', dataModelIds: [], institutions, records: 1000 });

function render(feds: Federation[], colors = new Map<string, string>()): HTMLElement {
  const f = TestBed.createComponent(EuropeMapComponent);
  f.componentRef.setInput('federations', feds);
  f.componentRef.setInput('lineColors', colors);
  f.detectChanges();
  return f.nativeElement;
}

describe('EuropeMapComponent', () => {
  it('draws one network per mapped federation and counts the rest as not mapped', () => {
    const el = render([fed('dementia', 4), fed('repomse', 15), fed('ecream', 17), fed('brandnew', 2)]);
    const badge = el.querySelector('.badge')?.textContent ?? '';
    expect(el.querySelectorAll('.route').length).toBe(3);
    expect(el.querySelectorAll('.station').length).toBe(7); // 3 + 1 + 3 dataset sites
    expect(badge).toContain('38 institutions'); // includes the unmapped federation
    expect(badge).toContain('1 not mapped');
  });

  it('puts shared dataset sites in separate lanes', () => {
    const el = render([fed('dementia', 4), fed('publicmip', 0)]);
    const [dementia, publicmip] = [...el.querySelectorAll<SVGGElement>('.route')];
    const lausanne = (g: SVGGElement) =>
      [...g.querySelectorAll<SVGCircleElement>('.station')].find((c) => c.getAttribute('cx') === '229.7')!;
    const a = Number(lausanne(dementia).getAttribute('cy'));
    const b = Number(lausanne(publicmip).getAttribute('cy'));
    expect(b - a).toBeCloseTo(12, 5);
  });

  it('shrinks hit targets at shared sites so a neighbour cannot steal the hover', () => {
    const el = render([fed('dementia', 4), fed('publicmip', 0)]);
    const atLausanne = (g: SVGGElement) =>
      [...g.querySelectorAll<SVGCircleElement>('.hit-dot')].find((c) => c.getAttribute('cx') === '229.7')!;
    const [dementia, publicmip] = [...el.querySelectorAll<SVGGElement>('.route')];
    expect(atLausanne(dementia).getAttribute('r')).toBe('6');
    expect(atLausanne(publicmip).getAttribute('r')).toBe('6');
    expect(dementia.querySelector<SVGCircleElement>('.hit-dot')!.getAttribute('r')).toBe('12');
  });

  it('uses the supplied colour and names the dataset sites in the accessible label', () => {
    const route = render([fed('dementia', 4)], new Map([['dementia', 'var(--line-3)']])).querySelector<SVGGElement>('.route')!;
    const label = route.getAttribute('aria-label') ?? '';
    expect(label).toContain('4 institutions');
    expect(label).toContain('Dataset sites: Lille, Lausanne, Brescia');
    expect(label).toContain('ADNI comparison cohort');
    expect(label).not.toContain('country-level');
    expect(route.querySelector<SVGPathElement>('.line')!.getAttribute('stroke')).toBe('var(--line-3)');
  });

  it('marks country-level sites in the accessible label', () => {
    const label = render([fed('ecream', 17)]).querySelector('.route')!.getAttribute('aria-label') ?? '';
    expect(label).toContain('Italy, Slovenia, Poland');
    expect(label).toContain('country-level, cities not published');
  });

  it('draws a single-site network as a station with no segment', () => {
    const el = render([fed('repomse', 15)]);
    const d = el.querySelector<SVGPathElement>('.line')!.getAttribute('d') ?? '';
    expect(d.startsWith('M')).toBeTrue();
    expect(d).not.toContain('L');
    expect(el.querySelectorAll('.station').length).toBe(1);
  });

  it('marks a federation with no member institutions', () => {
    const route = render([fed('publicmip', 0)]).querySelector('.route')!;
    expect(route.classList.contains('open')).toBeTrue();
    expect(route.getAttribute('aria-label')).toContain('No member institutions');
  });

  it('uses a neutral fallback colour when the store has no entry', () => {
    const route = render([fed('dementia', 4)]).querySelector<SVGGElement>('.route')!;
    expect(route.querySelector<SVGPathElement>('.line')!.getAttribute('stroke')).toBe('var(--ink-3)');
  });

  it('ignores prototype-like federation codes instead of crashing', () => {
    const el = render([fed('constructor', 1)]);
    expect(el.querySelectorAll('.route').length).toBe(0);
    expect(el.querySelector('.badge')?.textContent).toContain('1 not mapped');
  });

  it('anchors the tooltip above the top of the network', () => {
    const f = TestBed.createComponent(EuropeMapComponent);
    f.componentRef.setInput('federations', [fed('dementia', 4)]);
    f.detectChanges();
    const host = f.nativeElement as HTMLElement;
    (host.querySelector('.route') as SVGGElement).dispatchEvent(new Event('mouseenter'));
    f.detectChanges();
    const top = parseFloat((host.querySelector('.tip') as HTMLElement).style.top);
    expect(top).toBeCloseTo((219.2 / MAP_H) * 100, 2);
  });

  it('scrolls to the federation card on click or Enter', () => {
    const card = document.createElement('article');
    card.id = 'fed-dementia';
    card.scrollIntoView = jasmine.createSpy('scrollIntoView');
    document.body.appendChild(card);
    const route = render([fed('dementia', 4)]).querySelector<SVGElement>('.route')!;
    route.dispatchEvent(new Event('click'));
    expect(card.scrollIntoView).toHaveBeenCalled();
    (card.scrollIntoView as jasmine.Spy).calls.reset();
    route.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(card.scrollIntoView).toHaveBeenCalled();
    card.remove();
  });
});
