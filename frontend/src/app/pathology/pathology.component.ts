import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogStore } from '../services/catalog.store';
import { PathologyService } from '../services/pathology.service';
import {
  KindFilter, ROOT_ID, buildIndex, modelsFor, resolvePathology, searchNodes,
} from '../services/pathology-tree';
import { SessionService } from '../services/session.service';
import { LayoutService } from '../shell/layout.service';
import { ConfirmService } from '../ui/confirm.service';
import { IconComponent } from '../ui/icon.component';
import { toProblem } from '../ui/http-error';
import { ToastService } from '../ui/toast.service';
import { ColumnBrowserComponent } from './column-browser.component';
import { ContextBarComponent, ModelAction } from './context-bar.component';
import { IndexTableComponent } from './index-table.component';
import { InspectorComponent } from './inspector.component';
import { ModelDrawerComponent } from './model-drawer.component';
import { ModelPickerComponent } from './model-picker.component';
import { ResultListComponent } from './result-list.component';
import { RouteStripComponent } from './route-strip.component';
import { TreeViewComponent } from './tree-view.component';

const CAP = 200;

/**
 * Explorer. The URL is the single source of truth for federation, model and
 * selected node; every region (columns, route, inspector) is derived from it.
 */
@Component({
  selector: 'mip-pathology',
  standalone: true,
  imports: [
    ContextBarComponent, ColumnBrowserComponent, RouteStripComponent, InspectorComponent, ResultListComponent, TreeViewComponent,
    IndexTableComponent, IconComponent, ModelPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'keys($event)', '[class.focus]': 'layout.focus()' },
  template: `
    <mip-context-bar
      [federations]="store.federations()" [federation]="fed()" [models]="models()" [model]="model()"
      [expert]="session.isExpert()" [stats]="stats()"
      (federationChange)="setFederation($event)" (modelChange)="setModel($event)" (clearModel)="clearModel()" (exportAs)="exportModel($event)"
      (action)="act($event)" />

    @switch (true) {
      @case (store.state() === 'error') {
        <div class="state"><div class="banner error" role="alert"><span>Data models didn't load.</span><button class="btn btn-sm" type="button" (click)="store.load()">Retry</button></div></div>
      }
      @case (store.state() !== 'ready') {
        <div class="work" aria-busy="true">
          <div class="skeleton"><div class="skel" style="height:34px;width:60%;margin:14px"></div>@for (i of [1,2,3,4,5,6,7,8]; track i) { <div class="skel" style="height:28px;margin:10px 14px"></div> }</div>
          <div class="insp"></div>
        </div>
      }
      @case (!model()) {
        <div class="state">
          <mip-model-picker [models]="models()" [federation]="fed()" [expert]="session.isExpert()" [miss]="scopeMiss()" (showAll)="setFederation('')" />
        </div>
      }
      @default {
        @let ix = index()!;
        <div class="tools">
          <div class="search">
            <mip-icon name="search" />
            <input #q class="input" type="search" [attr.aria-label]="'Search ' + (ix.nodes.size - 1) + ' variables and groups'" placeholder="Search variables and groups"
              [value]="text()" (input)="text.set($any($event.target).value); matchIdx.set(-1)" (keydown.escape)="clearSearch()"
              (keydown.enter)="step($event, 1)" (keydown.shift.enter)="step($event, -1)" />
            @if (text()) {
              <button class="x" type="button" aria-label="Clear search" (click)="text.set(''); matchIdx.set(-1); q.focus()"><mip-icon name="x" [size]="14" /></button>
            } @else {
              <kbd aria-hidden="true">/</kbd>
            }
          </div>
          <span class="rule" aria-hidden="true"></span>
          <div class="seg" role="group" aria-label="Show">
            @for (k of kinds; track k.v) { <button type="button" [attr.aria-pressed]="kind() === k.v" (click)="setKind(k.v)">{{ k.l }}</button> }
          </div>
          <div class="seg types" role="group" aria-label="Data type" [style.visibility]="kind() === 'group' ? 'hidden' : null" [attr.inert]="kind() === 'group' ? '' : null">
            @for (t of ix.variableTypes; track t) {
              <button type="button" [attr.aria-pressed]="type() === t" [attr.aria-label]="t + ', ' + (typeCounts().get(t) ?? 0)" (click)="setType(t)">
                <span class="tglyph" [class]="'tglyph t-' + t">{{ t[0].toUpperCase() }}</span><span class="tl">{{ t }}</span><span class="cnt num">{{ typeCounts().get(t) ?? 0 }}</span>
              </button>
            }
          </div>
          @if (active()) {
            <button class="btn btn-ghost btn-sm" type="button" (click)="clearFilters(q)">Clear</button>
            <p class="hits muted num" aria-live="polite">{{ matchIdx() >= 0 ? matchIdx() + 1 + ' of ' : '' }}{{ results().length }}{{ capped() ? '+' : '' }} match{{ results().length === 1 ? '' : 'es' }}</p>
          }
          <div class="seg view" role="group" aria-label="View">
            <button type="button" [attr.aria-pressed]="view() === 'browse'" (click)="setView('browse')"><mip-icon name="columns" [size]="15" /> <span>Browse</span></button>
            <button type="button" [attr.aria-pressed]="view() === 'index'" (click)="setView('index')"><mip-icon name="table" [size]="15" /> <span>Index</span></button>
            <button type="button" [attr.aria-pressed]="view() === 'tree'" (click)="setView('tree')"><mip-icon name="tree" [size]="15" /> <span>Tree</span></button>
          </div>
        </div>
        <div class="route" [class.hide]="view() === 'index' || (view() === 'browse' && active())" [class.notree]="view() === 'tree'" [class.rootonly]="!node()">
          <mip-route-strip [crumbs]="node()?.path ?? ix.nodes.get(ix.rootId)!.path" [color]="color()" (go)="select($event)" />
          @if (node()) { <button class="btn btn-ghost btn-sm" type="button" (click)="select(null)">Collapse to model</button> }
        </div>

        <div class="work">
          <div class="main">
            @if (view() === 'index') {
              <mip-index-table [rows]="indexRows()" [query]="text()" (pick)="jump($event)" />
            } @else if (view() === 'tree') {
              <mip-tree-view [index]="ix" [selectedId]="selectedId()" [matchIds]="matchIds()" [searching]="active()" [color]="color()" [version]="model()?.version ?? ''" [focusNonce]="nonce()" (select)="select($event)" />
            } @else if (active()) {
              <mip-result-list [results]="results()" [query]="text()" [capped]="capped()" (pick)="jump($event)" />
            } @else {
              <mip-column-browser [index]="ix" [selectedId]="selectedId()" [flash]="flash()" [focusNonce]="nonce()" [style.--line]="color()" (select)="select($event)" />
            }
          </div>
          <aside class="insp" [class.open]="node()?.kind === 'variable'" aria-label="Details">
            <button class="btn btn-sm closer" type="button" (click)="closeInspector()"><mip-icon name="x" [size]="16" /> Close</button>
            <mip-inspector [index]="ix" [node]="node()" [model]="model()" [link]="link()" (open)="jump($event)" />
          </aside>
        </div>
      }
    }
  `,
  styleUrl: './pathology.component.css',
})
export class PathologyComponent implements OnInit, OnDestroy {
  protected store = inject(CatalogStore);
  protected session = inject(SessionService);
  protected layout = inject(LayoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(Dialog);
  private confirmSvc = inject(ConfirmService);
  private pathologySvc = inject(PathologyService);
  private toast = inject(ToastService);

  private qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected kinds: { v: KindFilter; l: string }[] = [
    { v: 'all', l: 'All' }, { v: 'variable', l: 'Variables' }, { v: 'group', l: 'Groups' },
  ];
  protected text = signal('');
  protected kind = signal<KindFilter>('all');
  protected type = signal('');
  protected matchIdx = signal(-1);
  protected view = computed<'browse' | 'index' | 'tree'>(() => {
    const v = this.qp().get('view');
    return v === 'index' || v === 'tree' ? v : 'browse';
  });
  protected matchIds = computed(() => (this.active() ? this.results().map((n) => n.id) : []));
  protected flash = signal<string | null>(null);
  protected nonce = signal(0);

  protected fed = computed(() => this.store.federations().find((f) => f.code === this.qp().get('federationCode')));
  protected models = computed(() => modelsFor(this.store.visibleModels(), this.fed()));
  protected model = computed(() =>
    resolvePathology(this.models(), this.qp().get('pathologyCode'), this.qp().get('latest') === 'true', this.qp().get('version')) ?? null,
  );
  /** pathologyCode names a model that exists, but not inside the selected federation. */
  protected scopeMiss = computed(() => {
    const code = this.qp().get('pathologyCode');
    return code && !this.model() && this.fed() && resolvePathology(this.store.visibleModels(), code, true) ? code : null;
  });
  protected index = computed(() => (this.model() ? buildIndex(this.model()!) : null));
  protected selectedId = computed(() => {
    const n = this.qp().get('node');
    const id = n ? `${ROOT_ID}/${n}` : null;
    return id && this.index()?.nodes.has(id) ? id : null;
  });
  protected node = computed(() => (this.selectedId() ? this.index()!.nodes.get(this.selectedId()!)! : null));
  protected color = computed(() => (this.fed() ? this.store.lineColor(this.fed()!.code) : 'var(--blue)'));

  protected active = computed(() => !!this.text().trim() || this.kind() !== 'all' || !!this.type());
  protected results = computed(() => {
    const ix = this.index();
    return ix ? searchNodes(ix, { text: this.text(), kind: this.kind(), type: this.type() }, CAP) : [];
  });
  protected capped = computed(() => this.results().length >= CAP);
  protected indexRows = computed(() => {
    const ix = this.index();
    return ix ? searchNodes(ix, { text: this.text(), kind: this.kind(), type: this.type() }, 100000) : [];
  });
  protected stats = computed(() => {
    const ix = this.index();
    if (!ix) return '';
    const root = ix.nodes.get(ix.rootId)!;
    const groups = [...ix.nodes.values()].filter((n) => n.kind === 'group' && n.parentId).length;
    const depth = Math.max(0, ...[...ix.nodes.values()].map((n) => n.depth));
    return `${root.totalVariables} variables · ${groups} groups · depth ${depth}`;
  });
  protected link = computed(() => {
    this.qp();
    return location.href;
  });

  ngOnInit(): void {
    this.store.ensureLoaded();
  }

  ngOnDestroy(): void {
    this.layout.focus.set(false);
  }

  private nav(params: Record<string, string | null>, replace = false): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: replace });
  }

  protected setFederation(code: string): void {
    const f = this.store.federations().find((x) => x.code === code);
    const keep = this.model() && modelsFor(this.store.visibleModels(), f).some((m) => m.uuid === this.model()!.uuid);
    this.nav({ federationCode: code || null, ...(keep ? {} : { pathologyCode: null, version: null, latest: null, node: null }) });
    this.clearSearch();
  }

  protected setModel(uuid: string): void {
    const m = this.models().find((x) => x.uuid === uuid);
    if (!m) return;
    this.nav({ pathologyCode: m.code ?? m.label, version: m.version ?? null, latest: null, node: null });
    this.clearSearch();
  }

  protected clearModel(): void {
    this.nav({ pathologyCode: null, version: null, latest: null, node: null });
    this.clearSearch();
  }

  protected select(id: string | null): void {
    this.flash.set(null);
    this.nav({ node: id && id !== ROOT_ID ? id.slice(ROOT_ID.length + 1) : null }, true);
  }

  /** Groups have no data type, so Groups clears the type and picking a type implies Variables. */
  protected setKind(k: KindFilter): void {
    this.kind.set(k);
    if (k === 'group') this.type.set('');
  }

  protected setType(t: string): void {
    this.type.set(this.type() === t ? '' : t);
    if (this.type()) this.kind.set('variable');
  }

  protected typeCounts = computed(() => {
    const out = new Map<string, number>();
    for (const n of this.index()?.nodes.values() ?? []) if (n.kind === 'variable') out.set(n.type, (out.get(n.type) ?? 0) + 1);
    return out;
  });

  protected clearFilters(q: HTMLInputElement): void {
    this.clearSearch();
    this.matchIdx.set(-1);
    q.focus();
  }

  protected setView(v: 'browse' | 'index' | 'tree'): void {
    this.nav({ view: v === 'browse' ? null : v }, true);
  }

  /** Enter / Shift+Enter in the search box step through matches (Tree view keeps the picture). */
  protected step(e: Event, dir: 1 | -1): void {
    const r = this.results();
    if (this.view() !== 'tree' || !r.length) return;
    e.preventDefault();
    const i = (this.matchIdx() + dir + r.length) % r.length;
    this.matchIdx.set(i);
    this.select(r[i].id);
  }

  protected jump(id: string): void {
    this.clearSearch();
    this.nav({ node: id !== ROOT_ID ? id.slice(ROOT_ID.length + 1) : null, ...(this.view() === 'index' ? { view: null } : {}) }, true);
    this.flash.set(id);
    this.nonce.update((n) => n + 1);
  }

  protected closeInspector(): void {
    this.select(this.node()?.parentId ?? null);
  }

  protected clearSearch(): void {
    this.text.set('');
    this.kind.set('all');
    this.type.set('');
  }

  protected exportModel(type: 'json' | 'xlsx'): void {
    const m = this.model();
    if (m) this.pathologySvc.exportPathology(m, type);
  }

  protected async act(a: ModelAction): Promise<void> {
    const m = this.model();
    if (a === 'import') {
      this.dialog.open(ModelDrawerComponent, { panelClass: 'mip-drawer-host', data: {} });
    } else if (a === 'update' && m) {
      this.dialog.open(ModelDrawerComponent, { panelClass: 'mip-drawer-host', data: { model: m } });
    } else if (a === 'release' && m) {
      const ok = await this.confirmSvc.confirm({
        title: `Release ${m.label} ${m.version}?`,
        message: 'Released data models become visible to everyone in the public catalog and can be linked to federations.',
        confirmLabel: 'Release data model',
      });
      if (ok) this.run(this.pathologySvc.releasePathology(m.uuid), 'Data model released', 'release the data model');
    } else if (a === 'delete' && m) {
      const ok = await this.confirmSvc.confirm({
        title: `Delete ${m.label} ${m.version}?`,
        message: 'The data model is removed from the catalog and from any federation that uses it. This cannot be undone.',
        confirmLabel: 'Delete data model',
        danger: true,
        typeToConfirm: m.code ?? m.label,
      });
      if (ok) {
        this.run(this.pathologySvc.deletePathology(m.uuid), 'Data model deleted', 'delete the data model', () =>
          this.nav({ pathologyCode: null, version: null, latest: null, node: null }),
        );
      }
    }
  }

  private run(req: import('rxjs').Observable<unknown>, ok: string, action: string, after?: () => void): void {
    req.subscribe({
      next: () => {
        this.toast.success(ok);
        this.store.load();
        after?.();
      },
      error: (e) => this.toast.error(toProblem(e, action).message),
    });
  }

  protected keys(e: KeyboardEvent): void {
    const t = e.target as HTMLElement;
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
      const i = document.querySelector<HTMLInputElement>('mip-pathology input[type=search]');
      if (i) {
        e.preventDefault();
        i.focus();
      }
    } else if (e.key === 'Escape' && this.layout.focus() && !document.querySelector('.cdk-overlay-pane')) {
      this.layout.focus.set(false);
    }
  }
}
