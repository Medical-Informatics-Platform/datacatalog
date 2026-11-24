import { ROOT_ID, TreeIndex, TreeNode } from '../services/pathology-tree';

export type BKind = 'root' | 'group' | 'sheet' | 'more';

export interface SheetRow {
  node: TreeNode;
  lines: number;
  /** Row top inside the sheet body (px, after the header). */
  y: number;
  h: number;
  /** Row appended below the preview because it is selected or a search hit. */
  extra: boolean;
}

export interface BNode {
  id: string;
  kind: BKind;
  node?: TreeNode;
  /** Group this node belongs to (the group itself, or the group a sheet / stub hangs under). */
  groupId: string;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId: string | null;
  compact: boolean;
  lines: number;
  expanded: boolean;
  /** Group has anything to open (subgroups or variables). */
  openable: boolean;
  rows?: SheetRow[];
  /** sheet: total variables, rows hidden behind the footer. */
  total?: number;
  hidden?: number;
  /** more-stub: groups still hidden. */
  left?: number;
}

export interface BLink {
  id: string;
  d: string;
  route: boolean;
}

export interface BLayout {
  nodes: BNode[];
  links: BLink[];
  width: number;
  height: number;
}

export interface BState {
  /** Groups whose children are visible. The root is always open. */
  expanded: ReadonlySet<string>;
  rowsShown: ReadonlyMap<string, number>;
  groupsShown: ReadonlyMap<string, number>;
  compact: boolean;
  selectedId: string | null;
  matchIds: ReadonlySet<string>;
}

/** Number of text lines `text` needs inside `width` px for the given face. */
export type Measure = (text: string, face: 'root' | 'group' | 'compact' | 'row', width: number) => number;

export const PITCH = 312;
export const W = { root: 248, group: 232, sheet: 280 };
const GAP = 12;
const GAP_COMPACT = 8;
export const INITIAL_ROWS = 8;
export const ROWS_STEP = 15;
export const GROUPS_PAGE = 24;
const COMPACT_ABOVE = 16;

/** Inner text widths (card width minus padding, chevron and glyph). */
const TEXT_W = { root: 248 - 40, group: 232 - 50, compact: 232 - 44, row: 280 - 58 };

const clampLines = (n: number, max: number) => Math.max(1, Math.min(max, n));

/** Groups open on first paint: everything in a tiny model, otherwise the first level (plus the biggest domain when cheap). */
export function defaultExpanded(index: TreeIndex): Set<string> {
  const root = index.nodes.get(index.rootId)!;
  const out = new Set<string>();
  const groups = root.childIds.map((id) => index.nodes.get(id)!).filter((n) => n.kind === 'group');
  const all = () => {
    for (const n of index.nodes.values()) if (n.kind === 'group' && n.id !== ROOT_ID) out.add(n.id);
  };
  if (root.totalVariables <= 25) {
    all();
    return out;
  }
  if (groups.length === 1) out.add(groups[0].id);
  if (root.totalVariables <= 250 && groups.length) {
    const biggest = [...groups].sort((a, b) => b.totalVariables - a.totalVariables)[0];
    const visible = 1 + groups.length + 1 + biggest.groupCount + (biggest.variableCount ? 1 : 0);
    if (visible <= 18) out.add(biggest.id);
  }
  return out;
}

/** Expand every ancestor of `id` (and `id` itself when it is a group); accordion closes their open siblings. */
export function expandPath(index: TreeIndex, id: string | null, expanded: ReadonlySet<string>, accordion: boolean): Set<string> {
  const next = new Set(expanded);
  const sel = id ? index.nodes.get(id) : undefined;
  if (!sel) return next;
  const chain: TreeNode[] = [];
  for (let n: TreeNode | undefined = sel; n; n = n.parentId ? index.nodes.get(n.parentId) : undefined) chain.unshift(n);
  for (const n of chain) {
    if (n.kind !== 'group' || n.id === ROOT_ID) continue;
    if (accordion && n.parentId) {
      for (const sib of index.nodes.get(n.parentId)!.childIds) if (sib !== n.id) next.delete(sib);
    }
    next.add(n.id);
  }
  return next;
}

/** Path nodes (groups + the sheet of the selected variable) that carry the route line. */
export function routeIds(index: TreeIndex, selectedId: string | null): Set<string> {
  const out = new Set<string>([ROOT_ID]);
  const sel = selectedId ? index.nodes.get(selectedId) : undefined;
  if (!sel) return out;
  for (let n: TreeNode | undefined = sel; n; n = n.parentId ? index.nodes.get(n.parentId) : undefined) out.add(n.id);
  if (sel.kind === 'variable') out.add(`${sel.parentId}#vars`);
  return out;
}

