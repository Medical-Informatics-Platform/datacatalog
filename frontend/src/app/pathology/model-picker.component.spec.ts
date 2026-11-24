import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { CatalogStore } from '../services/catalog.store';
import { ModelPickerComponent } from './model-picker.component';

const m = (uuid: string, code: string, version: string, longitudinal = false): Pathology =>
  ({ uuid, label: code, code, version, longitudinal, released: true, variables: [{ label: 'a' }], groups: [] });

const fed = (code: string, title: string, ids: string[]): Federation => ({
  code, title, url: '', description: '', institutions: 0, records: 0, dataModelIds: ids,
});

function setup(models: Pathology[], federation?: Federation, federationCode?: string | null) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(ModelPickerComponent);
  f.componentRef.setInput('models', models);
  if (federation) f.componentRef.setInput('federation', federation);
  if (federationCode !== undefined) f.componentRef.setInput('federationCode', federationCode);
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

  it('scopes the list to the federation and names it in the heading', () => {
    const { el } = setup(models, fed('dementia', 'Dementia', ['1', '2']), 'dementia');
    expect(el.querySelector('h2')?.textContent).toContain('Data models in Dementia');
    const hrefs = [...el.querySelectorAll<HTMLAnchorElement>('a.row')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBe(2);
    expect(hrefs.every((h) => h.includes('pathologyCode=tbi'))).toBe(true);
  });

  it('shows the full list with a not-found note when the code does not resolve', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const store = TestBed.inject(CatalogStore);
    const http = TestBed.inject(HttpTestingController);
    store.load();
    http.expectOne('/services/federations').flush([]);
    http.expectOne('/services/datamodels').flush([]);

    const f = TestBed.createComponent(ModelPickerComponent);
    f.componentRef.setInput('models', models);
    f.componentRef.setInput('federationCode', 'nope');
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Federation');
    expect(el.textContent).toContain('nope');
    expect(el.textContent).toContain('not found');
    expect(el.querySelectorAll('a.row').length).toBe(4);
  });

  it('shows no not-found note while the federations are still loading', () => {
    const { el } = setup(models, undefined, 'dementia');
    expect(el.textContent).not.toContain('not found');
    expect(el.querySelectorAll('a.row').length).toBe(4);
  });

  it('emits showAll from the Show all federations control', () => {
    const { f, el } = setup(models, fed('dementia', 'Dementia', ['1']), 'dementia');
    let emitted = 0;
    f.componentInstance.showAll.subscribe(() => emitted++);
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === 'Show all federations');
    expect(buttons.length).toBeGreaterThan(0);
    buttons[0].click();
    f.detectChanges();
    expect(emitted).toBe(1);
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
