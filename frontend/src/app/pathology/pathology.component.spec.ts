import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PathologyComponent } from './pathology.component';

const fed = {
  code: 'dementia', title: 'Dementia', url: '', description: '', institutions: 4, records: 100, dataModelIds: ['m1'],
};
const model = { uuid: 'm1', label: 'Dementia', code: 'dementia', version: 'v5', released: true };

describe('PathologyComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PathologyComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([{ path: 'pathology', component: PathologyComponent }]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const ready = async () => {
    const harness = await RouterTestingHarness.create('/pathology?federationCode=dementia');
    http.expectOne('/services/federations').flush([fed]);
    http.expectOne('/services/datamodels').flush([model]);
    harness.fixture.detectChanges();
    return harness;
  };

  it('renders the picker scoped to the federation in the URL', async () => {
    const harness = await ready();
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('mip-model-picker h2')?.textContent).toContain('Data models in Dementia');
  });

  it('keeps federationCode in the URL when picking a model', async () => {
    const harness = await ready();
    const el = harness.routeNativeElement as HTMLElement;
    const href = el.querySelector<HTMLAnchorElement>('mip-model-picker a.row')?.getAttribute('href') ?? '';
    expect(href).toContain('federationCode=dementia');
    expect(href).toContain('pathologyCode=dementia');
  });
});
