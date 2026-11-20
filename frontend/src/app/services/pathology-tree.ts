import { Group, Pathology, Variable } from '../interfaces/pathology.interface';
import { Federation } from '../interfaces/federations.interface';

export type NodeKind = 'group' | 'variable';
export type KindFilter = 'all' | 'variable' | 'group';

export interface Crumb {
  id: string;
  label: string;
}

export interface TreeNode {
  id: string;
  kind: NodeKind;
  label: string;
  code: string;
  description: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** Ancestors from the model root (inclusive) down to the node itself. */
  path: Crumb[];
  childIds: string[];
  /** Direct child group / variable counts (groups only). */
  groupCount: number;
  variableCount: number;
  /** All variables below this group, recursively. */
  totalVariables: number;
  variable?: Variable;
}

export interface TreeIndex {
  rootId: string;
  nodes: Map<string, TreeNode>;
  variableTypes: string[];
}

export const ROOT_ID = 'root';

export function buildIndex(model: Pathology): TreeIndex {
  const nodes = new Map<string, TreeNode>();
  const types = new Set<string>();

  const add = (
    parent: TreeNode,
    kind: NodeKind,
    index: number,
    src: Group | Variable,
  ): TreeNode => {
    const id = `${parent.id}/${kind === 'group' ? 'g' : 'v'}${index}`;
    const v = kind === 'variable' ? (src as Variable) : undefined;
    const node: TreeNode = {
      id,
      kind,
      label: src.label ?? src.code ?? '',
      code: src.code ?? '',
      description: v?.description ?? '',
      type: v?.type ?? '',
      depth: parent.depth + 1,
      parentId: parent.id,
      path: [...parent.path, { id, label: src.label ?? src.code ?? '' }],
      childIds: [],
      groupCount: 0,
      variableCount: 0,
      totalVariables: kind === 'variable' ? 1 : 0,
      variable: v,
    };
    nodes.set(id, node);
    parent.childIds.push(id);
    if (v?.type) types.add(v.type);
    return node;
  };

  const fill = (node: TreeNode, src: { groups?: Group[]; variables?: Variable[] }) => {
    (src.groups ?? []).forEach((g, i) => {
      const child = add(node, 'group', i, g);
      fill(child, g);
      node.groupCount++;
      node.totalVariables += child.totalVariables;
    });
    (src.variables ?? []).forEach((v, i) => {
      add(node, 'variable', i, v);
      node.variableCount++;
      node.totalVariables++;
    });
  };

  const root: TreeNode = {
    id: ROOT_ID,
    kind: 'group',
    label: model.label,
    code: model.code ?? '',
    description: '',
    type: '',
    depth: 0,
    parentId: null,
    path: [{ id: ROOT_ID, label: model.label }],
    childIds: [],
    groupCount: 0,
    variableCount: 0,
    totalVariables: 0,
  };
  nodes.set(ROOT_ID, root);
  fill(root, model);

  return { rootId: ROOT_ID, nodes, variableTypes: [...types].sort() };
}

export interface SearchQuery {
  text: string;
  kind: KindFilter;
  type: string; // '' = any
}

const norm = (s: string) => s.toLowerCase();

/** Ranked search: label/code hits before description hits; exact code first. */
export function searchNodes(index: TreeIndex, q: SearchQuery, limit = 200): TreeNode[] {
  const text = norm(q.text.trim());
  const out: { node: TreeNode; score: number }[] = [];
  for (const node of index.nodes.values()) {
    if (node.id === index.rootId) continue;
    if (q.kind !== 'all' && node.kind !== q.kind) continue;
    if (q.type && node.type !== q.type) continue;
    if (!text) {
      out.push({ node, score: 0 });
      continue;
    }
    const label = norm(node.label);
    const code = norm(node.code);
    let score = -1;
    if (code === text) score = 100;
    else if (label.startsWith(text) || code.startsWith(text)) score = 80;
    else if (label.includes(text) || code.includes(text)) score = 60;
    else if (norm(node.description).includes(text)) score = 30;
    if (score >= 0) out.push({ node, score });
  }
  out.sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label));
  return out.slice(0, limit).map((r) => r.node);
}

/** Numeric-aware version compare: v5 < v81, 3.7 < 3.10, '1.0' == '1.0'. */
export function compareVersions(a = '', b = ''): number {
  const parts = (s: string) => s.match(/\d+|[a-z]+/gi) ?? [];
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) {
      if (+x !== +y) return +x - +y;
    } else if (x !== y) {
      return x.localeCompare(y);
    }
  }
  return 0;
}

export function pickLatest(models: Pathology[]): Pathology | undefined {
  return [...models].sort((a, b) => compareVersions(b.version, a.version))[0];
}

/** Models a federation exposes; all models when no federation is selected. */
export function modelsFor(models: Pathology[], federation: Federation | undefined): Pathology[] {
  return federation ? models.filter((m) => federation.dataModelIds.includes(m.uuid)) : models;
}

/**
 * Resolve a pathologyCode query (matches code or label, case-insensitive).
 * An exact `version` wins; else latest=true returns the highest version, else the first match.
 */
export function resolvePathology(
  models: Pathology[],
  pathologyCode: string | null,
  latest: boolean,
  version: string | null = null,
): Pathology | undefined {
  if (!pathologyCode) return undefined;
  const c = pathologyCode.toLowerCase();
  const hits = models.filter(
    (m) => m.code?.toLowerCase() === c || m.label?.toLowerCase() === c,
  );
  if (version) {
    const exact = hits.find((m) => m.version === version);
    if (exact) return exact;
  }
  return latest ? pickLatest(hits) : hits[0];
}

export function formatCount(n: number | string | null | undefined): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('en-US') : '–';
}

/** Split text into plain/highlighted parts for a case-insensitive query. */
export function highlightParts(text: string, query: string): { t: string; hit: boolean }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ t: text, hit: false }];
  const out: { t: string; hit: boolean }[] = [];
  const low = text.toLowerCase();
  let i = 0;
  for (let j = low.indexOf(q, i); j !== -1; j = low.indexOf(q, i)) {
    if (j > i) out.push({ t: text.slice(i, j), hit: false });
    out.push({ t: text.slice(j, j + q.length), hit: true });
    i = j + q.length;
  }
  if (i < text.length) out.push({ t: text.slice(i), hit: false });
  return out;
}

/** Cheap size summary for pickers (no index build). */
export function modelSize(model: Pathology): { variables: number; groups: number } {
  const walk = (g: { groups?: Group[]; variables?: Variable[] }): { variables: number; groups: number } => {
    let variables = (g.variables ?? []).length;
    let groups = (g.groups ?? []).length;
    for (const s of g.groups ?? []) {
      const r = walk(s);
      variables += r.variables;
      groups += r.groups;
    }
    return { variables, groups };
  };
  return walk(model);
}
