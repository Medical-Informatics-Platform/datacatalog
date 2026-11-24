import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { CatalogStore } from '../services/catalog.store';
import { formatCount, modelSize, modelsFor } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';

type Kind = 'all' | 'cross' | 'long';

/**
 * Landing state of the explorer: a ruled list of every data model, versions grouped under their
 * model, with one federation column per line (a station dot where that federation hosts the version).
 */
@Component({
  selector: 'mip-model-picker',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound(); as code) {
      <div class="banner" role="status"><span>Federation <code>{{ code }}</code> not found — showing all data models.</span></div>
    }
    @if (miss(); as m) {
      <div class="banner" role="status"><span><code>{{ m }}</code> is not part of {{ federation()?.title }}.</span></div>
    }
    <header>
      <h2>@if (federation(); as f) { Data models in {{ f.title }} } @else { Choose a data model }</h2>
      <p class="meta muted num">{{ rows().length }} data model{{ rows().length === 1 ? '' : 's' }} in {{ families().length }} {{ families().length === 1 ? 'family' : 'families' }}</p>
      <div class="ctl">
        <div class="search">
          <mip-icon name="search" />
          <input class="input" type="search" aria-label="Filter data models" placeholder="Filter models   ( / )" [value]="text()" (input)="text.set($any($event.target).value)" />
        </div>
        @if (hasLong()) {
          <div class="seg" role="group" aria-label="Show">
            @for (k of kinds; track k.v) { <button type="button" [attr.aria-pressed]="kind() === k.v" (click)="kind.set(k.v)">{{ k.l }}</button> }
          </div>
        }
      </div>
      @if (federation()) {
        <nav class="links" aria-label="Federation scope">
          <a class="back" routerLink="/" fragment="federations"><mip-icon name="left" [size]="14" /> Federations</a>
          <button class="back" type="button" (click)="showAll.emit()">Show all federations</button>
        </nav>
      }
    </header>

    @if (sections().length) {
      <div class="sheet">
        <div class="r th" aria-hidden="true"><span>Data model</span><span class="r-num">Variables</span><span class="r-num">Groups</span></div>
        @for (s of sections(); track s.title) {
          <section [attr.aria-label]="s.title">
            @if (sections().length > 1) { <h3>{{ s.title }} <span class="num">{{ s.count }}</span></h3> }
            @for (c of s.cards; track c.key) {
              @if (c.versions.length > 1) {
                <div class="r fam"><strong>{{ c.label }}</strong> <code class="muted">{{ c.code }}</code></div>
              }
              @for (v of c.versions; track v.m.uuid) {
                <a class="r row" [class.sub]="c.versions.length > 1" routerLink="/pathology" queryParamsHandling="merge"
                  [queryParams]="{ pathologyCode: v.m.code ?? v.m.label, version: v.m.version ?? null, latest: null, node: null }">
                  <span class="nm">
                    @if (c.versions.length === 1) { <strong>{{ c.label }}</strong> }
                    <span class="mono" [class.muted]="c.versions.length === 1">{{ v.m.version }}</span>
                    @if (expert() && !v.m.released) { <span class="badge badge-draft">Draft</span> }
                  </span>
                  <span class="num r-num">{{ n(v.size.variables) }}</span>
                  <span class="num r-num">{{ n(v.size.groups) }}</span>
                </a>
              }
            }
          </section>
        }
      </div>
    } @else {
      <div class="banner" role="status">
        @if (text().trim()) {
          <span>No data model matches “{{ text().trim() }}”.</span><button class="btn btn-sm" type="button" (click)="text.set(''); kind.set('all')">Clear filter</button>
        } @else if (federation()) {
          <span>{{ federation()!.title }} has no released data models yet.</span>
        } @else {
          <span>No data models in the catalog yet.</span>
        }
      </div>
    }
  `,
  styles: [
    `
      :host { display: grid; gap: 20px; align-content: start; padding: 28px var(--gutter) 40px; width: 100%; max-width: 1520px; margin-inline: auto; }
      header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 20px; }
      h2 { font-size: 1.5rem; line-height: 1.2; }
      .meta { font-size: 0.9375rem; }
      .ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-left: auto; align-self: center; }
      .links { display: flex; flex-wrap: wrap; gap: 8px 16px; width: 100%; }
      .back { display: inline-flex; align-items: center; gap: 6px; padding: 4px 0; border: 0; background: none; color: var(--blue); font-size: 0.875rem; font-weight: 500; text-decoration: none; cursor: pointer; }
      .back:hover { text-decoration: underline; text-underline-offset: 3px; }
      .search { position: relative; flex: 0 1 340px; min-width: 220px; }
      .search mip-icon { position: absolute; left: 12px; top: 9px; color: var(--ink-3); pointer-events: none; }
      .search .input { padding-left: 38px; min-height: 36px; padding-block: 4px; }
      .seg { flex: none; } .seg button { white-space: nowrap; }

      .sheet { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
      .r { display: grid; grid-template-columns: minmax(200px, 1fr) 7rem 6rem; align-items: center; column-gap: 16px; padding-left: 16px; }
      .th { align-items: center; min-height: 36px; background: var(--canvas); border-bottom: 1px solid var(--border-strong); font-size: 0.8125rem; font-weight: 600; color: var(--ink-2); }
      section h3 { padding: 14px 16px 6px; font-size: 0.8125rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-2); display: flex; gap: 8px; border-top: 1px solid var(--border); background: var(--canvas); }
      section:first-of-type h3 { border-top: 0; }
      .fam { min-height: 40px; padding-top: 8px; border-top: 1px solid var(--hairline); display: flex; gap: 12px; align-items: baseline; }
      .fam strong { font-size: 1rem; }
      .row { min-height: 42px; color: var(--ink); text-decoration: none; border-top: 1px solid var(--hairline); font-size: 0.875rem; transition: background var(--dur) var(--ease); }
      .row.sub { min-height: 34px; border-top: 0; }
      .row.sub .nm { padding-left: 20px; }
      .row:hover { background: var(--hover); color: var(--ink); }
      .row:hover strong { color: var(--blue); }
      .row:focus-visible { outline-offset: -2px; }
      .r-num { text-align: right; padding-right: 8px; }
      .nm { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; min-width: 0; overflow-wrap: anywhere; }
      .nm strong { font-size: 1rem; }
      .sub .nm .mono { font-weight: 600; color: var(--blue-d); }
      @media (min-width: 900px) { .ctl { flex-wrap: nowrap; } }
      @media (max-width: 760px) {
        .r { column-gap: 8px; padding-left: 12px; grid-template-columns: minmax(0, 1fr) 4.5rem 3.5rem; }
        .ctl { margin-left: 0; width: 100%; } .search { flex-basis: 100%; }
      }
    `,
  ],
})
export class ModelPickerComponent {
  protected store = inject(CatalogStore);

  readonly models = input.required<Pathology[]>();
  readonly federation = input<Federation | undefined>();
  /** Raw ?federationCode= from the URL, even when it does not resolve. */
  readonly federationCode = input<string | null>(null);
  readonly expert = input(false);
  readonly miss = input<string | null>(null);
  readonly showAll = output<void>();

  protected notFound = computed(() => {
    const code = this.federationCode();
    return code && this.store.state() === 'ready' && !this.federation() ? code : null;
  });

  protected text = signal('');
  protected kind = signal<Kind>('all');
  protected kinds: { v: Kind; l: string }[] = [
    { v: 'all', l: 'All' }, { v: 'cross', l: 'Cross-sectional' }, { v: 'long', l: 'Longitudinal' },
  ];
  protected n = formatCount;

  /** One row per model version with its size and the federations that host it (searchable). */
  protected rows = computed(() => {
    const feds = this.store.federations();
    const fed = this.federation();
    const list = fed ? modelsFor(this.models(), fed) : this.models();
    return list.map((m) => ({
      m,
      size: modelSize(m),
      hostTitles: feds.filter((f) => f.dataModelIds?.includes(m.uuid)).map((f) => f.title).join(' '),
    }));
  });

  protected families = computed(() => this.group(this.rows()));
  protected hasLong = computed(() => this.rows().some((r) => r.m.longitudinal) && this.rows().some((r) => !r.m.longitudinal));

  protected sections = computed(() => {
    const q = this.text().trim().toLowerCase();
    const rows = this.rows().filter((r) => !q || `${r.m.label} ${r.m.code} ${r.m.version} ${r.hostTitles}`.toLowerCase().includes(q));
    return [
      { title: 'Cross-sectional', rows: rows.filter((r) => !r.m.longitudinal), on: this.kind() !== 'long' },
      { title: 'Longitudinal', rows: rows.filter((r) => r.m.longitudinal), on: this.kind() !== 'cross' },
    ]
      .filter((s) => s.on && s.rows.length)
      .map((s) => ({ title: s.title, cards: this.group(s.rows), count: s.rows.length }));
  });

  private group(rows: ReturnType<typeof this.rows>) {
    const by = new Map<string, { key: string; label: string; code: string; versions: typeof rows }>();
    for (const r of rows) {
      const key = (r.m.code ?? r.m.label).toLowerCase();
      const g = by.get(key) ?? { key, label: r.m.label, code: r.m.code ?? '', versions: [] };
      g.versions.push(r);
      by.set(key, g);
    }
    return [...by.values()]
      .map((g) => ({ ...g, versions: g.versions.sort((a, b) => (b.m.version ?? '').localeCompare(a.m.version ?? '', undefined, { numeric: true })) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}
