import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';

import {PathologyService} from "../../../services/pathology.service";

@Component({
  selector: 'app-pathology-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pathology-form.component.html',
  styleUrls: ['./pathology-form.component.css'],
})
export class PathologyFormComponent implements OnInit {
  @Output() pathologyUpdated = new EventEmitter<void>();
  pathologyForm: FormGroup;
  isUpdateMode: boolean = false;

  selectedFileType: string = 'json';
  file: File | null = null;
  selectedPathologyID: string | undefined;
  errorMessage: string | null = null;


  constructor(
    private pathologyService: PathologyService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.pathologyForm = this.fb.group({
      fileType: ["json"],
      file: [''],
      version: [''],        // New control for version
      longitudinal: [false] // New control for longitudinal (default to false)
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.isUpdateMode = data['isUpdate'];
    });

    if (this.isUpdateMode) {
      this.route.queryParams.subscribe((params) => {
        this.selectedPathologyID = params['pathologyId'];
      });
    }
  }

  onFileTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedFileType = target.value;
    this.file = null;
    this.errorMessage = null; // Reset error message
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.file = target.files[0];
    }
    this.errorMessage = null; // Reset error message
  }

  submitForm(): void {
    if (this.isUpdateMode && this.selectedPathologyID) {
      this.handleUpdateMode();
    } else {
      this.handleAddMode();
    }
  }

  handleAddMode(): void {
    if (!this.file) {
      this.errorMessage = 'No file selected';
      return;
    }

    this.errorMessage = null; // Reset error message
    if (this.selectedFileType === 'json') {
      this.pathologyService.createPathologyFromJson(this.file).subscribe({
        next: () => {
          console.log('JSON pathology created successfully.');
          this.pathologyUpdated.emit(); // Notify parent
          this.router.navigate(['/pathology']); // Navigate to pathology page
        },
        error: (error) => {
          console.error('Error creating JSON pathology:', error);
          this.errorMessage = error; // Display the extracted error message
        },
      });
    } else if (this.selectedFileType === 'xlsx') {
      const version = this.pathologyForm.get('version')?.value;
      const longitudinal = this.pathologyForm.get('longitudinal')?.value;

      this.pathologyService.createPathologyFromExcel(this.file, version, longitudinal).subscribe({
        next: () => {
          console.log('Excel pathology created successfully.');
          this.pathologyUpdated.emit(); // Notify parent
          this.router.navigate(['/pathology']); // Navigate to pathology page
        },
        error: (error) => {
          console.error('Error creating Excel pathology:', error);
          this.errorMessage = error; // Display the extracted error message
        },
      });
    }
  }

  handleUpdateMode(): void {
    if (!this.file || !this.selectedPathologyID) {
      this.errorMessage = 'No file or pathology ID provided';
      return;
    }

    this.errorMessage = null; // Reset error message
    if (this.selectedFileType === 'json') {
      this.pathologyService.updatePathologyFromJson(this.selectedPathologyID, this.file).subscribe({
        next: () => {
          console.log('Pathology updated successfully (JSON).');
          this.pathologyUpdated.emit(); // Notify parent
          this.router.navigate(['/pathology']); // Navigate to pathology page
        },
        error: (error) => {
          console.error('Error updating JSON pathology:', error);
          this.errorMessage = error; // Set the error message for display
        },
      });
    } else if (this.selectedFileType === 'xlsx') {
      const version = this.pathologyForm.get('version')?.value;
      const longitudinal = this.pathologyForm.get('longitudinal')?.value;

      this.pathologyService.updatePathologyFromExcel(this.selectedPathologyID, this.file, version, longitudinal).subscribe({
        next: () => {
          console.log('Pathology updated successfully (Excel).');
          this.pathologyUpdated.emit(); // Notify parent
          this.router.navigate(['/pathology']); // Navigate to pathology page
        },
        error: (error) => {
          console.error('Error updating Excel pathology:', error);
          this.errorMessage = error; // Set the error message for display
        },
      });
    }
  }
}
