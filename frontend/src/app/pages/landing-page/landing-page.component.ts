import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmbeddedFederationsComponent } from './embedded-federations/embedded-federations.component';
import { AboutPageComponent } from '../about-page/about-page.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, EmbeddedFederationsComponent, AboutPageComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  isFullscreen = false;

  toggleFullScreen() {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}
