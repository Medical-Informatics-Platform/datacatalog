import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home-section-redirect',
  template: '',
})
export class HomeSectionRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const fragment = this.route.snapshot.fragment ?? (this.route.snapshot.data['fragment'] as string | undefined);

    void this.router.navigate(['/'], {
      fragment,
      replaceUrl: true,
    });
  }
}
