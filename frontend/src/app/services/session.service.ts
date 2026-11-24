import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '../interfaces/user.interface';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

/**
 * Signal view of the signed-in user. Anonymous browsing (AUTHENTICATION=0 or no
 * token) never calls /services/user, which answers 500 without a session.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);
  private users = inject(UserService);

  readonly user = signal<User | null>(null);
  readonly loading = signal(false);
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly signedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.roles().includes('DC_ADMIN'));
  readonly isExpert = computed(() => this.roles().includes('DC_DOMAIN_EXPERT'));

  constructor() {
    this.refresh();
  }

  refresh(): void {
    if (!this.auth.isLoggedIn()) {
      this.user.set(null);
      return;
    }
    this.loading.set(true);
    this.users.getUserDetails().subscribe({
      next: (u) => {
        this.user.set({ ...u, roles: u.roles ?? [] });
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
      },
    });
  }

  login(redirectUrl = '/'): void {
    this.auth.login(redirectUrl);
  }

  logout(): void {
    this.auth.logout();
  }
}
