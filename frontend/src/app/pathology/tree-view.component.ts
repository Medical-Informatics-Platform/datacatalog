import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, afterRenderEffect, computed, effect, inject, input,
  linkedSignal, output, signal, untracked, viewChild,
} from '@angular/core';
import { ROOT_ID, TreeIndex, TreeNode } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';
import {
  BLayout, BNode, GROUPS_PAGE, MOTION_MS, Measure, Pose, ROWS_STEP, Shown, Track, anchorShift, defaultExpanded, expandPath, fillFold,
  fitTransform, layoutTree, linkPath, planMotion, poseAt, poseOf, reframe, zoomAt,
} from './tree-layout';

const TYPES = ['integer', 'real', 'nominal', 'text'];
const LETTER: Record<string, string> = { integer: 'I', real: 'R', nominal: 'N', text: 'T' };
const FACE: Record<string, string> = { root: '600 15px', group: '500 14px', compact: '500 13px', row: '400 13px' };
const FAMILY = '"Atkinson Hyperlegible Next Variable", system-ui, sans-serif';

interface Item { id: string; kind: 'group' | 'row'; depth: number; y: number; parent: string | null; node: TreeNode; bn: BNode }
/** The layout plus the nodes it just dropped, still drawn (inert, hidden from assistive tech) while they fade out. */
interface Scene { layout: BLayout; ix: TreeIndex; gone: BNode[] }
/** A drawn node, its link colour and, while it moves, its track. */
interface Live { n: BNode; el: HTMLElement | undefined; route: boolean; track?: Track }

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * Tree: a collapsible left-to-right node-link tree. Groups are cards (full wrapped labels, size/type bar),
 * a group's variables are one paged list node, the route to the selection is drawn in the federation colour.
 * Plain wheel pans, Ctrl/Cmd+wheel zooms, and the clicked card never moves under the pointer.
 */
