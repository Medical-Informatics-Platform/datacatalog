import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { FederationService } from '../../services/federation.service';
import { AuthService } from '../../services/auth.service';
import { Federation } from '../../interfaces/federations.interface';
import { filter, Subject, takeUntil } from 'rxjs';
import { FederationCardComponent } from "./federation-card/federation-card.component";
import { AddFederationCardComponent } from "./add-federation-card/add-federation-card.component";

@Component({
  selector: 'app-federations',
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css'],
  standalone: true,
  imports: [
    RouterOutlet,
    FederationCardComponent,
    AddFederationCardComponent,
  ],
})
export class FederationsPageComponent implements OnInit, OnDestroy {
  @Input() isEmbedded = false;
  selectedFilter = 'All';
  federations: Federation[] = [];
  filteredFederations: Federation[] = [];
  isAdmin = false;

  private destroy$ = new Subject<void>();

  constructor(
    private federationService: FederationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFederations();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/federations') {
          this.loadFederations();
        }
      });

    this.authService.hasRole('DC_ADMIN')
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAdmin) => {
        this.isAdmin = isAdmin;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFederations(): void {
    this.federationService.getFederationsWithPathologies().subscribe({
      next: (federations) => {
        this.federations = federations;
        this.filteredFederations = federations;
      },
      error: (error) => console.error('Error loading federations:', error),
    });
  }

  goToAddFederation(): void {
    this.router.navigate(['/federations/add']);
  }

  goToUpdateFederation(federationCode: string): void {
    this.router.navigate(['/federations/update'], {queryParams: {federationCode}}).then(() => null);
   }

  goToPathology(federationCode: string): void {
    this.router.navigate(['/pathology'], {queryParams: {federationCode}}).then(() => null);
   }

  deleteFederation(federationCode: string): void {
    const confirmed = window.confirm(
      'Are you sure you want to delete this federation? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    this.federationService.deleteFederation(federationCode).subscribe({
      next: () => this.loadFederations(),
      error: (error: HttpErrorResponse) => {
        console.error('Error deleting federation:', error);
        if (error.status === 403) {
          this.isAdmin = false;
          window.alert('You are not authorized to delete federations.');
          return;
        }

        window.alert('Failed to delete federation.');
      },
    });
  }

  selectFilter(filter: string): void {
    //TODO
    this.selectedFilter = filter;
    this.filteredFederations = this.federations;
  }

  // Check if the current route is a child route
  isChildRouteActive(): boolean {
    const currentPath = this.router.url;
    return currentPath.includes('/federations/add') || currentPath.includes('/federations/update');
  }
}
