import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'mip-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap page">
      <h1>Account</h1>
      @if (session.user(); as u) {
        <dl class="dl">
          <dt>Full name</dt><dd>{{ u.fullname }}</dd>
          <dt>Username</dt><dd class="mono">{{ u.username }}</dd>
          <dt>Email</dt><dd>{{ u.email }}</dd>
          <dt>Roles</dt>
          <dd class="roles">
            @for (r of u.roles; track r) { <span class="badge badge-role">{{ r }}</span> } @empty { <span class="muted">No roles assigned</span> }
          </dd>
        </dl>
        <button class="btn" type="button" (click)="session.logout()">Sign out</button>
      } @else if (session.loading()) {
        <p class="muted" role="status">Loading your account…</p>
      } @else {
        <div class="banner error" role="alert">
          <span>Your account details didn't load.</span>
          <button class="btn btn-sm" type="button" (click)="session.refresh()">Retry</button>
          <button class="btn btn-sm" type="button" (click)="session.logout()">Sign out</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding-block: 48px; max-width: 720px; display: grid; gap: 24px; justify-items: start; }
      .dl { width: 100%; padding-block: 20px; border-block: 1px solid var(--border); }
      .roles { display: flex; gap: 8px; flex-wrap: wrap; }
    `,
  ],
})
export class AccountComponent {
  protected session = inject(SessionService);
}
