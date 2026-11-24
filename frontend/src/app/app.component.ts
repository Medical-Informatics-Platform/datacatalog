import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shell/footer.component';
import { HeaderComponent } from './shell/header.component';
import { LayoutService } from './shell/layout.service';
import { ToastHostComponent } from './ui/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#main">Skip to content</a>
    @if (!layout.focus()) {
      <mip-header />
    }
    <main id="main"><router-outlet /></main>
    @if (!layout.focus()) {
      <mip-footer />
    }
    <mip-toasts />
  `,
  styles: [
    `
      .skip { position: absolute; left: 8px; top: -60px; z-index: 3000; background: var(--blue); color: #fff; padding: 8px 14px; border-radius: var(--r-md); }
      .skip:focus { top: 8px; }
    `,
  ],
})
export class AppComponent {
  protected layout = inject(LayoutService);
}
