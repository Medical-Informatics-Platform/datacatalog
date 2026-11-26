import { Group, Pathology, Variable } from '../interfaces/pathology.interface';
import { ROOT_ID, buildIndex } from '../services/pathology-tree';
import {
  BNode, BState, GROUPS_PAGE, INITIAL_ROWS, MOTION_MS, Measure, Pose, Shown, anchorShift, cubicBezier, defaultExpanded, ease, expandPath, expandToDepth, fillFold,
  fitTransform, layoutTree, linkPath, planMotion, poseAt, poseOf, reframe, zoomAt,
} from './tree-layout';

const vars = (n: number, prefix = 'v'): Variable[] =>
  Array.from({ length: n }, (_, i) => ({ label: `${prefix}${i}`, code: `${prefix}${i}`, type: i % 2 ? 'real' : 'nominal' }));
const group = (label: string, v: number, groups: Group[] = []): Group => ({ label, code: label, variables: vars(v, label), groups });
const model = (groups: Group[], variables: Variable[] = []): Pathology => ({ uuid: 'u', label: 'M', code: 'm', version: 'v1', released: true, groups, variables });
/** 7px per character, wrapped greedily by width: enough to make long labels taller. */
const measure: Measure = (t, _f, w) => Math.max(1, Math.ceil((t.length * 7) / w));
const state = (over: Partial<BState> = {}): BState => ({
  expanded: new Set(), rowsShown: new Map(), groupsShown: new Map(), compact: false, selectedId: null, matchIds: new Set(), ...over,
});
const allGroups = (ix: ReturnType<typeof buildIndex>) => new Set([...ix.nodes.values()].filter((n) => n.kind === 'group').map((n) => n.id));

