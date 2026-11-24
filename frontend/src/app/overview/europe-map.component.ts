import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Federation } from '../interfaces/federations.interface';
import { formatCount } from '../services/pathology-tree';
import { FEDERATION_DATASETS } from './federation-footprint';
import { EUROPE_LAND, MAP_H, MAP_W } from './europe-map-data';

const LANE = 12;

interface Route {
  fed: Federation;
  siteNames: string;
  note: string | undefined;
  countryLevel: boolean;
  d: string;
  pts: readonly (readonly [number, number, number])[];
  color: string;
  open: boolean;
  institutionsLabel: string;
  records: string;
  aria: string;
  left: number;
  top: number;
  below: boolean;
}

/**
 * Hero map: each federation is a network of dataset sites linked in its line
 * colour. Sites come from the federation's published description; shared sites
 * get separate lanes so no dataset hides another. Hover or focus highlights a
 * network and shows a tooltip; click scrolls to its card. Federations with no
 * published locations are counted but not drawn.
 */
@Component({
  selector: 'mip-europe-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <svg [class.focus]="active()" [attr.viewBox]="'0 0 ' + W + ' ' + H" role="group" aria-label="Map of Europe showing each federation's dataset network">
        <path class="land" [attr.d]="land" />
        @for (r of routes(); track r.fed.code) {
          <g class="route" [class.on]="r.fed.code === active()" [class.open]="r.open" role="link" tabindex="0"
            [attr.aria-label]="r.aria"
            (mouseenter)="active.set(r.fed.code)" (mouseleave)="active.set(null)"
            (focus)="active.set(r.fed.code)" (blur)="active.set(null)"
            (click)="go(r.fed.code)" (keydown.enter)="go(r.fed.code)">
            <path class="hit-line" [attr.d]="r.d" />
            @for (p of r.pts; track $index) {
              <circle class="hit-dot" [attr.cx]="p[0]" [attr.cy]="p[1]" [attr.r]="p[2]" />
            }
            <path class="line" [attr.d]="r.d" [attr.stroke]="r.color" />
            @for (p of r.pts; track $index) {
              <circle class="focus-ring" [attr.cx]="p[0]" [attr.cy]="p[1]" r="9" />
              <circle class="station" [attr.cx]="p[0]" [attr.cy]="p[1]" r="4.5" [attr.stroke]="r.color" />
            }
            <text class="code" [attr.x]="r.pts[0][0] + (r.pts[0][0] < W / 3 ? -8 : 8)" [attr.y]="r.pts[0][1] + 4" [attr.text-anchor]="r.pts[0][0] < W / 3 ? 'end' : 'start'">{{ r.fed.code }}</text>
          </g>
        }
      </svg>
      @if (tip(); as t) {
        <div class="tip" role="tooltip" aria-hidden="true" [class.below]="t.below" [style.left.%]="t.left" [style.top.%]="t.top">
          <strong>{{ t.fed.title }}</strong>
          <span>{{ t.institutionsLabel }} · {{ t.records }} patient records</span>
          <small>Dataset sites: {{ t.siteNames }}@if (t.countryLevel) { · country-level, cities not published }</small>
          @if (t.note) { <small>{{ t.note }}</small> }
        </div>
      }
      <figcaption class="badge"><span class="live" aria-hidden="true"></span>Live totals · {{ federations().length }} federations · {{ total() }} institutions · sites indicative@if (unmapped()) { · {{ unmapped() }} not mapped }</figcaption>
    </figure>
  `,
  styles: [
    `
      :host { display: block; }
      figure { position: relative; margin: 0; }
      svg { display: block; width: 100%; height: auto; mask-image: radial-gradient(ellipse 85% 85% at 50% 52%, #000 70%, transparent 100%); }
      .land { fill: var(--sunken); stroke: var(--border); stroke-width: 0.8; stroke-linejoin: round; }
      .route { cursor: pointer; outline: none; transition: opacity var(--dur) var(--ease); }
      @media (prefers-reduced-motion: reduce) { .route { transition: none; } }
      .focus .route:not(.on) { opacity: 0.25; }
      .hit-line, .hit-dot { fill: none; stroke: transparent; }
      .hit-line { stroke-width: 16; pointer-events: stroke; }
      .hit-dot { fill: transparent; pointer-events: all; }
      .line { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
      .route.on .line { stroke-width: 4.5; }
      .focus-ring { fill: none; stroke: var(--ink); stroke-width: 1; opacity: 0; pointer-events: none; }
      .route:focus-visible .focus-ring { opacity: 1; }
      .station { fill: var(--surface); stroke-width: 1.8; }
      .route.on .station { stroke-width: 2.6; }
      .open .station { stroke-dasharray: 2 2; }
      .code { font: 600 11px var(--font-mono); fill: var(--ink); paint-order: stroke; stroke: var(--surface); stroke-width: 3; stroke-linejoin: round; }
      .route:focus-visible .line { stroke-width: 5; }
      .route:focus-visible .station { stroke-width: 3; }
      .tip {
        position: absolute; transform: translate(-50%, calc(-100% - 26px)); pointer-events: none;
        display: grid; gap: 2px; padding: 8px 12px; min-width: 11rem; max-width: 16rem;
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        box-shadow: var(--shadow-overlay); font-size: 0.8125rem; color: var(--ink-2);
      }
      .tip.below { transform: translate(-50%, 26px); }
      .tip strong { color: var(--ink); font-size: 0.875rem; line-height: 1.3; }
      .tip small { color: var(--ink-3); font-size: 0.6875rem; }
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
  readonly lineColors = input<ReadonlyMap<string, string>>(new Map());

  protected readonly W = MAP_W;
  protected readonly H = MAP_H;
  protected readonly land = EUROPE_LAND;
  protected readonly active = signal<string | null>(null);

  protected total = computed(() => formatCount(this.federations().reduce((n, f) => n + (Number(f.institutions) || 0), 0)));

  protected unmapped = computed(() => this.federations().length - this.routes().length);

  protected routes = computed<Route[]>(() => {
    const mapped = [...this.federations()]
      .sort((a, b) => a.code.localeCompare(b.code))
      .filter((f) => Object.hasOwn(FEDERATION_DATASETS, f.code) && FEDERATION_DATASETS[f.code].sites.length);
    // Shared sites get one lane per federation so no dataset station hides another.
    const lanes = new Map<string, string[]>();
    for (const f of mapped) {
      for (const s of FEDERATION_DATASETS[f.code].sites) lanes.set(s.key, [...(lanes.get(s.key) ?? []), f.code]);
    }
    return mapped.map((fed) => {
      const network = FEDERATION_DATASETS[fed.code];
      const pts = network.sites.map((s) => {
        const lane = lanes.get(s.key)!;
        const offset = (lane.indexOf(fed.code) - (lane.length - 1) / 2) * LANE;
        // Shared sites only get a half-lane hit target so they cannot steal a neighbour's hover.
        return [s.x, s.y + offset, lane.length > 1 ? LANE / 2 : 12] as const;
      });
      const open = !Number(fed.institutions);
      const siteNames = network.sites.map((s) => s.label).join(', ');
      const countryLevel = network.sites.some((s) => s.precision === 'country');
      const institutionsLabel = open ? 'No member institutions' : formatCount(fed.institutions) + ' institutions';
      const records = formatCount(fed.records);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      // Anchor the tooltip outside the whole network, not over its middle.
      const below = Math.min(...ys) < MAP_H * 0.3;
      const x = (Math.min(...xs) + Math.max(...xs)) / 2;
      const y = below ? Math.max(...ys) : Math.min(...ys);
      return {
        fed,
        siteNames,
        note: network.note,
        countryLevel,
        d: pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' '),
        pts,
        color: this.lineColors().get(fed.code) ?? 'var(--ink-3)',
        open,
        institutionsLabel,
        records,
        aria: `${fed.title}: ${institutionsLabel}, ${records} patient records. Dataset sites: ${siteNames}${countryLevel ? '; country-level, cities not published' : ''}${network.note ? '; ' + network.note : ''}. Sites from published descriptions, indicative. Go to federation.`,
        left: (x / MAP_W) * 100,
        top: (y / MAP_H) * 100,
        below,
      };
    });
  });

  protected tip = computed(() => this.routes().find((x) => x.fed.code === this.active()));

  protected go(code: string): void {
    // card may be filtered out of the directory: fall back to the section
    const el = document.getElementById('fed-' + code) ?? document.getElementById('federations');
    if (!el) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }
}
