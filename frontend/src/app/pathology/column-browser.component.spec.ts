import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pathology } from '../interfaces/pathology.interface';
import { ROOT_ID, buildIndex } from '../services/pathology-tree';
import { ColumnBrowserComponent } from './column-browser.component';

const model: Pathology = {
  uuid: 'u', label: 'M', code: 'm', version: 'v1', released: true,
  variables: [{ label: 'Dataset', code: 'dataset', type: 'nominal' }],
  groups: [
    {
      label: 'A', code: 'a',
      groups: [{ label: 'A1', code: 'a1', variables: [{ label: 'Deep', code: 'deep', type: 'real' }] }],
      variables: [{ label: 'Age', code: 'age', type: 'integer' }],
    },
    { label: 'B', code: 'b', variables: [{ label: 'Bee', code: 'bee', type: 'text' }] },
  ],
};

describe('ColumnBrowserComponent', () => {
  let fixture: ComponentFixture<ColumnBrowserComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ColumnBrowserComponent);
    fixture.componentRef.setInput('index', buildIndex(model));
  });

  it('shows only the root column when nothing is selected', () => {
    fixture.detectChanges();
    expect(el().querySelectorAll('.col').length).toBe(1);
    expect(el().querySelectorAll('.row').length).toBe(3); // A, B, Dataset
  });

  it('mounts one column per level on the path to a deep variable and marks the path', () => {
    fixture.componentRef.setInput('selectedId', `${ROOT_ID}/g0/g0/v0`);
    fixture.detectChanges();
    expect(el().querySelectorAll('.col').length).toBe(3); // root, A, A1
    const selected = [...el().querySelectorAll('[aria-selected="true"]')].map((r) =>
      r.querySelector('.nm')!.textContent!.trim(),
    );
    expect(selected).toEqual(['A', 'A1', 'Deep']);
  });

  const mounted: HTMLElement[] = [];

  afterEach(() => {
    mounted.splice(0).forEach((el) => el.remove());
  });

  const mount = (m: Pathology, selectedId: string | null = null, w = 700, h = 240) => {
    // Karma's headless viewport can be <= 767px, which triggers the mobile single-column media query;
    // force desktop column layout on this test host so multi-column horizontal scrolling is exercised.
    const style = document.createElement('style');
    style.textContent =
      '[data-desktop] .col { display: block !important; flex-basis: 272px !important; width: 272px !important; }';
    document.head.appendChild(style);
    mounted.push(style);

    const f = TestBed.createComponent(ColumnBrowserComponent);
    const host = f.nativeElement as HTMLElement;
    host.setAttribute('data-desktop', '');
    host.style.width = `${w}px`;
    host.style.height = `${h}px`;
    document.body.appendChild(host);
    mounted.push(host);
    f.componentRef.setInput('index', buildIndex(m));
    f.componentRef.setInput('selectedId', selectedId);
    f.detectChanges();
    return f;
  };

  it('emits the node id on click', () => {
    fixture.detectChanges();
    const ids: string[] = [];
    fixture.componentInstance.select.subscribe((id) => ids.push(id));
    (el().querySelector('[data-id="root/g1"]') as HTMLElement).click();
    expect(ids).toEqual(['root/g1']);
  });

  it('scrolls to the rightmost column on deep nested groups without calling scrollIntoView', () => {
    const deep: Pathology = {
      uuid: 'd', label: 'Stroke', code: 'stroke', version: '3.7', released: true,
      groups: [{
        label: 'L1', code: 'l1',
        groups: [{
          label: 'L2', code: 'l2',
          groups: [{
            label: 'L3', code: 'l3',
            groups: [{
              label: 'L4', code: 'l4',
              groups: [{ label: 'L5', code: 'l5', variables: [{ label: 'DeepVar', code: 'deep', type: 'nominal' }] }],
              variables: [{ label: 'Var4', code: 'v4', type: 'integer' }],
            }],
          }],
        }],
      }],
    };
    const scrollIntoViewSpy = spyOn(Element.prototype, 'scrollIntoView');
    const f = mount(deep, `${ROOT_ID}/g0/g0/g0/g0`);
    const sc = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('.cols')!;

    expect((f.nativeElement as HTMLElement).querySelectorAll('.col').length).toBe(5);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(sc.scrollWidth).toBeGreaterThan(sc.clientWidth);
    expect(sc.scrollLeft).toBeCloseTo(sc.scrollWidth - sc.clientWidth, 0);

    const scrollToSpy = spyOn(sc, 'scrollTo');
    f.componentRef.setInput('selectedId', `${ROOT_ID}/g0/g0/g0/g0/g0`);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelectorAll('.col').length).toBe(6);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    const expected = sc.scrollWidth - sc.clientWidth;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      expect(sc.scrollLeft).toBeCloseTo(expected, 0);
    } else {
      expect(scrollToSpy).toHaveBeenCalled();
      expect((scrollToSpy.calls.mostRecent().args as unknown[])[0]).toEqual({ left: expected, behavior: 'smooth' });
    }
  });

  it('scrolls a tall column vertically to reveal the selected row without disturbing horizontal scroll', () => {
    const tall: Pathology = {
      uuid: 't', label: 'Tall', code: 'tall', version: '1', released: true,
      variables: Array.from({ length: 15 }, (_, i) => ({ label: `Var ${i}`, code: `v_${i}`, type: 'integer' })),
    };
    const f = mount(tall, `${ROOT_ID}/v14`);
    const host = f.nativeElement as HTMLElement;
    const col = host.querySelector<HTMLElement>('.col')!;
    const sc = host.querySelector<HTMLElement>('.cols')!;
    expect(col.scrollTop).toBeGreaterThan(0);
    expect(sc.scrollLeft).toBe(0);
  });
});
