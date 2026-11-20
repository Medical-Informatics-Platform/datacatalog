import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PathologyService } from './pathology.service';

describe('PathologyService error messages', () => {
  let service: PathologyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PathologyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the backend error text when a JSON upload conflicts', async () => {
    const file = new File(['{"code":"x","version":"1"}'], 'x.json', { type: 'application/json' });
    const result = new Promise<string>((resolve) =>
      service.createPathologyFromJson(file).subscribe({ error: resolve })
    );

    // The file is read asynchronously, so the request appears a moment later.
    let request: ReturnType<HttpTestingController['match']> = [];
    for (let i = 0; i < 100 && request.length === 0; i++) {
      request = http.match('/services/datamodels');
      if (request.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    request[0].flush(
      { error: 'Data model with code: x and version: 1 already exists.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(await result).toBe(
      'Error while creating JSON pathology: Data model with code: x and version: 1 already exists.'
    );
  });

  it('shows the backend error text when an Excel upload is rejected', (done) => {
    const file = new File(['x'], 'x.xlsx');

    service.createPathologyFromExcel(file, '1', 'false').subscribe({
      error: (message) => {
        expect(message).toBe("Error while creating Excel pathology: On :age got: Missing value for required column 'name'.");
        done();
      },
    });

    http
      .expectOne('/services/datamodels/import')
      .flush({ error: "On :age got: Missing value for required column 'name'." }, { status: 400, statusText: 'Bad Request' });
  });
});