interface Tmp {
  n: BNode;
  kids: Tmp[];
  block: number;
}

/**
 * Variable-height tidy tree: a subtree is as tall as the larger of its own box and its children's
 * stacked blocks; children are centred on the parent. All heights come from measured text.
 */
export function layoutTree(index: TreeIndex, st: BState, measure: Measure): BLayout {
  const gap = st.compact ? GAP_COMPACT : GAP;
  const route = routeIds(index, st.selectedId);

  const groupBox = (g: TreeNode, siblings: number, depth: number, parentId: string | null): BNode => {
    const compact = st.compact || siblings > COMPACT_ABOVE;
    const lines = clampLines(measure(g.label, compact ? 'compact' : 'group', compact ? TEXT_W.compact : TEXT_W.group), compact ? 2 : 3);
    const open = st.expanded.has(g.id);
    return {
      id: g.id, kind: 'group', node: g, groupId: g.id, depth, x: depth * PITCH, y: 0, w: W.group,
      h: compact ? 16 + 16 * lines : 43 + 18 * lines, parentId, compact, lines, expanded: open, openable: g.childIds.length > 0,
    };
  };

  const sheetOf = (g: TreeNode, depth: number, parentId: string): BNode | null => {
    const vars = g.childIds.map((id) => index.nodes.get(id)!).filter((c) => c.kind === 'variable');
    if (!vars.length) return null;
    const shown = Math.min(vars.length, st.rowsShown.get(g.id) ?? INITIAL_ROWS);
    const head = vars.slice(0, shown);
    const extras = vars.slice(shown).filter((v) => v.id === st.selectedId || st.matchIds.has(v.id)).slice(0, 10);
    let y = 0;
    const rows: SheetRow[] = [...head.map((v) => [v, false] as const), ...extras.map((v) => [v, true] as const)].map(([v, extra]) => {
      const lines = clampLines(measure(v.label, 'row', TEXT_W.row), 2);
      const h = 12 + 16 * lines + (v.id === st.selectedId ? 14 : 0);
      const row = { node: v, lines, y, h, extra };
      y += h;
      return row;
    });
    const hidden = vars.length - shown - extras.length;
    const header = vars.length > 1 ? 28 : 0;
    const footer = hidden > 0 ? 28 : 0;
    return {
      id: `${g.id}#vars`, kind: 'sheet', groupId: g.id, depth, x: depth * PITCH, y: 0, w: W.sheet, h: header + y + footer + 2,
      parentId, compact: st.compact, lines: 1, expanded: false, openable: false, rows, total: vars.length, hidden,
    };
  };

  const build = (g: TreeNode, self: BNode): Tmp => {
    const t: Tmp = { n: self, kids: [], block: 0 };
    if (g.id === ROOT_ID || st.expanded.has(g.id)) {
      const groups = g.childIds.map((id) => index.nodes.get(id)!).filter((c) => c.kind === 'group');
      const cap = st.groupsShown.get(g.id) ?? GROUPS_PAGE;
      let visible = groups.slice(0, cap);
      // keep the route and search hits reachable inside a paged list
      const keep = groups.slice(cap).filter((c) => route.has(c.id));
      visible = [...visible, ...keep];
      for (const c of visible) t.kids.push(build(c, groupBox(c, groups.length, self.depth + 1, g.id)));
      const left = groups.length - visible.length;
      if (left > 0) {
        t.kids.push({
          n: {
            id: `${g.id}#more`, kind: 'more', groupId: g.id, depth: self.depth + 1, x: (self.depth + 1) * PITCH, y: 0, w: W.group, h: 32,
            parentId: g.id, compact: true, lines: 1, expanded: false, openable: false, left,
          },
          kids: [], block: 0,
        });
      }
      const sheet = sheetOf(g, self.depth + 1, g.id);
      if (sheet) t.kids.push({ n: sheet, kids: [], block: 0 });
    }
    return t;
  };

  const rootNode = index.nodes.get(index.rootId)!;
  const rl = clampLines(measure(rootNode.label, 'root', TEXT_W.root), 2);
  const rootBox: BNode = {
    id: ROOT_ID, kind: 'root', node: rootNode, groupId: ROOT_ID, depth: 0, x: 0, y: 0, w: W.root, h: 59 + 20 * rl,
    parentId: null, compact: false, lines: rl, expanded: true, openable: rootNode.childIds.length > 0,
  };
  const tree = build(rootNode, rootBox);

  const size = (t: Tmp): number => {
    const kidsH = t.kids.reduce((s, k) => s + size(k), 0) + Math.max(0, t.kids.length - 1) * gap;
    t.block = Math.max(t.n.h, kidsH);
    return t.block;
  };
  size(tree);

  const nodes: BNode[] = [];
  const links: BLink[] = [];
  const place = (t: Tmp, top: number) => {
    t.n.y = top + (t.block - t.n.h) / 2;
    nodes.push(t.n);
    const kidsH = t.kids.reduce((s, k) => s + k.block, 0) + Math.max(0, t.kids.length - 1) * gap;
    let cur = top + (t.block - kidsH) / 2;
    for (const k of t.kids) {
      place(k, cur);
      cur += k.block + gap;
      links.push({ id: k.n.id, d: linkPath(t.n, k.n), route: route.has(k.n.id) && route.has(t.n.id) });
    }
  };
  place(tree, 0);

  const width = Math.max(...nodes.map((n) => n.x + n.w));
  return { nodes, links, width, height: tree.block };
}

