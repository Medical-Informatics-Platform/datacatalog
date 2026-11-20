import { HttpErrorResponse } from '@angular/common/http';

export interface ServerProblem {
  /** Short heading: "Conflict", "The file has problems", ... */
  title: string;
  /** Verbatim backend message, newlines restored. */
  message: string;
  status: number;
}

const clean = (s: string) => s.replace(/<EOL>/g, '\n').trim();

/** Turn whatever a service rejected with into a presentable problem. */
export function toProblem(err: unknown, action: string): ServerProblem {
  // PathologyService rejects with ready-made strings.
  if (typeof err === 'string') return { title: `Could not ${action}`, message: clean(err), status: 0 };
  if (err instanceof HttpErrorResponse) {
    const b = err.error as unknown;
    let message = '';
    if (typeof b === 'string') message = clean(b);
    else if (b && typeof b === 'object') {
      const o = b as Record<string, unknown>;
      message = String(o['message'] ?? o['error'] ?? '');
    }
    if (!message) message = err.status === 0 ? 'The server could not be reached.' : err.message;
    const title =
      err.status === 409 ? 'Conflict' : err.status === 400 || err.status === 422 ? 'The submission has problems' : `Could not ${action}`;
    return { title, message, status: err.status };
  }
  const message = err instanceof Error ? err.message : 'Unexpected error.';
  return { title: `Could not ${action}`, message, status: 0 };
}