@Component({
  selector: 'mip-tree-view',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--line]': 'color()' },
  template: `
    <div class="hd">
      <span>Scroll to pan · Ctrl+scroll to zoom · drag to move</span>
      <span class="num muted">{{ layout().nodes.length }} nodes</span>
    </div>
    <div class="vp" #vp (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up()" (pointercancel)="up()" [class.drag]="dragging()">
      @if (searching() && !matchIds().length) { <p class="none">No variables or groups match. Clear the search or filters.</p> }
      <div #stage class="stage" role="tree" aria-label="Variable hierarchy" [class.anim]="anim()" [class.lod1]="tf().k < 0.7" [class.lod2]="tf().k < 0.5"
        [style.transform]="'translate(' + tf().x + 'px,' + tf().y + 'px) scale(' + tf().k + ')'" (keydown)="onKey($event)">
        <svg class="links" aria-hidden="true" [attr.width]="layout().width" [attr.height]="layout().height">
          <path #lp class="lk" [attr.d]="plain()" /><path #lr class="lk r" [attr.d]="routed()" />
        </svg>
        @for (n of drawn(); track n.id) {
          @switch (n.kind) {
            @case ('sheet') {
              <div class="n sheet" role="group" [attr.data-n]="n.id" [attr.inert]="gone(n) ? '' : null" [attr.aria-hidden]="gone(n) || null"
                [attr.aria-label]="'Variables of ' + groupLabel(n)" [class.dim]="dim(n)" [class.rt]="isRoute(n.id)"
                [style.transform]="pos(n)" [style.width.px]="n.w" [style.height.px]="n.h">
                @if (n.total! > 1) {
                  <div class="sh"><span class="num">{{ n.total }} variables</span><span class="ts">@for (s of mix(n.groupId); track s.t) {<i [style.flex-grow]="s.n" [style.--tc]="'var(--t-' + s.t + ')'"></i>}</span></div>
                }
                @for (r of n.rows!; track r.node.id) {
                  <div class="row" role="treeitem" [attr.data-id]="gone(n) ? null : r.node.id" [attr.aria-level]="n.depth + 1" [attr.aria-selected]="r.node.id === selectedId()"
                    [class.on]="r.node.id === selectedId()" [class.hit]="matchSet().has(r.node.id)" [class.xt]="r.extra" [style.height.px]="r.h"
                    [tabindex]="r.node.id === rover() ? 0 : -1" (click)="pickVar(r.node, n)">
                    <span class="tglyph" [class]="'tglyph t-' + r.node.type">{{ letter(r.node.type) }}</span>
                    <span class="lb2"><span class="rl">{{ r.node.label }}</span>@if (r.node.id === selectedId()) {<code class="cd muted">{{ r.node.code }}</code>}</span>
                  </div>
                }
                @if (n.hidden! > 0) {
                  <div class="sf">
                    <span class="num muted">{{ n.total! - n.hidden! }} of {{ n.total }}</span>
                    <button class="lnk" type="button" (click)="showRows(n, false)">Show {{ n.hidden! < 15 ? n.hidden : 15 }} more</button>
                    @if (n.hidden! > 15 && n.hidden! <= 30) { <button class="lnk" type="button" (click)="showRows(n, true)">Show all</button> }
                  </div>
                }
              </div>
            }
            @case ('more') {
              <button type="button" class="n more" [attr.data-n]="n.id" [attr.inert]="gone(n) ? '' : null" [attr.aria-hidden]="gone(n) || null"
                [style.transform]="pos(n)" [style.width.px]="n.w" [style.height.px]="n.h" (click)="showGroups(n)">
                Show {{ n.left! < pageSize ? n.left : pageSize }} more groups <span class="muted num">({{ n.left }} left)</span>
              </button>
            }
            @default {
              <div class="n g" role="treeitem" [attr.data-n]="n.id" [attr.data-id]="gone(n) ? null : n.id" [attr.inert]="gone(n) ? '' : null"
                [attr.aria-hidden]="gone(n) || null" [attr.aria-level]="n.depth + 1" [attr.aria-expanded]="n.openable ? n.expanded : null"
                [attr.aria-selected]="n.id === selId(n)" [class.root]="n.kind === 'root'" [class.cp]="n.compact" [class.ex]="n.expanded" [class.on]="n.id === selId(n)"
                [class.hit]="matchSet().has(n.id)" [class.dim]="dim(n)" [class.rt]="isRoute(n.id)" [tabindex]="n.id === rover() ? 0 : -1"
                [style.transform]="pos(n)" [style.width.px]="n.w" [style.height.px]="n.h" [style.--lc]="n.lines" (click)="pickGroup(n)">
                <span class="lb">{{ n.node!.label }}</span>
                @if (n.kind === 'root') { <code class="cd muted" [attr.title]="n.node!.code + ' · ' + version()">{{ n.node!.code }} · {{ version() }}</code> }
                @if (!n.compact) { <span class="meta num muted">{{ meta(n.node!) }}</span> } @else { <span class="ct num muted">{{ n.node!.totalVariables }}</span> }
                @if (n.openable && n.kind !== 'root') {
                  <button class="chev" type="button" tabindex="-1" [attr.aria-label]="(n.expanded ? 'Collapse ' : 'Expand ') + n.node!.label" (click)="toggle(n, $event)"><mip-icon name="down" [size]="16" /></button>
                }
                @if (!n.expanded && hitCount(n); as c) { <span class="hb">{{ c }}</span> }
                <span class="barw" aria-hidden="true"><span class="bar" [style.width.px]="barW(n)">@for (s of mix(n.id); track s.t) {<i [style.flex-grow]="s.n" [style.--tc]="'var(--t-' + s.t + ')'"></i>}</span></span>
              </div>
            }
          }
        }
      </div>
      <div class="hud" role="group" aria-label="View controls">
        <button class="btn btn-sm btn-icon" type="button" aria-label="Zoom out" (click)="zoomBy(1 / 1.2)">−</button>
        <span class="num pct">{{ (tf().k * 100).toFixed(0) }}%</span>
        <button class="btn btn-sm btn-icon" type="button" aria-label="Zoom in" (click)="zoomBy(1.2)">+</button>
        <button class="btn btn-sm" type="button" (click)="fit()">Fit</button>
        <button class="btn btn-sm" type="button" [disabled]="!selectedId()" (click)="focusSelection()">Selection</button>
        <button class="btn btn-sm" type="button" [attr.aria-pressed]="accordion()" (click)="accordion.set(!accordion())">Accordion</button>
        <button class="btn btn-sm" type="button" (click)="reset()">Collapse</button>
      </div>
    </div>
  `,
  styleUrl: './tree-view.component.css',
})
export class TreeViewComponent {
  readonly index = input.required<TreeIndex>();
  readonly selectedId = input<string | null>(null);
  readonly matchIds = input<string[]>([]);
  readonly searching = input(false);
  readonly color = input('var(--blue)');
  readonly version = input('');
  readonly focusNonce = input(0);
  readonly select = output<string | null>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private lp = viewChild.required<ElementRef<SVGPathElement>>('lp');
  private lr = viewChild.required<ElementRef<SVGPathElement>>('lr');
  protected pageSize = GROUPS_PAGE;
  protected vp = signal({ w: 960, h: 560 });
  protected tf = signal({ x: 24, y: 24, k: 1 });
  protected anim = signal(false);
  protected dragging = signal(false);
  protected accordion = signal(false);
  /** Bumped when fonts load or change, so text is re-measured. */
  private fontTick = signal(0);
  private pendingFocus = signal<string | null>(null);
  private anchor: { id: string; sx: number; sy: number } | null = null;
  private needFit = true;
  private lastReveal: string | null | undefined;
  private drag: { x: number; y: number; tx: number; ty: number; moved: boolean; id: number } | null = null;
  private justDragged = false;
  private ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  /** Set by user intent (clicks, keys, selection, Collapse); layout changes without it (search, fonts, resize) snap. */
  private motion = false;
  private calm = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  private live = new Map<string, Live>();
  private synced: BLayout | null = null;
  private syncedIx: TreeIndex | null = null;
  private raf = 0;
  /** Links of fading nodes, one cloned path per fade cohort so each can carry its own opacity. */
  private fx = new Map<string, SVGPathElement>();

