import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PathologyFormComponent } from './pathology-form.component';

describe('PathologyFormComponent upload errors', () => {
  let fixture: ComponentFixture<PathologyFormComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PathologyFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PathologyFormComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('shows the backend message in the page when a JSON upload is rejected', async () => {
    fixture.componentInstance.file = new File(['{"code":"x","version":"1"}'], 'x.json');
    fixture.detectChanges(); // enables the submit button
    const btn = fixture.nativeElement.querySelector('form button');
    btn.click();

    let request: ReturnType<HttpTestingController['match']> = [];
    for (let i = 0; i < 100 && request.length === 0; i++) {
      request = http.match('/services/datamodels');
      if (request.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    request[0].flush({ error: 'Data model with code: x and version: 1 already exists.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-message')?.textContent).toContain('already exists.');
  });
});
