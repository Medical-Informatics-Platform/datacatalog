import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Pathology } from '../interfaces/pathology.interface';
import { ModelPickerComponent } from './model-picker.component';

const m = (uuid: string, code: string, version: string, longitudinal = false): Pathology =>
  ({ uuid, label: code, code, version, longitudinal, released: true, variables: [{ label: 'a' }], groups: [] });

function setup(models: Pathology[]) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(ModelPickerComponent);
  f.componentRef.setInput('models', models);
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}

describe('ModelPickerComponent', () => {
  const models = [m('1', 'tbi', 'v7'), m('2', 'tbi', 'v9'), m('3', 'stroke', '3.7'), m('4', 'dementia_long', 'v1', true)];

  it('groups versions of one model into one card, newest first', () => {
    const { el } = setup(models);
    expect(el.querySelectorAll('.fam').length).toBe(1);
    const versions = [...el.querySelectorAll('.row.sub .mono')].map((v) => v.textContent?.trim());
    expect(versions).toEqual(['v9', 'v7']);
  });

  it('links each version row to its model with a deep link', () => {
    const { el } = setup(models);
    const hrefs = [...el.querySelectorAll<HTMLAnchorElement>('a.row')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/pathology?pathologyCode=tbi&version=v9');
  });

  it('filters by text and shows a clear action when nothing matches', () => {
    const { f, el } = setup(models);
    const input = el.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(el.querySelectorAll('a.row').length).toBe(0);
    expect(el.textContent).toContain('No data model matches');
  });
});