/** Height on a box where links attach: near the top of a card, at a sheet's header. */
const linkY = (b: { y: number; h: number }) => b.y + Math.min(24, b.h / 2);

/** Bezier from the right edge of parent box `a` to the left edge of child box `b`. */
export function linkPath(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; h: number }): string {
  const x1 = a.x + a.w, y1 = linkY(a), x2 = b.x, y2 = linkY(b), xm = (x1 + x2) / 2;
  return `M${x1},${y1}C${xm},${y1} ${xm},${y2} ${x2},${y2}`;
}

/** Zoom by `factor` around screen point (px, py) keeping the point under the cursor fixed. */
export function zoomAt(t: { x: number; y: number; k: number }, factor: number, px: number, py: number, min = 0.35, max = 1.8) {
  const k = Math.min(max, Math.max(min, t.k * factor));
  const f = k / t.k;
  return { k, x: px - (px - t.x) * f, y: py - (py - t.y) * f };
}

/** Transform that fits the layout in the viewport (never below readable scale, never above 1.1). */
export function fitTransform(vw: number, vh: number, w: number, h: number, min = 0.55) {
  const k = Math.min(1.1, Math.max(min, Math.min(vw / Math.max(w, 1), vh / Math.max(h, 1)) * 0.94));
  return { k, x: Math.max(24, (vw - w * k) / 2), y: Math.max(24, (vh - h * k) / 2) };
}

/** After a layout change keep the anchor node at the same screen position. */
export function anchorShift(t: { x: number; y: number; k: number }, oldScreen: { x: number; y: number }, node: { x: number; y: number }) {
  return { k: t.k, x: oldScreen.x - node.x * t.k, y: oldScreen.y - node.y * t.k };
}

/**
 * Vertical camera correction after a fold with the clicked card pinned. The card stays put unless the fold would leave
 * more than half the viewport (`vh`) blank above or below the tree while content is hidden past the other edge; then it
 * pulls back just enough. `before` / `after` are the tree's top and bottom on screen; returns the y shift.
 */
export function fillFold(vh: number, before: { top: number; bottom: number }, after: { top: number; bottom: number }, m = 24): number {
  const cap = (vh - 2 * m) / 2;
  const below = (s: { bottom: number }) => Math.max(0, vh - m - s.bottom);
  const above = (s: { top: number }) => Math.max(0, s.top - m);
  const extraBelow = below(after) - Math.max(cap, below(before));
  if (extraBelow > 0) return Math.min(extraBelow, Math.max(0, m - after.top));
  const extraAbove = above(after) - Math.max(cap, above(before));
  if (extraAbove > 0) return -Math.min(extraAbove, Math.max(0, after.bottom - (vh - m)));
  return 0;
}

// ---- motion ---------------------------------------------------------------

type Cam = { x: number; y: number; k: number };

/** What animates on a node: stage position, height (a sheet grows on Show more) and opacity. Width never changes. */
export interface Pose { x: number; y: number; h: number; o: number }
export interface Track { from: Pose; to: Pose; t0: number }
/** A node as it is on screen right now. */
export interface Shown { node: BNode; pose: Pose; track?: Track }

export const MOTION_MS = 320; // --dur-3
/** Share of the duration a fade takes: leaving nodes are gone by half-time so they never pile up, new ones settle before the glide ends. */
const FADE_OUT = 0.5;
const FADE_IN = 0.6;
/** How far a new child starts folded onto its parent's right edge (1 = on the edge), and how little a leaving one drifts back. */
const ENTER = { x: 1, y: 0.4 };
const LEAVE = { x: 0.3, y: 0.15 };
/** New siblings of an already open group (Show more groups) drop in from just above their slot. */
const DROP = 12;

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of linear progress 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const fy = (u: number) => ((ay * u + by) * u + cy) * u;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = fx(u) - t;
      if (Math.abs(e) < 1e-7) return fy(u);
      const d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1;
    u = t;
    while (hi - lo > 1e-7) {
      if (fx(u) < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return fy(u);
  };
}

