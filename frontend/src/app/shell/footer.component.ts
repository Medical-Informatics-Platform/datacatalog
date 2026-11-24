import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'mip-footer',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly fundingAcknowledgement =
    'This work was co-funded by the European Union’s Horizon 2020 Framework Partnership Agreement (No. 650003) for the Human Brain Project, and by the Horizon Europe research and innovation programme through the EBRAINS 2.0 project (grant agreement No. 101147319; SERI contract No. 23.00638).';
}
