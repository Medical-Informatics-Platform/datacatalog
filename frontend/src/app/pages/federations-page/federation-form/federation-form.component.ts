import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PathologyService } from '../../../services/pathology.service';
import { FederationService } from '../../../services/federation.service';

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
export class FederationFormComponent implements OnInit {
  @Output() federationUpdated = new EventEmitter<void>(); // Event to notify parent

  federationForm: FormGroup;
  pathologies: any[] = [];
  selectedPathologies: string[] = [];
  isUpdateMode: boolean = false;
  federationCode: string | null = null;

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
      institutions: ['', Validators.required],
      records: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.isUpdateMode = data['isUpdate'];
    });

    if (this.isUpdateMode) {
      this.route.queryParams.subscribe((params) => {
        this.federationCode = params['federationCode'];
        this.loadFederation(this.federationCode!);
      });
    }

    this.loadPathologies();
  }

  closeModal(): void {
    void this.router.navigate(['/'], { fragment: 'federations' });
  }

  loadFederation(code: string): void {
    this.federationService.getFederationsWithPathologies().subscribe((federations) => {
      const federation = federations.find((f) => f.code === code);
      if (federation) {
        this.federationForm.patchValue({
          code: federation.code,
          title: federation.title,
          url: federation.url,
          description: federation.description,
          institutions: federation.institutions,
          records: federation.records,
        });
        this.selectedPathologies = [...federation.dataModelIds];
      }
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
    if (this.federationForm.valid) {
      const federationData = {
        ...this.federationForm.value,
        dataModelIds: this.selectedPathologies,
      };

      if (this.isUpdateMode && this.federationCode) {
        this.federationService
          .updateFederation(this.federationCode, federationData)
          .subscribe({
            next: () => {
              this.federationUpdated.emit(); // Notify parent
              void this.router.navigate(['/'], { fragment: 'federations' });
            },
            error: (error) => console.error('Error updating federation:', error),
          });
      } else {
        this.federationService.createFederation(federationData).subscribe({
          next: () => {
            this.federationUpdated.emit(); // Notify parent
            void this.router.navigate(['/'], { fragment: 'federations' });
          },
          error: (error) => console.error('Error creating federation:', error),
        });
      }
    }
  }
}