export const ease = cubicBezier(0.2, 0.8, 0.2, 1); // --ease

export const poseOf = (n: { x: number; y: number; h: number }, o = 1): Pose => ({ x: n.x, y: n.y, h: n.h, o });

const mix = (a: number, b: number, k: number) => (k >= 1 ? b : a + (b - a) * k);

/**
 * Pose of a track at time `now`: position and height ease over the whole duration, a fade runs in the first part of it
 * (a fade-out is linear, so a folding node stays readable while it starts to move instead of blinking out).
 */
export function poseAt(tr: Track, now: number, dur = MOTION_MS): Pose {
  const lin = dur > 0 ? Math.min(1, Math.max(0, (now - tr.t0) / dur)) : 1;
  const p = ease(lin);
  const f = tr.to.o < tr.from.o ? Math.min(1, lin / FADE_OUT) : ease(Math.min(1, lin / FADE_IN));
  return { x: mix(tr.from.x, tr.to.x, p), y: mix(tr.from.y, tr.to.y, p), h: mix(tr.from.h, tr.to.h, p), o: mix(tr.from.o, tr.to.o, f) };
}

/** Maps a pose drawn under camera `from` to the stage position that shows it at the same screen spot under camera `to` (FLIP). */
export const reframe = (from: Cam, to: Cam) => (p: Pose): Pose => ({
  ...p, x: (from.x + p.x * from.k - to.x) / to.k, y: (from.y + p.y * from.k - to.y) / to.k,
});

const offset = (c: { x: number; y: number; h: number }, p: { x: number; y: number; h: number }) => ({ x: c.x - p.x, ly: linkY(c) - linkY(p) });

/** Child pose relative to parent pose `p`, folded by `f` toward the parent's right edge (where its link starts). */
function folded(p: Pose, pw: number, rel: { x: number; ly: number }, f: { x: number; y: number }, h: number): Pose {
  const ly = linkY(p) + rel.ly * (1 - f.y);
  return { x: p.x + pw + (rel.x - pw) * (1 - f.x), y: ly - Math.min(24, h / 2), h, o: 0 };
}

const near = (a: Pose, b: Pose) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.h - b.h) < 0.5 && a.o === b.o;

/**
 * Tracks that take the screen from what is `shown` now (old camera; `shift` maps it into the new one) to layout `next`.
 * Survivors glide from where they are; running tracks that already head to the right place keep their timing;
 * new nodes grow out of their parent's edge and fade in; `gone` nodes fold a little toward their parent and fade out.
 * Nodes that are already in place get no track.
 */
export function planMotion(
  shown: ReadonlyMap<string, Shown>, next: readonly BNode[], gone: readonly BNode[], shift: (p: Pose) => Pose, now: number,
): Map<string, Track> {
  const out = new Map<string, Track>();
  const byId = new Map<string, BNode>(next.map((n) => [n.id, n]));
  for (const n of next) {
    const to = poseOf(n);
    const s = shown.get(n.id);
    if (s) {
      if (s.track && near(shift(s.track.to), to)) out.set(n.id, { from: shift(s.track.from), to, t0: s.track.t0 });
      else if (!near(shift(s.pose), to)) out.set(n.id, { from: shift(s.pose), to, t0: now });
      continue;
    }
    const p = n.parentId ? byId.get(n.parentId) : undefined;
    if (!p) {
      out.set(n.id, { from: { ...to, o: 0 }, to, t0: now });
      continue;
    }
    // parents come first (pre-order), so a parent that moves already has its track
    const p0 = out.get(p.id)?.from ?? poseOf(p);
    const from = shown.get(p.id)?.node.expanded
      ? { x: n.x + p0.x - p.x, y: n.y + p0.y - p.y - DROP, h: n.h, o: 0 }
      : folded(p0, p.w, offset(n, p), ENTER, n.h);
    out.set(n.id, { from, to, t0: now });
  }
  const ghosts = new Map<string, BNode>(gone.map((g) => [g.id, g]));
  for (const g of gone) {
    const s = shown.get(g.id);
    if (!s) continue;
    if (s.track && s.track.to.o === 0) {
      out.set(g.id, { from: shift(s.track.from), to: shift(s.track.to), t0: s.track.t0 });
      continue;
    }
    const cur = shift(s.pose);
    const p = g.parentId ? (byId.get(g.parentId) ?? ghosts.get(g.parentId)) : undefined;
    const ps = p && shown.get(p.id);
    const to = p && ps ? folded(out.get(p.id)?.to ?? poseOf(p), p.w, offset(cur, shift(ps.pose)), LEAVE, cur.h) : { ...cur, o: 0 };
    out.set(g.id, { from: cur, to, t0: now });
  }
  return out;
}
