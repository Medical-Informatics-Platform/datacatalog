import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-breadcrumb',
  template: `
    <nav class="breadcrumbs" aria-label="Pathology navigation">
      @for (crumb of breadcrumbs; track crumb; let i = $index) {
        <button
          type="button"
          class="breadcrumb"
          [class.active]="i === breadcrumbs.length - 1"
          [disabled]="i === breadcrumbs.length - 1"
          (click)="onBreadcrumbClick(i)"
        >
          {{ crumb }}
        </button>
        @if (i < breadcrumbs.length - 1) {
          <span class="separator" aria-hidden="true">/</span>
        }
      }
    </nav>
  `,
  styleUrls: ['./breadcrumb.component.css'],
  imports: [],
  standalone: true,
})
export class BreadcrumbComponent {
  @Input() breadcrumbs: string[] = [];
  @Output() breadcrumbClick = new EventEmitter<number>();

  onBreadcrumbClick(index: number) {
    this.breadcrumbClick.emit(index);
  }
}
