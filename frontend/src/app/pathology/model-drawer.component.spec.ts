import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModelDrawerComponent } from './model-drawer.component';

describe('ModelDrawerComponent upload errors', () => {
  let fixture: ComponentFixture<ModelDrawerComponent>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelDrawerComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: DialogRef, useValue: { close: () => undefined } },
        { provide: DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ModelDrawerComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  const upload = async (status: number, body: object) => {
    (fixture.componentInstance as unknown as { file: { set(f: File): void } }).file.set(new File(['{"code":"x","version":"1"}'], 'x.json'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    let req: ReturnType<HttpTestingController['match']> = [];
    for (let i = 0; i < 100 && !req.length; i++) {
      req = http.match('/services/datamodels');
      if (!req.length) await new Promise((r) => setTimeout(r, 10));
    }
    req[0].flush(body, { status, statusText: 'err' });
    fixture.detectChanges();
  };

  it('shows the backend message verbatim when a JSON upload is rejected with a 409', async () => {
    await upload(409, { error: 'Data model with code: x and version: 1 already exists.' });
    const banner = el().querySelector('.banner.error')!;
    expect(banner.textContent).toContain('already exists.');
    expect(el().querySelector('button[type=submit]')!.hasAttribute('disabled')).toBeFalse(); // drawer stays usable
  });

  it('asks for a file before sending anything', () => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    http.expectNone('/services/datamodels');
    expect(el().textContent).toContain('Choose a .json or .xlsx file.');
  });
});
