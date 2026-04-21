import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FederationService } from '../../../services/federation.service';
import { Federation } from '../../../interfaces/federations.interface';
import { FederationCardComponent } from '../../federations-page/federation-card/federation-card.component';
import { AuthService } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-embedded-federations',
  standalone: true,
  imports: [FederationCardComponent],
  templateUrl: './embedded-federations.component.html',
  styleUrls: ['./embedded-federations.component.css']
})
export class EmbeddedFederationsComponent implements OnInit, OnDestroy {
  federations: Federation[] = [];
  isLoading = true;
  hasError = false;
  isAdmin = false;
  private destroy$ = new Subject<void>();

  constructor(
    private federationService: FederationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFederations();

    this.authService.hasRole('DC_ADMIN')
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAdmin) => {
        this.isAdmin = isAdmin;
        this.cdr.detectChanges();
      });
  }

  loadFederations(): void {
    this.isLoading = true;
    this.hasError = false;
    this.federationService.getFederationsWithPathologies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (federations) => {
          this.federations = federations;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading federations:', error);
          this.isLoading = false;
          this.hasError = true;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToPathology(federationCode: string): void {
    this.router.navigate(['/pathology'], { queryParams: { federationCode } });
  }

  goToUpdateFederation(federationCode: string): void {
    this.router.navigate(['/federations/update'], {queryParams: {federationCode}});
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
      error: (error) => {
        console.error('Error deleting federation:', error);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.isAdmin = false;
          this.cdr.detectChanges();
          window.alert('You are not authorized to delete federations.');
          return;
        }

        window.alert('Failed to delete federation.');
      },
    });
  }
}
