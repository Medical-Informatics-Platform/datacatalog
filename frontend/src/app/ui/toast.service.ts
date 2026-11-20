import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { IconComponent } from './icon.component';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const MAX = 3;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  success(text: string): void {
    this.push('success', text, 6000);
  }

  /** Errors stay until dismissed. */
  error(text: string): void {
    this.push('error', text, 0);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  private push(kind: Toast['kind'], text: string, ms: number): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t, { id, kind, text }].slice(-MAX));
    if (ms) setTimeout(() => this.dismiss(id), ms);
  }
}

@Component({
  selector: 'mip-toasts',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast" [class.err]="t.kind === 'error'" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <mip-icon [name]="t.kind === 'error' ? 'alert' : 'check'" />
          <span>{{ t.text }}</span>
          <button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Dismiss" (click)="svc.dismiss(t.id)">
            <mip-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .stack { position: fixed; right: 16px; bottom: 16px; z-index: 2000; display: grid; gap: 8px; width: min(380px, calc(100vw - 32px)); }
      .toast { display: flex; gap: 10px; align-items: flex-start; padding: 12px 8px 12px 14px; background: var(--ink); color: #fff; border-radius: var(--r-md); box-shadow: var(--shadow-overlay); animation: up var(--dur-3) var(--ease); }
      .toast span { flex: 1; padding-top: 1px; overflow-wrap: anywhere; }
      .toast.err { background: var(--error-fg); }
      .toast .btn { color: inherit; }
      .toast .btn:hover { background: rgb(255 255 255 / 0.16); }
      @keyframes up { from { transform: translateY(12px); opacity: 0; } }
      @media (max-width: 600px) { .stack { right: 50%; transform: translateX(50%); } }
    `,
  ],
})
export class ToastHostComponent {
  protected svc = inject(ToastService);
}
