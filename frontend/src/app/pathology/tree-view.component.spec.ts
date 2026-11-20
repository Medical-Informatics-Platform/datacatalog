import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pathology } from '../interfaces/pathology.interface';
import { buildIndex } from '../services/pathology-tree';
import { TreeViewComponent } from './tree-view.component';

const model: Pathology = {
  uuid: 'u', label: 'M', code: 'm', version: 'v1', released: true,
  variables: [{ label: 'Dataset', code: 'dataset', type: 'nominal' }],
  groups: [
    { label: 'Alpha', code: 'alpha', variables: [{ label: 'Age', code: 'age', type: 'integer' }, { label: 'Sex', code: 'sex', type: 'nominal' }] },
    { label: 'Beta', code: 'beta', variables: [{ label: 'Bee', code: 'bee', type: 'text' }] },
  ],
};

describe('TreeViewComponent', () => {
  let fixture: ComponentFixture<TreeViewComponent>;
  let picked: (string | null)[];
  const el = () => fixture.nativeElement as HTMLElement;
  const item = (id: string) => el().querySelector<HTMLElement>(`[data-id="${id}"]`)!;

  beforeEach(() => {
    picked = [];
    fixture = TestBed.createComponent(TreeViewComponent);
    fixture.componentRef.setInput('index', buildIndex(model));
    fixture.componentInstance.select.subscribe((id) => picked.push(id));
    fixture.detectChanges();
  });

  it('opens a small model fully: group cards plus one variable list per group', () => {
    expect(item('root/g0').getAttribute('aria-expanded')).toBe('true');
    expect(item('root/g0/v0').textContent).toContain('Age');
    expect(item('root/g1/v0').textContent).toContain('Bee');
    expect(item('root/g0').textContent).toContain('Alpha');
  });

  it('emits the group id when a group card is clicked and the variable id for a row', () => {
    item('root/g1').click();
    item('root/g0/v1').click();
    expect(picked).toEqual(['root/g1', 'root/g0/v1']);
  });

  it('collapses with the chevron without selecting', () => {
    (item('root/g0').querySelector('.chev') as HTMLElement).click();
    fixture.detectChanges();
    expect(picked).toEqual([]);
    expect(item('root/g0').getAttribute('aria-expanded')).toBe('false');
    expect(el().querySelector('[data-id="root/g0/v0"]')).toBeNull();
  });

  it('marks the selected variable and expands the path to it', () => {
    fixture.componentRef.setInput('selectedId', 'root/g1/v0');
    fixture.detectChanges();
    expect(item('root/g1/v0').getAttribute('aria-selected')).toBe('true');
    expect(item('root/g1/v0').textContent).toContain('bee'); // selected row also shows its code
  });

  it('shows hit badges on collapsed ancestors of search matches', () => {
    (item('root/g0').querySelector('.chev') as HTMLElement).click();
    fixture.componentRef.setInput('searching', true);
    fixture.componentRef.setInput('matchIds', ['root/g0/v1']);
    fixture.detectChanges();
    expect(item('root/g0').querySelector('.hb')!.textContent).toBe('1');
  });
});
