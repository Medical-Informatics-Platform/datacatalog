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
      const x1 = t.n.x + t.n.w;
      const x2 = k.n.x;
      const y1 = t.n.y + Math.min(24, t.n.h / 2);
      const y2 = k.n.y + Math.min(24, k.n.h / 2);
      const xm = (x1 + x2) / 2;
      links.push({ id: k.n.id, d: `M${x1},${y1}C${xm},${y1} ${xm},${y2} ${x2},${y2}`, route: route.has(k.n.id) && route.has(t.n.id) });
    }
  };
  place(tree, 0);

  const width = Math.max(...nodes.map((n) => n.x + n.w));
  return { nodes, links, width, height: tree.block };
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
