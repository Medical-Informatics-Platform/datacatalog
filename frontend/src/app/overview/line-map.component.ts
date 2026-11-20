import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { CatalogStore } from '../services/catalog.store';

type Fed = Federation & { pathologies: Pathology[] };

const LX = 230; // x of the first federation line (room for model labels on the left)
const PITCH = 92; // distance between federation lines
const TOP = 64; // headroom for federation codes
const ROW = 26; // one data model per row

/**
 * The federation x data-model matrix drawn as a transit map: each federation is a
 * vertical line, each released model a station row, models shared by several
 * federations become interchange capsules. Built from live data, links into the explorer.
 */
@Component({
  selector: 'mip-line-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h()" role="group" aria-label="Federations and the data models they host">
      @for (r of rows(); track r.m.uuid) {
        <line class="guide" [attr.x1]="LX - 12" [attr.x2]="w() - 10" [attr.y1]="r.y" [attr.y2]="r.y" />
      }
      @for (c of cols(); track c.fed.code) {
        <text class="code" [attr.x]="c.x" [attr.y]="TOP - 30" text-anchor="middle">{{ c.fed.code }}</text>
        @if (c.ys.length) {
          <line class="route" [attr.x1]="c.x" [attr.y1]="c.ys[0]" [attr.x2]="c.x" [attr.y2]="c.ys[c.ys.length - 1]" [style.stroke]="store.lineColor(c.fed.code)" />
        }
      }
      @for (r of rows(); track r.m.uuid) {
        <g class="stn" role="link" tabindex="0" [attr.aria-label]="r.m.label + ' ' + r.m.version + ', hosted by ' + r.hosts.length + ' federation' + (r.hosts.length === 1 ? '' : 's')"
          (click)="open(r)" (keydown.enter)="open(r)">
          <title>{{ r.m.label }} {{ r.m.version }}: {{ r.hostNames }}</title>
          <rect class="hit" x="0" [attr.y]="r.y - ROW / 2" [attr.width]="w()" [attr.height]="ROW" fill="transparent" />
          @if (r.hosts.length > 1) {
            <rect class="cap" [attr.x]="r.hosts[0].x - 9" [attr.y]="r.y - 9" [attr.width]="r.hosts[r.hosts.length - 1].x - r.hosts[0].x + 18" height="18" rx="9" />
          }
          @for (hst of r.hosts; track hst.code) {
            <circle class="dot" [attr.cx]="hst.x" [attr.cy]="r.y" r="5" [style.stroke]="r.hosts.length > 1 ? 'var(--ink)' : store.lineColor(hst.code)" />
          }
          <text class="lbl" [attr.x]="LX - 24" [attr.y]="r.y + 4" text-anchor="end">{{ r.m.label }} <tspan class="ver">{{ r.m.version }}</tspan></text>
        </g>
      }
    </svg>
  `,
  styles: [
    `
      :host { display: block; }
      svg { width: 100%; height: auto; overflow: visible; }
      .code { font: 500 12px var(--font-mono); fill: var(--ink-2); }
      .guide { stroke: var(--hairline); stroke-width: 1; }
      .lbl { font: 500 13px var(--font-sans); fill: var(--ink); }
      .ver { font: 400 11px var(--font-mono); fill: var(--ink-3); }
      .route { stroke-width: 6; stroke-linecap: round; animation: fade var(--dur-3) var(--ease) both; }
      .dot { fill: #fff; stroke-width: 3; }
      .cap { fill: #fff; stroke: var(--ink); stroke-width: 2; }
      .stn { cursor: pointer; }
      .stn:hover .lbl, .stn:focus-visible .lbl { fill: var(--blue); }
      .stn:hover .hit, .stn:focus-visible .hit { fill: rgb(43 51 233 / 0.06); }
      .stn:focus-visible { outline: 2px solid var(--blue); }
      @keyframes fade { from { opacity: 0; } }
    `,
  ],
})
export class LineMapComponent {
  protected store = inject(CatalogStore);
  private router = inject(Router);
  protected readonly TOP = TOP;
  protected readonly LX = LX;
  protected readonly ROW = ROW;

  readonly federations = input.required<Fed[]>();

  /** One row per released model, ordered by the first federation that hosts it. */
  protected rows = computed(() => {
    const feds = this.federations();
    const order: Pathology[] = [];
    const seen = new Set<string>();
    feds.forEach((f) => f.pathologies.forEach((m) => !seen.has(m.uuid) && (seen.add(m.uuid), order.push(m))));
    return order.map((m, i) => {
      const hosts = feds
        .map((f, fi) => ({ code: f.code, title: f.title, x: LX + fi * PITCH, has: f.pathologies.some((p) => p.uuid === m.uuid) }))
        .filter((x) => x.has);
      return { m, y: TOP + i * ROW, hosts, hostNames: hosts.map((x) => x.title).join(', ') };
    });
  });

  protected cols = computed(() =>
    this.federations().map((fed, i) => ({
      fed,
      x: LX + i * PITCH,
      ys: this.rows().filter((r) => r.hosts.some((h) => h.code === fed.code)).map((r) => r.y),
    })),
  );

  protected w = computed(() => LX + Math.max(1, this.federations().length) * PITCH - 20);
  protected h = computed(() => TOP + Math.max(1, this.rows().length) * ROW);

  protected open(r: { m: Pathology; hosts: { code: string }[] }): void {
    this.router.navigate(['/pathology'], {
      queryParams: { federationCode: r.hosts[0]?.code, pathologyCode: r.m.code, version: r.m.version },
    });
  }
}
