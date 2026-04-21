import { ViewportScroller } from '@angular/common';
import { FooterComponent } from './pages/shared/footer/footer.component';
import { Component, inject } from '@angular/core';
import { HeaderComponent } from './pages/shared/header/header.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly viewportScroller = inject(ViewportScroller);
  title = 'datacatalog-frontend';

  constructor() {
    this.viewportScroller.setOffset(() => [0, 80]);
  }
}
