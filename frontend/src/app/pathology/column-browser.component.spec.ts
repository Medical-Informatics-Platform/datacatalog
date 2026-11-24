import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pathology } from '../interfaces/pathology.interface';
import { ROOT_ID, buildIndex } from '../services/pathology-tree';
import { ColumnBrowserComponent } from './column-browser.component';

const model: Pathology = {
  uuid: 'u', label: 'M', code: 'm', version: 'v1', released: true,
  variables: [{ label: 'Dataset', code: 'dataset', type: 'nominal' }],
  groups: [
    {
      label: 'A', code: 'a',
      groups: [{ label: 'A1', code: 'a1', variables: [{ label: 'Deep', code: 'deep', type: 'real' }] }],
      variables: [{ label: 'Age', code: 'age', type: 'integer' }],
    },
    { label: 'B', code: 'b', variables: [{ label: 'Bee', code: 'bee', type: 'text' }] },
  ],
};

describe('ColumnBrowserComponent', () => {
  let fixture: ComponentFixture<ColumnBrowserComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ColumnBrowserComponent);
    fixture.componentRef.setInput('index', buildIndex(model));
  });

  it('shows only the root column when nothing is selected', () => {
    fixture.detectChanges();
    expect(el().querySelectorAll('.col').length).toBe(1);
    expect(el().querySelectorAll('.row').length).toBe(3); // A, B, Dataset
  });

  it('mounts one column per level on the path to a deep variable and marks the path', () => {
    fixture.componentRef.setInput('selectedId', `${ROOT_ID}/g0/g0/v0`);
    fixture.detectChanges();
    expect(el().querySelectorAll('.col').length).toBe(3); // root, A, A1
    const selected = [...el().querySelectorAll('[aria-selected="true"]')].map((r) =>
      r.querySelector('.nm')!.textContent!.trim(),
    );
    expect(selected).toEqual(['A', 'A1', 'Deep']);
  });

  it('emits the node id on click', () => {
    fixture.detectChanges();
    const ids: string[] = [];
    fixture.componentInstance.select.subscribe((id) => ids.push(id));
    (el().querySelector('[data-id="root/g1"]') as HTMLElement).click();
    expect(ids).toEqual(['root/g1']);
  });
});
