import { Injectable, signal } from '@angular/core';

/** Focus mode hides site chrome so the explorer can fill the viewport. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly focus = signal(false);
}