describe('tree-layout', () => {
  const shapes: [string, Pathology][] = [
    ['tiny', model([group('Only', 13)])],
    ['wide', model(Array.from({ length: 20 }, (_, i) => group(`Domain ${i} with a rather long clinical label`, 5, [group(`Sub ${i}`, 4), group(`Other ${i}`, 61)])))],
    ['deep', model([group('A', 2, [group('B', 3, [group('C', 4, [group('D', 5)])])])], vars(3, 'root'))],
    ['single', model([group('Everything', 0, Array.from({ length: 30 }, (_, i) => group(`G${i}`, i % 7)))])],
  ];

  it('never overlaps two nodes in the same column, fully expanded', () => {
    for (const [name, m] of shapes) {
      const ix = buildIndex(m);
      const l = layoutTree(ix, state({ expanded: allGroups(ix), rowsShown: new Map([...allGroups(ix)].map((g) => [g, 999])) }), measure);
      const cols = new Map<number, typeof l.nodes>();
      l.nodes.forEach((n) => cols.set(n.depth, [...(cols.get(n.depth) ?? []), n]));
      for (const col of cols.values()) {
        const s = [...col].sort((a, b) => a.y - b.y);
        s.slice(1).forEach((n, i) => expect(n.y).withContext(`${name}: ${n.id} overlaps ${s[i].id}`).toBeGreaterThanOrEqual(s[i].y + s[i].h - 0.001));
      }
    }
  });

  it('makes taller cards for longer labels (no truncation)', () => {
    const ix = buildIndex(model([group('Short', 1), group('A very long clinical group label that needs several wrapped lines', 1)]));
    const l = layoutTree(ix, state(), measure);
    const short = l.nodes.find((n) => n.node?.label === 'Short')!;
    const long = l.nodes.find((n) => n.node?.label.startsWith('A very long'))!;
    expect(long.lines).toBeGreaterThan(short.lines);
    expect(long.h).toBeGreaterThan(short.h);
  });

  it('puts direct variables in one sheet and pages the rows', () => {
    const ix = buildIndex(model([group('Big', 61)]));
    const open = state({ expanded: new Set(['root/g0']) });
    const sheet = layoutTree(ix, open, measure).nodes.find((n) => n.kind === 'sheet')!;
    expect(sheet.rows!.length).toBe(INITIAL_ROWS);
    expect(sheet.total).toBe(61);
    expect(sheet.hidden).toBe(61 - INITIAL_ROWS);
    const more = layoutTree(ix, { ...open, rowsShown: new Map([['root/g0', 30]]) }, measure).nodes.find((n) => n.kind === 'sheet')!;
    expect(more.rows!.length).toBe(30);
    expect(more.hidden).toBe(31);
  });

  it('keeps the selected variable and search hits visible beyond the preview', () => {
    const ix = buildIndex(model([group('Big', 61)]));
    const sel = 'root/g0/v40';
    const l = layoutTree(ix, state({ expanded: new Set(['root/g0']), selectedId: sel, matchIds: new Set(['root/g0/v55']) }), measure);
    const rows = l.nodes.find((n) => n.kind === 'sheet')!.rows!;
    expect(rows.filter((r) => r.extra).map((r) => r.node.id)).toEqual([sel, 'root/g0/v55']);
  });

  it('pages wide group lists but keeps the route reachable', () => {
    const ix = buildIndex(model([group('Parent', 0, Array.from({ length: 40 }, (_, i) => group(`G${i}`, 1)))]));
    const sel = 'root/g0/g35';
    const l = layoutTree(ix, state({ expanded: new Set(['root/g0']), selectedId: sel }), measure);
    const kids = l.nodes.filter((n) => n.parentId === 'root/g0');
    expect(kids.filter((n) => n.kind === 'group').length).toBe(GROUPS_PAGE + 1); // 24 + the routed group
    expect(kids.find((n) => n.kind === 'more')!.left).toBe(40 - GROUPS_PAGE - 1);
    expect(kids.some((n) => n.id === sel)).toBeTrue();
  });

  it('opens small models fully and large ones one level, and a lone root group', () => {
    expect(defaultExpanded(buildIndex(shapes[0][1])).size).toBe(1);
    const big = buildIndex(model(Array.from({ length: 15 }, (_, i) => group(`D${i}`, 80))));
    expect(defaultExpanded(big).size).toBe(0);
    const lone = buildIndex(model([group('Everything', 0, Array.from({ length: 30 }, (_, i) => group(`G${i}`, 9)))]));
    expect(defaultExpanded(lone).has('root/g0')).toBeTrue();
  });

  it('expands the path to a node and lets the accordion close open siblings', () => {
    const ix = buildIndex(model([group('A', 1, [group('A1', 2)]), group('B', 1, [group('B1', 2)])]));
    const start = new Set(['root/g1']);
    expect([...expandPath(ix, 'root/g0/g0/v0', start, false)].sort()).toEqual(['root/g0', 'root/g0/g0', 'root/g1']);
    expect([...expandPath(ix, 'root/g0/g0/v0', start, true)].sort()).toEqual(['root/g0', 'root/g0/g0']);
    expect(expandPath(ix, null, start, true)).toEqual(start);
  });

  it('expands groups to a chosen depth', () => {
    const ix = buildIndex(model([group('A', 1, [group('A1', 2, [group('A11', 1)])]), group('B', 1)]));
    expect(expandToDepth(ix, 1).size).toBe(0);
    expect([...expandToDepth(ix, 2)].sort()).toEqual(['root/g0', 'root/g1']);
    expect([...expandToDepth(ix, 3)].sort()).toEqual(['root/g0', 'root/g0/g0', 'root/g1']);
    expect([...expandToDepth(ix, 4)].sort()).toEqual(['root/g0', 'root/g0/g0', 'root/g0/g0/g0', 'root/g1']);
  });

  it('draws the route links only along the selection path', () => {
    const ix = buildIndex(model([group('A', 1), group('B', 1)]));
    const l = layoutTree(ix, state({ expanded: new Set(['root/g0', 'root/g1']), selectedId: 'root/g0/v0' }), measure);
    expect(l.links.filter((k) => k.route).map((k) => k.id).sort()).toEqual(['root/g0', 'root/g0#vars']);
  });

  it('zooms around the cursor, fits within readable scale and pins an anchor', () => {
    const z = zoomAt({ x: 10, y: 20, k: 1 }, 1.5, 200, 100);
    expect((200 - z.x) / z.k).toBeCloseTo((200 - 10) / 1, 5); // world point under the cursor stays put
    expect(zoomAt({ x: 0, y: 0, k: 1.7 }, 2, 0, 0).k).toBe(1.8);
    expect(fitTransform(1000, 600, 4000, 4000).k).toBe(0.55);
    expect(fitTransform(1000, 600, 100, 100).k).toBe(1.1);
    const a = anchorShift({ x: 5, y: 5, k: 0.8 }, { x: 300, y: 200 }, { x: 312, y: 410 });
    expect(a.y + 410 * 0.8).toBeCloseTo(200, 5);
    expect(a.x + 312 * 0.8).toBeCloseTo(300, 5);
  });
});

