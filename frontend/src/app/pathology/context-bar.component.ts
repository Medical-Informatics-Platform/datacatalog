import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CatalogStore } from '../services/catalog.store';
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
    <nav class="bar" aria-label="Breadcrumb">
      <ol>
        <li>
          <button class="crumb" type="button" [cdkMenuTriggerFor]="fedMenu" aria-label="Federation">
            <i class="dot" [style.--line]="federation() ? store.lineColor(federation()!.code) : 'var(--border-strong)'"></i>
            <span class="t">{{ federation()?.title ?? 'All federations' }}</span><mip-icon name="down" [size]="14" />
          </button>
          <ng-template #fedMenu>
            <div class="menu" cdkMenu>
              <button class="mi" type="button" cdkMenuItem (click)="federationChange.emit('')"><i class="dot" style="--line: var(--border-strong)"></i> All federations @if (!federation()) { <mip-icon class="ck" name="check" [size]="16" /> }</button>
              @for (f of federations(); track f.code) {
                <button class="mi" type="button" cdkMenuItem (click)="federationChange.emit(f.code)"><i class="dot" [style.--line]="store.lineColor(f.code)"></i> {{ f.title }} @if (f.code === federation()?.code) { <mip-icon class="ck" name="check" [size]="16" /> }</button>
              }
            </div>
          </ng-template>
        </li>
        <li class="sep" aria-hidden="true">/</li>
        <li>
          @if (model(); as m) {
            <button class="crumb" type="button" (click)="clearModel.emit()">Data models</button>
          } @else {
            <span class="here" aria-current="page">Data models</span>
          }
        </li>
        @if (model(); as m) {
          <li class="sep" aria-hidden="true">/</li>
          <li>
            <button class="crumb cur" type="button" [cdkMenuTriggerFor]="modelMenu" [attr.aria-label]="'Switch version of ' + m.label">
              <span class="t">{{ m.label }}</span><span class="ver mono">{{ m.version }}</span>
            </button>
            <ng-template #modelMenu>
              <div class="menu" cdkMenu>
                @for (v of versions(); track v.uuid) {
                  <button class="mi" type="button" cdkMenuItem (click)="modelChange.emit(v.uuid)"><span class="mono">{{ v.version }}</span> @if (expert() && !v.released) { <span class="badge badge-draft">Draft</span> } @if (v.uuid === m.uuid) { <mip-icon class="ck" name="check" [size]="16" /> }</button>
                }
                <button class="mi all" type="button" cdkMenuItem (click)="clearModel.emit()">All data models…</button>
              </div>
            </ng-template>
          </li>
        }
      </ol>
      @if (model(); as m) {
        @if (expert()) { <span class="badge" [class]="'badge ' + (m.released ? 'badge-released' : 'badge-draft')">{{ m.released ? 'Released' : 'Draft' }}</span> }
      }
      <span class="sp"></span>
      @if (model() && stats()) { <span class="stats muted num">{{ stats() }}</span><span class="rule" aria-hidden="true"></span> }
      @if (model()) {
        <button class="btn btn-sm" type="button" [cdkMenuTriggerFor]="exportMenu"><mip-icon name="download" [size]="16" /> Export <mip-icon name="down" [size]="14" /></button>
        <ng-template #exportMenu>
          <div class="menu" cdkMenu>
            <button class="mi" type="button" cdkMenuItem (click)="exportAs.emit('json')">JSON (.json)</button>
            <button class="mi" type="button" cdkMenuItem (click)="exportAs.emit('xlsx')">Excel (.xlsx)</button>
          </div>
        </ng-template>
      }
      @if (expert() && !model()) {
        <button class="btn btn-sm" type="button" (click)="action.emit('import')"><mip-icon name="upload" [size]="16" /> Import data model…</button>
      }
      @if (expert() && model()) {
        <button class="btn btn-sm" type="button" [cdkMenuTriggerFor]="manageMenu">Manage <mip-icon name="down" [size]="14" /></button>
        <ng-template #manageMenu>
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
    </nav>
  `,
  styleUrl: './context-bar.component.css',
})
export class ContextBarComponent {
  protected store = inject(CatalogStore);
  readonly federations = input.required<Federation[]>();
  readonly federation = input<Federation | undefined>();
  readonly models = input.required<Pathology[]>();
  readonly model = input<Pathology | null>(null);
  readonly expert = input(false);
  readonly stats = input('');

  readonly federationChange = output<string>();
  readonly modelChange = output<string>();
  readonly clearModel = output<void>();
  readonly exportAs = output<'json' | 'xlsx'>();
  readonly action = output<ModelAction>();

  /** Versions of the open model, newest first. */
  protected versions = computed(() => {
    const m = this.model();
    return m
      ? this.models()
          .filter((x) => x.code === m.code && !!x.longitudinal === !!m.longitudinal)
          .sort((a, b) => (b.version ?? '').localeCompare(a.version ?? '', undefined, { numeric: true }))
      : [];
  });
}
