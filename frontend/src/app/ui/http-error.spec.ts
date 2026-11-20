import { HttpErrorResponse } from '@angular/common/http';
import { toProblem } from './http-error';

describe('toProblem', () => {
  it('keeps a 409 body verbatim and titles it Conflict', () => {
    const p = toProblem(new HttpErrorResponse({ status: 409, error: 'Data model dementia v5 already exists' }), 'import');
    expect(p).toEqual({ title: 'Conflict', message: 'Data model dementia v5 already exists', status: 409 });
  });

  it('restores <EOL> newlines in validation output', () => {
    const p = toProblem(new HttpErrorResponse({ status: 400, error: 'Row 3: bad type<EOL>Row 9: missing code' }), 'import');
    expect(p.message).toBe('Row 3: bad type\nRow 9: missing code');
    expect(p.title).toBe('The submission has problems');
  });

  it('reads message from a JSON body and passes through strings', () => {
    expect(toProblem(new HttpErrorResponse({ status: 500, error: { message: 'boom' } }), 'save').message).toBe('boom');
    expect(toProblem('Error parsing JSON file: x', 'import').message).toBe('Error parsing JSON file: x');
  });

  it('explains an unreachable server', () => {
    expect(toProblem(new HttpErrorResponse({ status: 0 }), 'save').message).toContain('could not be reached');
  });
});