  protected model = computed(() => this.index().nodes.get(this.index().rootId));
  protected compact = computed(() => this.vp().w < 768);
  protected matchSet = computed(() => new Set(this.matchIds()));
  protected letter = (t: string) => LETTER[t] ?? '·';

  protected expanded = linkedSignal<TreeIndex, Set<string>>({
    source: this.index,
    computation: (ix) => expandPath(ix, untracked(this.selectedId), defaultExpanded(ix), false),
  });
  protected rowsShown = linkedSignal<TreeIndex, Map<string, number>>({ source: this.index, computation: () => new Map() });
  protected groupsShown = linkedSignal<TreeIndex, Map<string, number>>({ source: this.index, computation: () => new Map() });

  /** Wrapped line count for a label, measured with the real font once it is loaded. */
  private measure: Measure = (text, face, width) => {
    const c = this.ctx;
    if (!c || !this.fontTick()) return Math.max(1, Math.ceil((text.length * 7) / width));
    c.font = `${FACE[face]} ${FAMILY}`;
    let lines = 1;
    let cur = 0;
    for (const w of text.split(/\s+/)) {
      const wl = c.measureText(w + ' ').width;
      if (cur + wl > width && cur > 0) {
        lines++;
        cur = wl;
      } else cur += wl;
    }
    return lines;
  };

  protected layout = computed<BLayout>(() =>
    layoutTree(
      this.index(),
      {
        expanded: this.expanded(), rowsShown: this.rowsShown(), groupsShown: this.groupsShown(), compact: this.compact(),
        selectedId: this.selectedId(), matchIds: this.matchSet(),
      },
      this.measure,
    ),
  );

