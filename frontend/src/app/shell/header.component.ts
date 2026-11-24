import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../services/session.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'mip-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <a class="well" routerLink="/" aria-label="MIP Data Catalog, home">
        <img src="assets/mip-logo-short-compact.png" alt="MIP, Medical Informatics Platform" width="95" height="32" />
        <span class="product">Data Catalog</span>
      </a>
      <nav class="nav" aria-label="Main" [class.open]="open()">
        <a routerLink="/" fragment="" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="open.set(false)">Overview</a>
        <a routerLink="/" fragment="federations" (click)="open.set(false)">Federations</a>
        <a routerLink="/pathology" routerLinkActive="on" (click)="open.set(false)">Pathology Explorer</a>
        <a routerLink="/" fragment="about" (click)="open.set(false)">About</a>
      </nav>
      <div class="end">
        @if (session.user(); as u) {
          <button class="who" type="button" [cdkMenuTriggerFor]="menu" [attr.aria-label]="'Account menu for ' + u.fullname">
            <span class="disc" aria-hidden="true">{{ initials() }}</span>
            <span class="nm">{{ u.fullname }}</span>
            <mip-icon name="down" [size]="16" />
          </button>
          <ng-template #menu>
            <div class="menu" cdkMenu>
              <div class="meta"><strong>{{ u.fullname }}</strong><span class="muted">{{ u.email }}</span></div>
              <a class="mi" cdkMenuItem routerLink="/account">Account</a>
              <button class="mi" type="button" cdkMenuItem (click)="session.logout()">Sign out</button>
            </div>
          </ng-template>
        } @else {
          <button class="btn btn-sm" type="button" (click)="session.login('/')">Sign in</button>
        }
        <button class="btn btn-icon btn-ghost burger" type="button" [attr.aria-expanded]="open()" aria-label="Menu" (click)="open.set(!open())">
          <mip-icon [name]="open() ? 'x' : 'menu'" [size]="22" />
        </button>
      </div>
    </header>
  `,
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected session = inject(SessionService);
  protected open = signal(false);
  protected initials = computed(() =>
    (this.session.user()?.fullname ?? '?')
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
}
