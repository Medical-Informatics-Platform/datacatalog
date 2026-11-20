import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { IconComponent } from '../ui/icon.component';

export interface PreviewSlot {
  id: string;
  tab: string;
  caption: string;
  /** Drop the real screenshot path here (e.g. 'assets/preview/experiment-studio.webp'); null renders the placeholder. */
  src: string | null;
  alt: string;
}

/** ASSET SLOTS: set `src` per slot to ship real MIP screenshots. 1600x1000 (16:10), WebP <= 300 kB. */
export const PREVIEW_SLOTS: PreviewSlot[] = [
  {
    id: 'experiment-studio',
    tab: 'Experiment Studio',
    caption: 'Configure an analysis once: pick pathology, variables and filters, then run it across every federated node.',
    src: null,
    alt: 'MIP Experiment Studio screen',
  },
  {
    id: 'federated-analytics',
    tab: 'Federated Analytics',
    caption: 'Results are computed inside each hospital and combined; only aggregates are shown.',
    src: null,
    alt: 'MIP Federated Analytics results screen',
  },
  {
    id: 'descriptive-statistics',
    tab: 'Descriptive Statistics',
    caption: 'Distributions and summaries for the variables you selected, across the whole federation.',
    src: null,
    alt: 'MIP Descriptive Statistics screen',
  },
];

@Component({
  selector: 'mip-platform-preview',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wrap" aria-labelledby="pv-h">
      <h2 id="pv-h">Inside MIP</h2>
      <p class="muted lead">The analysis platform this catalog feeds. Screens below are placeholders until real captures are added.</p>
      <div class="tabs" role="tablist" aria-label="MIP platform views" (keydown)="onKey($event)">
        @for (s of slots; track s.id; let i = $index) {
          <button role="tab" type="button" [id]="'tab-' + s.id" [attr.aria-selected]="i === idx()" [attr.aria-controls]="'panel-' + s.id"
            [tabindex]="i === idx() ? 0 : -1" (click)="idx.set(i)">{{ s.tab }}</button>
        }
      </div>
      <div class="panel" role="tabpanel" [id]="'panel-' + slot().id" [attr.aria-labelledby]="'tab-' + slot().id">
        <div class="frame">
          @if (slot().src; as src) {
            <img [src]="src" [alt]="slot().alt" width="1600" height="1000" />
          } @else {
            <div class="ph">
              <svg class="wire" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
                <rect x="4" y="4" width="34" height="92" rx="2" /><rect x="42" y="4" width="114" height="10" rx="2" />
                <rect x="42" y="20" width="54" height="40" rx="2" /><rect x="100" y="20" width="56" height="40" rx="2" />
                <rect x="42" y="66" width="114" height="30" rx="2" />
              </svg>
              <strong>Placeholder: {{ slot().tab }} screenshot</strong>
              <span class="mono">1600 × 1000 (16:10) · WebP ≤ 300 kB</span>
            </div>
          }
          <button class="btn btn-sm expand" type="button" (click)="expand()">
            <mip-icon name="expand" [size]="16" /> View larger
          </button>
        </div>
        <p class="cap">{{ slot().caption }}</p>
      </div>
    </section>
    <ng-template #big>
      <div class="mip-panel lightbox" role="dialog" aria-modal="true" [attr.aria-label]="slot().tab + ' preview'">
        <div class="panel-h">
          <h2>{{ slot().tab }}</h2>
          <button class="btn btn-ghost btn-icon" type="button" aria-label="Close" (click)="close()"><mip-icon name="x" /></button>
        </div>
        <div class="panel-b">
          <div class="frame">
            @if (slot().src; as src) {
              <img [src]="src" [alt]="slot().alt" />
            } @else {
              <div class="ph"><strong>Placeholder: {{ slot().tab }} screenshot</strong><span class="mono">1600 × 1000 (16:10)</span></div>
            }
          </div>
          <p class="cap">{{ slot().caption }}</p>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './platform-preview.component.css',
})
export class PlatformPreviewComponent {
  private dialog = inject(Dialog);
  private ref: DialogRef | null = null;
  private big = viewChild.required<TemplateRef<unknown>>('big');

  protected slots = PREVIEW_SLOTS;
  protected idx = signal(0);
  protected slot = computed(() => this.slots[this.idx()]);

  protected expand(): void {
    this.ref = this.dialog.open(this.big(), { panelClass: 'mip-lightbox', width: 'min(1040px, 94vw)' });
  }

  protected close(): void {
    this.ref?.close();
  }

  protected onKey(e: KeyboardEvent): void {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const n = this.slots.length;
    this.idx.set((this.idx() + d + n) % n);
    setTimeout(() => document.getElementById('tab-' + this.slot().id)?.focus());
    e.preventDefault();
  }
}