  protected scene = linkedSignal<BLayout, Scene>({
    source: this.layout,
    computation: (layout, prev) => {
      const ix = untracked(this.index);
      const gone: BNode[] = [];
      if (prev && prev.value.ix === ix && this.motion && !this.calm?.matches) {
        const seen = new Set(layout.nodes.map((n) => n.id));
        for (const n of [...prev.value.layout.nodes, ...prev.value.gone]) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            gone.push(n);
          }
        }
      }
      return { layout, ix, gone };
    },
  });
  /** Leaving nodes first, so they fade out beneath the cards gliding into their place. */
  protected drawn = computed(() => {
    const s = this.scene();
    return s.gone.length ? [...s.gone, ...s.layout.nodes] : s.layout.nodes;
  });
  private goneIds = computed(() => new Set(this.scene().gone.map((n) => n.id)));
  protected gone = (n: BNode) => this.goneIds().has(n.id);

  protected plain = computed(() => this.layout().links.filter((l) => !l.route).map((l) => l.d).join(''));
  protected routed = computed(() => this.layout().links.filter((l) => l.route).map((l) => l.d).join(''));

  private typeMix = computed(() => {
    const out = new Map<string, { t: string; n: number }[]>();
    const nodes = this.index().nodes;
    const walk = (n: TreeNode): Map<string, number> => {
      const m = new Map<string, number>();
      for (const id of n.childIds) {
        const c = nodes.get(id)!;
        if (c.kind === 'variable') m.set(c.type, (m.get(c.type) ?? 0) + 1);
        else for (const [t, k] of walk(c)) m.set(t, (m.get(t) ?? 0) + k);
      }
      out.set(n.id, TYPES.filter((t) => m.has(t)).map((t) => ({ t, n: m.get(t)! })));
      return m;
    };
    walk(nodes.get(this.index().rootId)!);
    return out;
  });
  protected mix = (id: string) => this.typeMix().get(id) ?? [];
  protected barW = (n: BNode) => Math.max(4, (n.compact ? 188 : 204) * Math.sqrt(n.node!.totalVariables / Math.max(1, this.model()!.totalVariables)));

  private hitInfo = computed(() => {
    const nodes = this.index().nodes;
    const anc = new Map<string, number>();
    for (const id of this.matchSet()) for (let p = nodes.get(id)?.parentId; p; p = nodes.get(p)?.parentId) anc.set(p, (anc.get(p) ?? 0) + 1);
    return anc;
  });
  protected hitCount = (n: BNode) => (n.kind === 'group' ? (this.hitInfo().get(n.id) ?? 0) : 0);
  private route = computed(() => {
    const ids = new Set<string>([ROOT_ID]);
    const nodes = this.index().nodes;
    const sel = this.selectedId();
    for (let n = sel ? nodes.get(sel) : undefined; n; n = n.parentId ? nodes.get(n.parentId) : undefined) ids.add(n.id);
    if (sel && nodes.get(sel)?.kind === 'variable') ids.add(`${nodes.get(sel)!.parentId}#vars`);
    return ids;
  });
  protected isRoute = (id: string) => this.route().has(id);
  protected dim = (n: BNode) =>
    this.searching() && !this.route().has(n.id) && !this.matchSet().has(n.id) && !this.hitInfo().has(n.groupId) && !(n.kind === 'sheet' && n.rows!.some((r) => this.matchSet().has(r.node.id)));
  protected selId = (n: BNode) => (n.kind === 'root' ? (this.selectedId() === null ? ROOT_ID : '') : this.selectedId());
  protected pos = (n: BNode) => `translate(${n.x}px,${n.y}px)`;
  protected groupLabel = (n: BNode) => this.index().nodes.get(n.groupId)?.label ?? '';
  protected meta(n: TreeNode): string {
    const v = `${n.totalVariables} variable${n.totalVariables === 1 ? '' : 's'}`;
    return n.groupCount ? `${v} · ${n.groupCount} group${n.groupCount === 1 ? '' : 's'}` : v;
  }

  private items = computed<Item[]>(() => {
    const out: Item[] = [];
    for (const bn of this.layout().nodes) {
      if (bn.kind === 'root' || bn.kind === 'group') out.push({ id: bn.id, kind: 'group', depth: bn.depth, y: bn.y, parent: bn.parentId, node: bn.node!, bn });
      else if (bn.kind === 'sheet') {
        const head = bn.total! > 1 ? 28 : 0;
        for (const r of bn.rows!) out.push({ id: r.node.id, kind: 'row', depth: bn.depth, y: bn.y + head + r.y, parent: bn.groupId, node: r.node, bn });
      }
    }
    return out;
  });
  protected rover = computed(() => {
    const sel = this.selectedId();
    const it = this.items();
    return (it.find((i) => i.id === sel) ?? it[0])?.id ?? null;
  });

  constructor() {
    effect(() => {
      this.index();
      this.needFit = true;
    });
    effect(() => {
      const sel = this.selectedId();
      const ix = this.index();
      const acc = untracked(this.accordion);
      this.motion = true;
      untracked(() =>
        this.expanded.update((e) => {
          const next = expandPath(ix, sel, e, acc);
          return sameSet(e, next) ? e : next;
        }),
      );
    });
    afterNextRender(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>('.vp')!;
      new ResizeObserver(([e]) => this.vp.set({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) })).observe(el);
      el.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
      el.addEventListener('click', (e) => {
        if (this.justDragged) {
          e.stopPropagation();
          e.preventDefault();
          this.justDragged = false;
        }
      }, true);
      document.fonts?.ready.then(() => this.fontTick.update((v) => v + 1));
      document.fonts?.addEventListener('loadingdone', () => this.fontTick.update((v) => v + 1));
    });
    afterRenderEffect(() => {
      const l = this.layout();
      const vp = this.vp();
      const sel = this.selectedId();
      untracked(() => {
        const before = this.tf();
        this.camera(l, vp, sel);
        this.sync(before);
        this.motion = false;
      });
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
    afterRenderEffect(() => {
      const id = this.pendingFocus();
      const nonce = this.focusNonce();
      this.layout();
      const target = id ?? (nonce > 0 ? this.selectedId() : null);
      const el = target ? this.el(target) : null;
      if (el) {
        el.focus({ preventScroll: true });
        if (id) this.pendingFocus.set(null);
      }
    });
  }

  private el(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
  }

  // ---- camera -------------------------------------------------------------

  private camera(l: BLayout, vp: { w: number; h: number }, sel: string | null): void {
    if (vp.w < 50) return;
    const t = this.tf();
    if (this.needFit) {
      this.needFit = false;
      this.lastReveal = sel;
      // first paint favours readable text over showing everything: tall trees start at the top and are panned
      const f = fitTransform(vp.w, vp.h, l.width, l.height, 0.85);
      this.tf.set(f);
      if (sel) this.reveal(l, sel, Math.max(f.k, 0.85), true);
      return;
    }
    if (this.anchor) {
      const a = this.anchor;
      this.anchor = null;
      const node = l.nodes.find((n) => n.id === a.id);
      if (!node) return;
      let next = anchorShift(t, { x: a.sx, y: a.sy }, node);
      const kids = l.nodes.filter((n) => n.parentId === a.id);
      if (kids.length) {
        const top = Math.min(...kids.map((n) => n.y)) * next.k + next.y;
        const bottom = Math.max(...kids.map((n) => n.y + n.h)) * next.k + next.y;
        const left = Math.min(...kids.map((n) => n.x)) * next.k + next.x;
        const right = Math.max(...kids.map((n) => n.x + n.w)) * next.k + next.x;
        // the card stays put; the camera only steps in when every opened child would land off-screen
        if (left > vp.w - 48 || top > vp.h - 48 || bottom < 48) {
          let dx = right > vp.w - 48 ? vp.w - 48 - right : 0;
          let dy = bottom > vp.h - 48 ? vp.h - 48 - bottom : top < 48 ? 48 - top : 0;
          const anchorX = node.x * next.k + next.x + dx;
          if (anchorX < 24) dx += 24 - anchorX;
          if (dy < 0 && node.y * next.k + next.y + dy < 24) dy = 24 - (node.y * next.k + next.y);
          next = { ...next, x: next.x + dx, y: next.y + dy };
        }
      } else {
        // a fold shrinks the tree: the card stays put unless that would leave most of the viewport blank (vertical only)
        const h0 = this.synced?.height ?? l.height;
        next = { ...next, y: next.y + fillFold(vp.h, { top: t.y, bottom: t.y + h0 * t.k }, { top: next.y, bottom: next.y + l.height * next.k }) };
      }
      this.tf.set(next);
      return;
    }
    if (sel !== this.lastReveal) {
      this.lastReveal = sel;
      if (sel) this.reveal(l, sel, Math.max(t.k, 0.7), false);
    }
  }

  /** Pan (and set scale) so the node's box is inside the viewport with a margin; eased. */
  private reveal(l: BLayout, id: string, k: number, centre: boolean): void {
    const box = this.boxOf(l, id);
    if (!box) return;
    const vp = this.vp();
    let { x, y } = this.tf();
    if (centre) {
      x = vp.w * 0.35 - box.x * k;
      y = vp.h * 0.45 - (box.y + box.h / 2) * k;
    } else {
      const sx = box.x * k + x, sy = box.y * k + y, sr = sx + box.w * k, sb = sy + box.h * k;
      if (sx < 36) x += 36 - sx;
      else if (sr > vp.w - 36) x -= sr - (vp.w - 36);
      if (sy < 48) y += 48 - sy;
      else if (sb > vp.h - 48) y -= sb - (vp.h - 48);
      if (x === this.tf().x && y === this.tf().y && k === this.tf().k) return;
    }
    this.ease();
    this.tf.set({ x, y, k });
  }

  private boxOf(l: BLayout, id: string): { x: number; y: number; w: number; h: number } | null {
    const direct = l.nodes.find((n) => n.id === id);
    if (direct) return direct;
    const sheet = l.nodes.find((n) => n.kind === 'sheet' && n.rows?.some((r) => r.node.id === id));
    if (!sheet) return null;
    const r = sheet.rows!.find((x) => x.node.id === id)!;
    return { x: sheet.x, y: sheet.y + (sheet.total! > 1 ? 28 : 0) + r.y, w: sheet.w, h: r.h };
  }

  private ease(): void {
    this.anim.set(true);
    setTimeout(() => this.anim.set(false), 280);
  }

  /** Remember where the clicked node is on screen now (mid-glide too), so the camera can pin it there. */
  private setAnchor(n: BNode): void {
    this.motion = true;
    if (this.anim()) {
      // a zoom/fit glide is running: stop the camera where it is, or the card would jump to the glide's end
      const m = new DOMMatrixReadOnly(getComputedStyle(this.stage().nativeElement).transform);
      this.anim.set(false);
      this.tf.set({ x: m.e, y: m.f, k: m.a });
    }
    const t = this.tf();
    const tr = this.live.get(n.id)?.track;
    const p = tr ? poseAt(tr, performance.now()) : n;
    this.anchor = { id: n.id, sx: p.x * t.k + t.x, sy: p.y * t.k + t.y };
  }

  // ---- motion: one rAF loop outside Angular writes node transforms and link paths straight to the DOM ----

  /** After a layout change: plan tracks from what is on screen now to the new layout (or snap) and run them. */
  private sync(before: { x: number; y: number; k: number }): void {
    const s = this.scene();
    if (s.layout === this.synced) return;
    const animate = this.motion && this.syncedIx === s.ix && !this.calm?.matches;
    this.synced = s.layout;
    this.syncedIx = s.ix;
    const now = performance.now();
    const shown = new Map<string, Shown>();
    if (animate) for (const [id, e] of this.live) shown.set(id, { node: e.n, pose: e.track ? poseAt(e.track, now) : poseOf(e.n), track: e.track });
    // a camera glide (CSS) starts from where the stage is now, so poses stay in stage space; a camera jump is undone per node (FLIP)
    const shift = this.anim() ? (p: Pose) => p : reframe(before, this.tf());
    const tracks = animate ? planMotion(shown, s.layout.nodes, s.gone, shift, now) : new Map<string, Track>();
    const els = new Map<string, HTMLElement>();
    for (const el of this.stage().nativeElement.querySelectorAll<HTMLElement>(':scope > [data-n]')) els.set(el.dataset['n']!, el);
    const route = new Map(s.layout.links.map((k) => [k.id, k.route]));
    const old = this.live;
    this.live = new Map();
    for (const n of [...s.layout.nodes, ...s.gone]) {
      this.live.set(n.id, { n, el: els.get(n.id), route: route.get(n.id) ?? old.get(n.id)?.route ?? false, track: tracks.get(n.id) });
    }
    // nodes that were moving and now rest: Angular only rewrites a binding whose value changed, so put the bound values back
    for (const [id, e] of old) {
      const cur = this.live.get(id);
      if (e.track && cur?.el && !cur.track) this.rest(cur);
    }
    if (!tracks.size) return this.finish();
    this.frame(now);
    if (!this.raf) this.zone.runOutsideAngular(() => (this.raf = requestAnimationFrame(this.tick)));
  }

  private tick = () => {
    this.raf = 0;
    if (this.frame(performance.now())) this.raf = requestAnimationFrame(this.tick);
    else this.finish();
  };

  /** Draw one frame; returns whether anything is still moving. */
  private frame(now: number): boolean {
    let busy = false;
    const poses = new Map<string, { x: number; y: number; h: number; o?: number }>();
    for (const [id, e] of this.live) {
      const tr = e.track;
      if (!tr) {
        poses.set(id, e.n);
        continue;
      }
      const p = poseAt(tr, now);
      poses.set(id, p);
      busy ||= now < tr.t0 + MOTION_MS;
      if (!e.el) continue;
      e.el.style.transform = `translate(${p.x}px,${p.y}px)`;
      if (tr.from.h !== tr.to.h) e.el.style.height = `${p.h}px`;
      if (tr.from.o !== tr.to.o) e.el.style.setProperty('--o', `${p.o}`);
    }
    // links follow the live boxes, so they stay on the cards; links of fading nodes fade with them
    let plain = '', routed = '';
    const fading = new Map<string, { d: string; o: number; route: boolean }>();
    for (const [id, e] of this.live) {
      const parent = e.n.parentId ? this.live.get(e.n.parentId) : undefined;
      if (!parent) continue;
      const c = poses.get(id)!;
      const d = linkPath({ ...poses.get(parent.n.id)!, w: parent.n.w }, c);
      const tr = e.track;
      if (tr && (tr.from.o !== 1 || tr.to.o !== 1)) {
        const key = `${e.route}|${tr.t0}|${tr.from.o}|${tr.to.o}`;
        const f = fading.get(key);
        if (f) f.d += d;
        else fading.set(key, { d, o: c.o ?? 1, route: e.route });
      } else if (e.route) routed += d;
      else plain += d;
    }
    this.lp().nativeElement.setAttribute('d', plain);
    this.lr().nativeElement.setAttribute('d', routed);
    for (const [key, el] of this.fx) {
      if (!fading.has(key)) {
        el.remove();
        this.fx.delete(key);
      }
    }
    for (const [key, f] of fading) {
      let el = this.fx.get(key);
      if (!el) {
        // a clone keeps the component's style scope
        el = (f.route ? this.lr() : this.lp()).nativeElement.cloneNode() as SVGPathElement;
        this.lp().nativeElement.parentNode!.appendChild(el);
        this.fx.set(key, el);
      }
      el.setAttribute('d', f.d);
      el.style.opacity = `${f.o}`;
    }
    return busy;
  }

  /** End every track: bound values back on the DOM, fading links and nodes removed. */
  private finish(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const e of this.live.values()) {
      if (e.track && e.el) this.rest(e);
      e.track = undefined;
    }
    for (const el of this.fx.values()) el.remove();
    this.fx.clear();
    this.lp().nativeElement.setAttribute('d', this.plain());
    this.lr().nativeElement.setAttribute('d', this.routed());
    const s = this.scene();
    if (s.gone.length) {
      for (const g of s.gone) this.live.delete(g.id);
      this.zone.run(() => this.scene.set({ ...s, gone: [] }));
    }
  }

  private rest(e: Live): void {
    e.el!.style.transform = this.pos(e.n);
    e.el!.style.height = `${e.n.h}px`;
    e.el!.style.removeProperty('--o');
  }

  protected fit(): void {
    const l = this.layout();
    this.ease();
    this.tf.set(fitTransform(this.vp().w, this.vp().h, l.width, l.height));
  }

  protected focusSelection(): void {
    const sel = this.selectedId();
    if (sel) this.reveal(this.layout(), sel, Math.max(this.tf().k, 0.9), true);
  }

  protected zoomBy(f: number): void {
    this.ease();
    this.tf.set(zoomAt(this.tf(), f, this.vp().w / 2, this.vp().h / 2));
  }

  private wheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const t = this.tf();
    if (e.ctrlKey || e.metaKey) this.tf.set(zoomAt(t, Math.exp(-e.deltaY * 0.0025), e.clientX - rect.left, e.clientY - rect.top));
    else this.tf.set({ ...t, x: t.x - (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX), y: t.y - (e.shiftKey && !e.deltaX ? 0 : e.deltaY) });
  }

  protected down(e: PointerEvent): void {
    if (e.button !== 0) return;
    const t = this.tf();
    this.drag = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y, moved: false, id: e.pointerId };
  }

  protected move(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      this.dragging.set(true);
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    if (d.moved) this.tf.update((t) => ({ ...t, x: d.tx + dx, y: d.ty + dy }));
  }

  protected up(): void {
    this.justDragged = !!this.drag?.moved;
    this.drag = null;
    this.dragging.set(false);
    if (this.justDragged) setTimeout(() => (this.justDragged = false), 0);
  }

  // ---- expansion + selection ------------------------------------------------

  protected toggle(n: BNode, e?: Event): void {
    e?.stopPropagation();
    this.setAnchor(n);
    const s = new Set(this.expanded());
    if (s.has(n.id)) s.delete(n.id);
    else {
      if (this.accordion() && n.parentId) for (const sib of this.index().nodes.get(n.parentId)!.childIds) s.delete(sib);
      s.add(n.id);
    }
    this.expanded.set(s);
  }

  /** A click anywhere on an open group card folds it; on a closed one it opens and selects it. */
  protected pickGroup(n: BNode): void {
    if (n.kind === 'group' && n.openable && n.expanded) return this.toggle(n);
    if (n.kind === 'root' && this.selectedId() === null) return; // nothing changes, so no anchor may linger
    this.setAnchor(n);
    if (n.kind === 'group' && n.openable && !n.expanded) {
      this.expanded.set(expandPath(this.index(), n.id, this.expanded(), this.accordion()));
    }
    // the clicked card is on screen already: the selection it causes must not pan the camera
    this.lastReveal = n.kind === 'root' ? null : n.id;
    this.select.emit(this.lastReveal);
  }

  /** Selecting a row grows it (its code line shows): pin its list so the row stays under the pointer. */
  protected pickVar(v: TreeNode, sheet: BNode): void {
    if (v.id !== this.selectedId()) {
      this.setAnchor(sheet);
      this.lastReveal = v.id;
    }
    this.select.emit(v.id);
  }

  protected showRows(n: BNode, all: boolean): void {
    this.setAnchor(n);
    const cur = this.rowsShown().get(n.groupId) ?? 8;
    this.rowsShown.update((m) => new Map(m).set(n.groupId, all ? n.total! : Math.min(n.total!, cur + ROWS_STEP)));
  }

  protected showGroups(n: BNode): void {
    this.setAnchor(n);
    const cur = this.groupsShown().get(n.groupId) ?? GROUPS_PAGE;
    this.groupsShown.update((m) => new Map(m).set(n.groupId, cur + GROUPS_PAGE));
  }

  protected reset(): void {
    this.motion = true;
    this.ease();
    this.rowsShown.set(new Map());
    this.groupsShown.set(new Map());
    this.expanded.set(expandPath(this.index(), this.selectedId(), defaultExpanded(this.index()), this.accordion()));
    this.needFit = true;
  }

  // ---- keyboard -------------------------------------------------------------

  protected onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset['id'];
    const items = this.items();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const col = items.filter((x) => x.depth === it.depth).sort((a, b) => a.y - b.y);
    const i = col.indexOf(it);
    const go = (x: Item | undefined) => x && this.el(x.id)?.focus();
    switch (e.key) {
      case 'ArrowDown': go(col[i + 1]); break;
      case 'ArrowUp': go(col[i - 1]); break;
      case 'Home': go(col[0]); break;
      case 'End': go(col[col.length - 1]); break;
      case 'ArrowRight':
        if (it.kind === 'group' && it.bn.openable && it.id !== ROOT_ID) {
          if (!it.bn.expanded) {
            this.toggle(it.bn);
          } else go(items.filter((x) => x.parent === it.id).sort((a, b) => a.y - b.y)[0]);
        } else if (it.id === ROOT_ID) go(items.filter((x) => x.parent === it.id).sort((a, b) => a.y - b.y)[0]);
        break;
      case 'ArrowLeft':
        if (it.kind === 'group' && it.bn.expanded && it.id !== ROOT_ID) this.toggle(it.bn);
        else go(items.find((x) => x.id === it.parent));
        break;
      case 'Enter':
        if (it.kind === 'row') this.pickVar(it.node, it.bn);
        else this.pickGroup(it.bn);
        break;
      case ' ':
        if (it.kind === 'row') this.pickVar(it.node, it.bn);
        else if (it.bn.openable && it.id !== ROOT_ID) this.toggle(it.bn);
        break;
      case '+': case '=': this.zoomBy(1.2); break;
      case '-': this.zoomBy(1 / 1.2); break;
      case '0': this.fit(); break;
      case 'f': this.focusSelection(); break;
      default:
        if (e.key.length === 1) {
          const k = e.key.toLowerCase();
          go([...col.slice(i + 1), ...col.slice(0, i + 1)].find((x) => x.node.label.toLowerCase().startsWith(k)));
        }
        return;
    }
    e.preventDefault();
  }
}
