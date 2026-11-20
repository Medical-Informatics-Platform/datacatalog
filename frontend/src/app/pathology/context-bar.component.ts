import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { IconComponent } from '../ui/icon.component';

export type ModelAction = 'import' | 'update' | 'release' | 'delete';

@Component({
  selector: 'mip-context-bar',
  standalone: true,
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" role="group" aria-label="Context">
      <label class="f">
        <span class="muted">Federation</span>
        <select class="input" [value]="federation()?.code ?? ''" (change)="federationChange.emit($any($event.target).value)">
          <option value="">All federations</option>
          @for (f of federations(); track f.code) { <option [value]="f.code" [selected]="f.code === federation()?.code">{{ f.title }}</option> }
        </select>
      </label>
      <label class="f">
        <span class="muted">Data model</span>
        <select class="input" (change)="modelChange.emit($any($event.target).value)">
          @if (!model()) { <option value="" selected disabled>Choose a data model…</option> }
          @if (groups().cross.length) {
            <optgroup label="Cross-sectional">
              @for (m of groups().cross; track m.uuid) { <option [value]="m.uuid" [selected]="m.uuid === model()?.uuid">{{ label(m) }}</option> }
            </optgroup>
          }
          @if (groups().long.length) {
            <optgroup label="Longitudinal">
              @for (m of groups().long; track m.uuid) { <option [value]="m.uuid" [selected]="m.uuid === model()?.uuid">{{ label(m) }}</option> }
            </optgroup>
          }
        </select>
      </label>
      @if (model(); as m) {
        @if (expert()) { <span class="badge" [class]="'badge ' + (m.released ? 'badge-released' : 'badge-draft')">{{ m.released ? 'Released' : 'Draft' }}</span> }
        @if (stats()) { <span class="stats muted num">{{ stats() }}</span> }
      }
      <span class="sp"></span>
      @if (model()) {
        <button class="btn btn-sm" type="button" [cdkMenuTriggerFor]="exportMenu"><mip-icon name="download" [size]="16" /> Export <mip-icon name="down" [size]="14" /></button>
        <ng-template #exportMenu>
          <div class="menu" cdkMenu>
            <button class="mi" type="button" cdkMenuItem (click)="exportAs.emit('json')">JSON (.json)</button>
            <button class="mi" type="button" cdkMenuItem (click)="exportAs.emit('xlsx')">Excel (.xlsx)</button>
          </div>
        </ng-template>
      }
      @if (expert()) {
        <button class="btn btn-sm" type="button" [cdkMenuTriggerFor]="modelMenu">Manage <mip-icon name="down" [size]="14" /></button>
        <ng-template #modelMenu>
          <div class="menu" cdkMenu>
            <button class="mi" type="button" cdkMenuItem (click)="action.emit('import')"><mip-icon name="upload" [size]="16" /> Import new data model…</button>
            @if (model(); as m) {
              <button class="mi" type="button" cdkMenuItem (click)="action.emit('update')"><mip-icon name="edit" [size]="16" /> Update from file…</button>
              @if (!m.released) { <button class="mi" type="button" cdkMenuItem (click)="action.emit('release')"><mip-icon name="check" [size]="16" /> Release…</button> }
              <button class="mi danger" type="button" cdkMenuItem (click)="action.emit('delete')"><mip-icon name="trash" [size]="16" /> Delete…</button>
            }
          </div>
        </ng-template>
      }
      <button class="btn btn-sm btn-icon" type="button" [attr.aria-pressed]="focus()" [attr.aria-label]="focus() ? 'Exit full screen' : 'Full screen'" (click)="toggleFocus.emit()">
        <mip-icon [name]="focus() ? 'collapse' : 'expand'" [size]="16" />
      </button>
    </div>
  `,
  styleUrl: './context-bar.component.css',
})
export class ContextBarComponent {
  readonly federations = input.required<Federation[]>();
  readonly federation = input<Federation | undefined>();
  readonly models = input.required<Pathology[]>();
  readonly model = input<Pathology | null>(null);
  readonly expert = input(false);
  readonly focus = input(false);
  readonly stats = input('');

  readonly federationChange = output<string>();
  readonly modelChange = output<string>();
  readonly exportAs = output<'json' | 'xlsx'>();
  readonly action = output<ModelAction>();
  readonly toggleFocus = output<void>();

  protected groups = computed(() => ({
    cross: this.models().filter((m) => !m.longitudinal),
    long: this.models().filter((m) => m.longitudinal),
  }));

  protected label(m: Pathology): string {
    return `${m.label} · ${m.version}${this.expert() && !m.released ? ' · Draft' : ''}`;
  }
}
