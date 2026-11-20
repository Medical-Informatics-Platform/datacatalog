import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pathology } from '../interfaces/pathology.interface';
import { buildIndex, searchNodes } from '../services/pathology-tree';
import { ResultListComponent } from './result-list.component';

const model: Pathology = {
  uuid: 'u', label: 'M', code: 'm', version: 'v1', released: true,
  groups: [{ label: 'CSF', code: 'csf', variables: [{ label: '3rd ventricle', code: '_3rdventricle', type: 'real', description: 'Volume' }] }],
};

describe('ResultListComponent', () => {
  let fixture: ComponentFixture<ResultListComponent>;

  beforeEach(() => {
    const ix = buildIndex(model);
    fixture = TestBed.createComponent(ResultListComponent);
    fixture.componentRef.setInput('results', searchNodes(ix, { text: 'ventr', kind: 'all', type: '' }));
    fixture.componentRef.setInput('query', 'ventr');
    fixture.detectChanges();
  });

  it('highlights the match without splitting the word', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.nm')!.textContent).toBe('3rd ventricle');
    expect(el.querySelector('.nm mark')!.textContent).toBe('ventr');
  });

  it('emits the node id when a result is picked', () => {
    const picked: string[] = [];
    fixture.componentInstance.pick.subscribe((id) => picked.push(id));
    (fixture.nativeElement.querySelector('.hit') as HTMLElement).click();
    expect(picked).toEqual(['root/g0/v0']);
  });
});
