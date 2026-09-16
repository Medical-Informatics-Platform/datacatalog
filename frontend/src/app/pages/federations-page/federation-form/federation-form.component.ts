import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PathologyService } from '../../../services/pathology.service';
import { FederationService } from '../../../services/federation.service';
import { Federation } from '../../../interfaces/federations.interface';

@Component({
  selector: 'app-federation-form',
  templateUrl: './federation-form.component.html',
  styleUrls: ['./federation-form.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
  standalone: true
})
export class FederationFormComponent implements OnInit, OnDestroy {
  federationForm: FormGroup;
  pathologies: any[] = [];
  selectedPathologies: string[] = [];
  isUpdateMode: boolean = false;
  federationCode: string | null = null;
  submitted = false;
  federationNotFound = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private pathologyService: PathologyService,
    private federationService: FederationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.federationForm = this.fb.group({
      code: ['', Validators.required],
      title: ['', Validators.required],
      url: ['', Validators.required],
      description: ['', Validators.required],
      institutions: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      records: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    });
  }

  ngOnInit(): void {
    this.isUpdateMode = this.route.snapshot.data['isUpdate'] === true;

    if (this.isUpdateMode) {
      this.route.queryParamMap
        .pipe(takeUntil(this.destroy$))
        .subscribe((params) => {
        const code = params.get('federationCode');
        if (!code) {
          return;
        }

        this.federationCode = code;
        this.loadFederation(code);
      });
    }

    this.loadPathologies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeModal(): void {
    void this.router.navigate(['/'], { fragment: 'federations' });
  }

  loadFederation(code: string): void {
    this.federationService.getFederationsWithPathologies().subscribe((federations) => {
      const federation = federations.find((f) => f.code === code);
      if (!federation) {
        this.federationNotFound = true;
        return;
      }

      this.federationForm.patchValue({
        code: federation.code,
        title: federation.title,
        url: federation.url,
        description: federation.description,
        institutions: federation.institutions,
        records: federation.records,
      });
      this.selectedPathologies = [...federation.dataModelIds];
    });
  }

  loadPathologies(): void {
    this.pathologyService.getAllReleasedPathologies().subscribe((pathologies) => {
      this.pathologies = pathologies;
    });
  }

  onPathologyChange(event: any): void {
    const selectedModel = event.target.value;
    if (event.target.checked) {
      if (!this.selectedPathologies.includes(selectedModel)) {
        this.selectedPathologies.push(selectedModel);
      }
    } else {
      this.selectedPathologies = this.selectedPathologies.filter(
        (model) => model !== selectedModel
      );
    }
  }

  submitForm(): void {
    this.submitted = true;

    if (!this.federationForm.valid) {
      this.federationForm.markAllAsTouched();
      return;
    }

    const federationData = this.buildFederationPayload();

    if (this.isUpdateMode && this.federationCode) {
      this.federationService
        .updateFederation(this.federationCode, federationData)
        .subscribe({
          next: () => {
            void this.router.navigate(['/'], { fragment: 'federations' });
          },
          error: (error) => this.handleSaveError(error, 'update'),
        });
    } else {
      this.federationService.createFederation(federationData).subscribe({
        next: () => {
          void this.router.navigate(['/'], { fragment: 'federations' });
        },
        error: (error) => this.handleSaveError(error, 'create'),
      });
    }
  }

  private buildFederationPayload(): Federation {
    const value = this.federationForm.value;
    return {
      ...value,
      institutions: this.toInteger(value.institutions),
      records: this.toInteger(value.records),
      dataModelIds: this.selectedPathologies,
    } as Federation;
  }

  private toInteger(value: unknown): number {
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private handleSaveError(error: unknown, action: 'create' | 'update'): void {
    console.error(`Error ${action === 'create' ? 'creating' : 'updating'} federation:`, error);
    if (error instanceof HttpErrorResponse && error.status === 403) {
      window.alert(this.saveErrorMessage(action, true));
      return;
    }

    const details =
      error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
        ? ` (${error.error.message})`
        : '';
    window.alert(this.saveErrorMessage(action, false) + details);
  }

  private saveErrorMessage(action: 'create' | 'update', unauthorized: boolean): string {
    return unauthorized
      ? `You are not authorized to ${action} federations.`
      : `Failed to ${action} federation.`;
  }
}
