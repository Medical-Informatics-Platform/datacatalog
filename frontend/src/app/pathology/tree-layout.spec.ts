import { Group, Pathology, Variable } from '../interfaces/pathology.interface';
import { ROOT_ID, buildIndex } from '../services/pathology-tree';
import {
  BState, GROUPS_PAGE, INITIAL_ROWS, Measure, anchorShift, defaultExpanded, expandPath, fitTransform, layoutTree, zoomAt,
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