describe('fillFold', () => {
  const vh = 600;
  it('keeps the clicked card still when the fold leaves at most half the viewport blank', () => {
    // tree top drops 200px into view, content still hidden below
    expect(fillFold(vh, { top: 24, bottom: 1400 }, { top: 224, bottom: 1200 })).toBe(0);
    // small tree floating in the viewport
    expect(fillFold(vh, { top: 100, bottom: 500 }, { top: 150, bottom: 450 })).toBe(0);
  });

  it('pulls back only the excess blank band, and only as far as hidden content reaches', () => {
    const cap = (vh - 48) / 2;
    // the fold leaves 400px blank below while the top of the tree is hidden 1000px above
    expect(fillFold(vh, { top: -1000, bottom: 900 }, { top: -1000, bottom: 176 })).toBeCloseTo(400 - cap, 5);
    // same band, but only 30px hidden above: never pull the top into view
    expect(fillFold(vh, { top: -6, bottom: 900 }, { top: -6, bottom: 176 })).toBe(30);
    // blank band above: shift up
    expect(fillFold(vh, { top: 24, bottom: 2000 }, { top: 500, bottom: 1500 })).toBeCloseTo(-(476 - cap), 5);
  });
});

describe('tree motion', () => {
  const box = (id: string, x: number, y: number, h = 60, over: Partial<BNode> = {}): BNode => ({
    id, kind: 'group', groupId: id, depth: x / 312, x, y, w: 232, h, parentId: null, compact: false, lines: 1, expanded: false, openable: true, ...over,
  });
  const show = (n: BNode, pose: Pose = poseOf(n)): Shown => ({ node: n, pose });
  const id = (p: Pose) => p;

  it('evaluates the --ease curve like CSS', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(cubicBezier(0, 0, 1, 1)(0.3)).toBeCloseTo(0.3, 5);
    expect(cubicBezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 5);
    const xs = Array.from({ length: 21 }, (_, i) => ease(i / 20));
    xs.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(xs[i]));
    expect(ease(0.25)).toBeGreaterThan(0.6); // decelerating: most of the glide happens early
  });

  it('runs a track from its start pose to exactly its end pose, fading out by half-time', () => {
    const tr = { from: { x: 0, y: 0, h: 40, o: 1 }, to: { x: 100, y: -50, h: 80, o: 0 }, t0: 1000 };
    expect(poseAt(tr, 1000)).toEqual(tr.from);
    expect(poseAt(tr, 1000 + MOTION_MS)).toEqual(tr.to);
    expect(poseAt(tr, 1000 + MOTION_MS / 2).o).toBe(0);
    const mid = poseAt(tr, 1000 + MOTION_MS / 4);
    expect(mid.o).toBeCloseTo(0.5, 5);
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(100);
  });

  it('reframes a pose so it keeps its screen position under a new camera', () => {
    const a = { x: 30, y: -40, k: 0.8 }, b = { x: -120, y: 75, k: 0.8 };
    const p = reframe(a, b)({ x: 400, y: 300, h: 50, o: 1 });
    expect(p.x * b.k + b.x).toBeCloseTo(400 * a.k + a.x, 9);
    expect(p.y * b.k + b.y).toBeCloseTo(300 * a.k + a.y, 9);
  });

  it('gives no track to a node already in place, and glides a moved one from where it is shown', () => {
    const still = box('a', 0, 100);
    const moved = box('b', 0, 300);
    const shown = new Map([['a', show(still)], ['b', show(box('b', 0, 200))]]);
    const t = planMotion(shown, [still, moved], [], id, 5);
    expect(t.has('a')).toBeFalse();
    expect(t.get('b')).toEqual({ from: { x: 0, y: 200, h: 60, o: 1 }, to: { x: 0, y: 300, h: 60, o: 1 }, t0: 5 });
  });

  it('keeps the timing of a running track that already heads to the right place', () => {
    const n = box('a', 0, 300);
    const running = { from: { x: 0, y: 100, h: 60, o: 1 }, to: { x: 0, y: 300, h: 60, o: 1 }, t0: 0 };
    const t = planMotion(new Map([['a', { node: n, pose: poseAt(running, 100), track: running }]]), [n], [], id, 100);
    expect(t.get('a')).toEqual(running);
  });

  it('grows new children out of their parent and folds leaving ones back while they fade', () => {
    const parent = box('p', 0, 200, 60, { expanded: true });
    const kid = box('p/k', 312, 120, 60, { parentId: 'p' });
    const shownClosed = new Map([['p', show({ ...parent, expanded: false })]]);
    const enter = planMotion(shownClosed, [parent, kid], [], id, 0).get('p/k')!;
    expect(enter.from.o).toBe(0);
    expect(enter.from.x).toBe(parent.x + parent.w); // starts on the parent's right edge
    expect(Math.abs(enter.from.y - parent.y)).toBeLessThan(Math.abs(kid.y - parent.y)); // folded toward it
    expect(enter.to).toEqual(poseOf(kid));

    const shownOpen = new Map([['p', show(parent)], ['p/k', show(kid)]]);
    const leave = planMotion(shownOpen, [{ ...parent, expanded: false }], [kid], id, 0).get('p/k')!;
    expect(leave.from).toEqual(poseOf(kid));
    expect(leave.to.o).toBe(0);
    expect(leave.to.x).toBeLessThan(kid.x); // drifts back toward the parent...
    expect(leave.to.x).toBeGreaterThan(parent.x + parent.w); // ...but only a little, so leaving cards never pile up
  });

  it('turns a leaving node around from its current pose when it comes back mid-fade', () => {
    const parent = box('p', 0, 200, 60, { expanded: true });
    const kid = box('p/k', 312, 120, 60, { parentId: 'p' });
    const leaving = { from: poseOf(kid), to: { x: 300, y: 140, h: 60, o: 0 }, t0: 0 };
    const now = MOTION_MS / 5;
    const cur = poseAt(leaving, now);
    const t = planMotion(new Map([['p', show(parent)], ['p/k', { node: kid, pose: cur, track: leaving }]]), [parent, kid], [], id, now).get('p/k')!;
    expect(t.from).toEqual(cur);
    expect(t.to).toEqual(poseOf(kid));
    expect(t.t0).toBe(now);
  });

  it('draws links exactly as the layout does', () => {
    const ix = buildIndex(model([group('A', 2, [group('B', 1)])]));
    const l = layoutTree(ix, state({ expanded: allGroups(ix) }), measure);
    const byId = new Map(l.nodes.map((n) => [n.id, n]));
    for (const k of l.links) expect(linkPath(byId.get(byId.get(k.id)!.parentId!)!, byId.get(k.id)!)).toBe(k.d);
  });
});
