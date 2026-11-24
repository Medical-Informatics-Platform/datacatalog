import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Federation } from '../interfaces/federations.interface';
import { formatCount } from '../services/pathology-tree';
import { EUROPE_LAND, HUBS, MAP_H, MAP_W } from './europe-map-data';

/**
 * Hero map: one ringed node per federation on a stylised Europe, joined by a faint
 * nearest-neighbour mesh (no hub, no data-flow implied). Hover or focus highlights a node and
 * its links and shows a tooltip; click scrolls to the federation's card in #federations.
 */
@Component({
  selector: 'mip-europe-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <svg [class.focus]="active()" [attr.viewBox]="'0 0 ' + W + ' ' + H" role="group" aria-label="Map of Europe showing each federation">
        <path class="land" [attr.d]="land" />
        @for (e of edges(); track e.key) {
          <line class="edge" [class.on]="e.a === active() || e.b === active()" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" />
        }
        @for (n of nodes(); track n.fed.code) {
          <g class="node" [class.on]="n.fed.code === active()" [class.open]="!n.fed.institutions" role="link" tabindex="0"
            [attr.aria-label]="n.fed.title + ': ' + n.institutions + ' institutions, ' + n.records + ' patient records. Go to federation.'"
            (mouseenter)="active.set(n.fed.code)" (mouseleave)="active.set(null)"
            (focus)="active.set(n.fed.code)" (blur)="active.set(null)"
            (click)="go(n.fed.code)" (keydown.enter)="go(n.fed.code)">
            <circle class="hit" [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r + 10" />
            <circle class="halo" [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r + 5" />
            <circle class="ring" [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r" />
            <circle class="core" [attr.cx]="n.x" [attr.cy]="n.y" r="3" />
          </g>
        }
      </svg>
      @if (tip(); as t) {
        <div class="tip" role="tooltip" [class.below]="t.below" [style.left.%]="t.left" [style.top.%]="t.top">
          <strong>{{ t.fed.title }}</strong>
          <span>{{ t.fed.institutions ? t.institutions + ' institutions' : 'No hospital sites' }} · {{ t.records }} patient records</span>
          <small>Indicative hub location</small>
        </div>
      }
      <figcaption class="badge"><span class="live" aria-hidden="true"></span>Live metadata · {{ federations().length }} European federations · {{ total() }} institutions@if (unmapped()) { · {{ unmapped() }} not shown }</figcaption>
    </figure>
  `,
  styles: [
    `
      :host { display: block; }
      figure { position: relative; margin: 0; }
      svg { display: block; width: 100%; height: auto; mask-image: radial-gradient(ellipse 85% 85% at 50% 52%, #000 70%, transparent 100%); }
      .land { fill: var(--sunken); stroke: var(--border); stroke-width: 0.8; stroke-linejoin: round; }
      .edge { stroke: var(--border-strong); stroke-width: 1; opacity: 0.6; transition: stroke var(--dur) var(--ease), opacity var(--dur) var(--ease); }
      .focus .edge:not(.on) { opacity: 0.2; }
      .edge.on { stroke: var(--blue); stroke-width: 1.5; opacity: 1; }
      .node { cursor: pointer; outline: none; }
      .hit { fill: transparent; }
      .halo { fill: var(--blue); opacity: 0.1; transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease); transform-box: fill-box; transform-origin: center; }
      .ring { fill: var(--surface); stroke: var(--blue); stroke-width: 2; }
      .open .ring { stroke-dasharray: 3 3; }
      .tip small { color: var(--ink-3); font-size: 0.6875rem; }
      .core { fill: var(--blue); }
      .node.on .halo, .node:focus-visible .halo { opacity: 0.22; transform: scale(1.35); }
      .node:focus-visible .ring { stroke: var(--blue-d); stroke-width: 3; }
      .tip {
        position: absolute; transform: translate(-50%, calc(-100% - 26px)); pointer-events: none;
        display: grid; gap: 2px; padding: 8px 12px; min-width: 11rem; max-width: 16rem;
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        box-shadow: var(--shadow-overlay); font-size: 0.8125rem; color: var(--ink-2);
      }
      .tip.below { transform: translate(-50%, 26px); }
      .tip strong { color: var(--ink); font-size: 0.875rem; line-height: 1.3; }
      .badge {
        position: absolute; left: 0; bottom: 0; display: inline-flex; align-items: center; gap: 8px;
        padding: 5px 10px; border: 1px solid var(--border); border-radius: 999px;
        background: color-mix(in srgb, var(--surface) 88%, transparent); color: var(--ink-3); font-size: 0.75rem;
      }
      .live { width: 7px; height: 7px; border-radius: 50%; background: var(--line-4); }
    `,
  ],
})
export class EuropeMapComponent {
  readonly federations = input.required<Federation[]>();

  protected readonly W = MAP_W;
  protected readonly H = MAP_H;
  protected readonly land = EUROPE_LAND;
  protected readonly active = signal<string | null>(null);

  protected total = computed(() => formatCount(this.federations().reduce((n, f) => n + (Number(f.institutions) || 0), 0)));

  protected unmapped = computed(() => this.federations().length - this.nodes().length);

  /** Node radius grows with sqrt(institutions) so the 17-hospital network reads bigger than the 1-hospital one. */
  protected nodes = computed(() =>
    this.federations()
      .filter((f) => HUBS[f.code])
      .map((fed) => ({
        fed,
        x: HUBS[fed.code][0],
        y: HUBS[fed.code][1],
        r: 6 + 1.5 * Math.sqrt(Number(fed.institutions) || 0),
        institutions: formatCount(fed.institutions),
        records: formatCount(fed.records),
      })),
  );

  /** Each node links to its two nearest neighbours; keeps the mesh sparse and hub-less. */
  protected edges = computed(() => {
    const ns = this.nodes();
    const seen = new Map<string, { key: string; a: string; b: string; x1: number; y1: number; x2: number; y2: number }>();
    for (const n of ns) {
      ns.filter((m) => m !== n)
        .sort((p, q) => Math.hypot(p.x - n.x, p.y - n.y) - Math.hypot(q.x - n.x, q.y - n.y))
        .slice(0, 2)
        .forEach((m) => {
          const [a, b] = [n, m].sort((p, q) => p.fed.code.localeCompare(q.fed.code));
          const key = a.fed.code + '|' + b.fed.code;
          seen.set(key, { key, a: a.fed.code, b: b.fed.code, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        });
    }
    return [...seen.values()];
  });

  protected tip = computed(() => {
    const n = this.nodes().find((x) => x.fed.code === this.active());
    return n && { ...n, left: (n.x / MAP_W) * 100, top: (n.y / MAP_H) * 100, below: n.y < MAP_H * 0.3 };
  });

  protected go(code: string): void {
    // card may be filtered out of the directory: fall back to the section
    const el = document.getElementById('fed-' + code) ?? document.getElementById('federations');
    if (!el) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }
}
