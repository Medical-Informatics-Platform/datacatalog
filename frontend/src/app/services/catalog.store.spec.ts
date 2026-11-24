import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { CatalogStore } from './catalog.store';
import { SessionService } from './session.service';

const fed = (code: string, inst: number, rec: number, ids: string[]): Federation => ({
  code, title: code, url: 'https://x', description: '', institutions: inst, records: rec, dataModelIds: ids,
});
const model = (uuid: string, released: boolean): Pathology => ({ uuid, label: uuid, code: uuid, version: 'v1', released });

describe('CatalogStore', () => {
  let store: CatalogStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('auth_token');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(CatalogStore);
    http = TestBed.inject(HttpTestingController);
  });

  const flush = (feds: Federation[], models: Pathology[]) => {
    http.expectOne('/services/federations').flush(feds);
    http.expectOne('/services/datamodels').flush(models);
  };

  it('loads federations and models and computes live metrics', () => {
    store.ensureLoaded();
    expect(store.state()).toBe('loading');
    flush([fed('a', 4, 100, ['m1']), fed('b', 0, 2000, [])], [model('m1', true), model('m2', false)]);
    expect(store.state()).toBe('ready');
    expect(store.metrics()).toEqual({ federations: 2, institutions: 4, records: 2100, models: 1 });
  });

  it('hides drafts from non-experts and resolves federation models', () => {
    store.load();
    flush([fed('a', 1, 1, ['m1', 'm2'])], [model('m1', true), model('m2', false)]);
    expect(store.visibleModels().map((m) => m.uuid)).toEqual(['m1']);
    expect(store.federationsWithModels()[0].pathologies.map((m) => m.uuid)).toEqual(['m1']);
  });

  it('shows drafts to domain experts', () => {
    store.load();
    flush([], [model('m1', true), model('m2', false)]);
    TestBed.inject(SessionService).user.set({ username: 'u', fullname: 'U', email: '', subjectId: '', roles: ['DC_DOMAIN_EXPERT'] });
    expect(store.visibleModels().length).toBe(2);
  });

  it('reports an error state so views can offer retry', () => {
    store.load();
    http.expectOne('/services/federations').flush('nope', { status: 500, statusText: 'err' });
    http.match('/services/datamodels');
    expect(store.state()).toBe('error');
  });

  it('assigns stable line colours by sorted federation code', () => {
    store.load();
    flush([fed('b', 0, 0, []), fed('a', 0, 0, [])], []);
    expect(store.lineColor('a')).toBe('var(--line-1)');
    expect(store.lineColor('b')).toBe('var(--line-2)');
    expect(store.lineColor('missing')).toBe('var(--line-1)');
  });
});
