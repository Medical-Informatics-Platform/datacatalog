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
  // External Data Quality Tool (DQT) service. Update to the deployed
  // endpoint once it is publicly reachable; defaults to the local dev service.
  readonly dataQualityToolUrl = 'http://localhost:8000';
}
