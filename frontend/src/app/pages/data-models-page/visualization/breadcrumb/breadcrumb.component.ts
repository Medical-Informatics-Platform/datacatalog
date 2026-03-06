import { Component, Input, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-breadcrumb',
  template: `
    <nav class="breadcrumbs">
      @for (crumb of breadcrumbs; track crumb; let i = $index) {
        <span
          class="breadcrumb"
          [class.active]="i === breadcrumbs.length - 1"
          (click)="onBreadcrumbClick(i)"
          >
          {{ crumb }}
        </span>
        @if (i < breadcrumbs.length - 1) {
          <span> &gt; </span>
        }
      }
    </nav>
    `,
  styleUrls: ['./breadcrumb.component.css'],
  imports: [],
  standalone: true
})
export class BreadcrumbComponent {
  @Input() breadcrumbs: string[] = [];
  @Output() breadcrumbClick = new EventEmitter<number>();

  onBreadcrumbClick(index: number) {
    this.breadcrumbClick.emit(index);
  }
}
