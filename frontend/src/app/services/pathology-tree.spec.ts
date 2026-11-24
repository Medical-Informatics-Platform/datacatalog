import { Pathology } from '../interfaces/pathology.interface';
import { Federation } from '../interfaces/federations.interface';
import {
  ROOT_ID,
  buildIndex,
  compareVersions,
  formatCount,
  highlightParts,
  modelsFor,
  pickLatest,
  resolvePathology,
  searchNodes,
} from './pathology-tree';

const model: Pathology = {
  uuid: 'u1',
  label: 'Dementia',
  code: 'dementia',
  version: 'v5',
  released: true,
  variables: [{ label: 'Dataset', code: 'dataset', type: 'nominal', description: 'Which cohort' }],
  groups: [
    {
      label: 'Demographics',
      code: 'demographics',
      variables: [
        { label: 'Age', code: 'subjectage', type: 'real', description: 'Age in years', units: 'years' },
        { label: 'Gender', code: 'gender', type: 'nominal', isCategorical: true },
      ],
      groups: [
        { label: 'Education', code: 'edu', variables: [{ label: 'Years of education', code: 'edu_years', type: 'integer' }] },
      ],
    },
  ],
};

describe('pathology-tree', () => {
  it('indexes groups and variables with paths and counts', () => {
    const idx = buildIndex(model);
    const root = idx.nodes.get(ROOT_ID)!;
    expect(root.totalVariables).toBe(4);
    expect(root.groupCount).toBe(1);
    expect(root.variableCount).toBe(1);
    const demo = idx.nodes.get(root.childIds[0])!;
    expect(demo.kind).toBe('group');
    expect(demo.totalVariables).toBe(3);
    const age = [...idx.nodes.values()].find((n) => n.code === 'subjectage')!;
    expect(age.path.map((c) => c.label)).toEqual(['Dementia', 'Demographics', 'Age']);
    expect(age.depth).toBe(2);
    expect(idx.variableTypes).toEqual(['integer', 'nominal', 'real']);
  });

  it('searches by label, code and description with ranking and filters', () => {
    const idx = buildIndex(model);
    const q = (text: string, kind: 'all' | 'variable' | 'group' = 'all', type = '') =>
      searchNodes(idx, { text, kind, type }).map((n) => n.code);
    expect(q('age')[0]).toBe('subjectage'); // label prefix beats description hit
    expect(q('years')).toContain('subjectage'); // description match
    expect(q('demo', 'group')).toEqual(['demographics']);
    expect(q('demo', 'variable')).toEqual([]);
    expect(q('', 'variable', 'nominal')).toEqual(['dataset', 'gender']);
  });

  it('compares versions numerically', () => {
    expect(compareVersions('v5', 'v81')).toBeLessThan(0);
    expect(compareVersions('3.7', '3.10')).toBeLessThan(0);
    expect(compareVersions('1.0', '1.0')).toBe(0);
    expect(pickLatest([{ ...model, version: 'v7' }, { ...model, version: 'v81' }, { ...model, version: 'v9' }])?.version).toBe('v81');
  });

  it('resolves pathologyCode by code or label, honouring latest', () => {
    const a = { ...model, uuid: 'a', code: 'tbi', label: 'TBI', version: 'v7' };
    const b = { ...model, uuid: 'b', code: 'tbi', label: 'TBI', version: 'v9' };
    expect(resolvePathology([a, b], 'TBI', false)?.uuid).toBe('a');
    expect(resolvePathology([a, b], 'tbi', true)?.uuid).toBe('b');
    expect(resolvePathology([a, b], 'tbi', false, 'v9')?.uuid).toBe('b');
    expect(resolvePathology([a, b], 'nope', true)).toBeUndefined();
    expect(resolvePathology([a, b], null, true)).toBeUndefined();
  });

  it('filters models to a federation dataModelIds', () => {
    const fed = { dataModelIds: ['u1'] } as Federation;
    const other = { ...model, uuid: 'u2' };
    expect(modelsFor([model, other], fed).map((m) => m.uuid)).toEqual(['u1']);
    expect(modelsFor([model, other], undefined).length).toBe(2);
  });

  it('formats counts', () => {
    expect(formatCount(2066381)).toBe('2,066,381');
    expect(formatCount('6348')).toBe('6,348');
    expect(formatCount(undefined)).toBe('–');
  });

  it('splits highlight parts case-insensitively', () => {
    expect(highlightParts('Subject Age', 'age')).toEqual([{ t: 'Subject ', hit: false }, { t: 'Age', hit: true }]);
    expect(highlightParts('abc', '')).toEqual([{ t: 'abc', hit: false }]);
    expect(highlightParts('abc', 'x')).toEqual([{ t: 'abc', hit: false }]);
  });
});
