import { TestBed } from '@angular/core/testing';
import { Federation } from '../interfaces/federations.interface';
import { EuropeMapComponent } from './europe-map.component';

const fed = (code: string, institutions: number): Federation =>
  ({ code, title: code, url: '', description: '', dataModelIds: [], institutions, records: 1000 });

function render(feds: Federation[]): HTMLElement {
  const f = TestBed.createComponent(EuropeMapComponent);
  f.componentRef.setInput('federations', feds);
  f.detectChanges();
  return f.nativeElement;
}

describe('EuropeMapComponent', () => {
  it('draws a node per mapped federation, links them, and reports unmapped ones', () => {
    const el = render([fed('dementia', 4), fed('feres', 5), fed('ecream', 17), fed('brandnew', 2)]);
    expect(el.querySelectorAll('.node').length).toBe(3);
    expect(el.querySelectorAll('.edge').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('.badge')?.textContent).toContain('1 not shown');
  });

  it('scrolls to the federation card on click', () => {
    const card = document.createElement('article');
    card.id = 'fed-dementia';
    card.scrollIntoView = jasmine.createSpy('scrollIntoView');
    document.body.appendChild(card);
    render([fed('dementia', 4)]).querySelector<SVGElement>('.node')!.dispatchEvent(new Event('click'));
    expect(card.scrollIntoView).toHaveBeenCalled();
    card.remove();
  });
});
