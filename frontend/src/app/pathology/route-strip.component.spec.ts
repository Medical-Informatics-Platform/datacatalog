import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Crumb } from '../services/pathology-tree';
import { RouteStripComponent } from './route-strip.component';

describe('RouteStripComponent', () => {
  const mounted: HTMLElement[] = [];

  afterEach(() => {
    mounted.splice(0).forEach((el) => el.remove());
  });

  const mount = (crumbs: Crumb[], width = 360): { fixture: ComponentFixture<RouteStripComponent>; el: HTMLElement } => {
    // Karma's headless viewport can be <= 767px, where mobile styles hide <nav>; force desktop <nav> display.
    const style = document.createElement('style');
    style.textContent = '[data-desktop] nav { display: block !important; }';
    document.head.appendChild(style);
    mounted.push(style);

    const fixture = TestBed.createComponent(RouteStripComponent);
    const el = fixture.nativeElement as HTMLElement;
    el.setAttribute('data-desktop', '');
    el.style.width = `${width}px`;
    document.body.appendChild(el);
    mounted.push(el);
    fixture.componentRef.setInput('crumbs', crumbs);
    fixture.detectChanges();
    return { fixture, el };
  };

  it('wraps labels in .lbl with full title tooltips and ellipsis styling', () => {
    const longLabel = 'Detailed admission imaging information';
    const { el } = mount([
      { id: 'root', label: 'Stroke' },
      { id: 'root/g0', label: longLabel },
      { id: 'root/g0/v0', label: 'Carotid stenosis symptomatic' },
    ]);
    const btns = el.querySelectorAll<HTMLButtonElement>('button.st');
    const lbls = el.querySelectorAll<HTMLElement>('.st .lbl');
    expect(btns[1].getAttribute('title')).toBe(longLabel);
    expect(lbls[1].textContent).toBe(longLabel);
    expect(getComputedStyle(lbls[1]).textOverflow).toBe('ellipsis');
  });

  it('auto-scrolls deep crumbs to reveal the rightmost terminus', () => {
    const deepCrumbs: Crumb[] = [
      { id: 'root', label: 'Stroke' },
      { id: 'root/g0', label: 'Admission imaging' },
      { id: 'root/g0/g0', label: 'Detailed admission imaging information' },
      { id: 'root/g0/g0/g0', label: 'Arterial' },
      { id: 'root/g0/g0/g0/g0', label: 'Arterial imaging segments' },
      { id: 'root/g0/g0/g0/g0/v0', label: 'Carotid stenosis symptomatic' },
    ];
    const { el } = mount(deepCrumbs, 360);
    const nav = el.querySelector<HTMLElement>('nav')!;
    expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);
    expect(nav.scrollLeft).toBeCloseTo(nav.scrollWidth - nav.clientWidth, 0);
  });
});
