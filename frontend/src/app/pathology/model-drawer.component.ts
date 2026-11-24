import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Pathology } from '../interfaces/pathology.interface';
import { CatalogStore } from '../services/catalog.store';
import { PathologyService } from '../services/pathology.service';
import { IconComponent } from '../ui/icon.component';
import { ServerProblem, toProblem } from '../ui/http-error';
import { ToastService } from '../ui/toast.service';

export interface ModelDrawerData {
  /** Present when updating an existing data model. */
  model?: Pathology;
}

@Component({
  selector: 'mip-model-drawer',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mip-panel mip-drawer" (submit)="$event.preventDefault(); submit()" novalidate role="dialog" aria-modal="true" aria-labelledby="md-t">
      <div class="panel-h">
        <h2 id="md-t">{{ model ? 'Update ' + model.label + ' ' + model.version : 'Import data model' }}</h2>
        <button class="btn btn-ghost btn-icon" type="button" aria-label="Close" [disabled]="busy()" (click)="ref.close()"><mip-icon name="x" /></button>
      </div>
      <div class="panel-b">
        @if (problem(); as p) {
          <div class="banner error" role="alert" tabindex="-1">
            <div class="grow">
              <strong>{{ p.title }}</strong>
              <pre class="msg mono">{{ p.message }}</pre>
              <button class="btn btn-sm" type="button" (click)="copyMessage(p.message)">Copy message</button>
            </div>
          </div>
        }
        <p class="muted">
          {{ model ? 'Replace this data model with a new definition.' : 'Creates a draft data model. Release it when it is ready to be public.' }}
          Use a JSON file or an Excel (.xlsx) sheet.
        </p>
        <div class="field">
          <label for="md-file">File (.json or .xlsx)</label>
          <input id="md-file" class="input" type="file" accept=".json,.xlsx" [attr.aria-invalid]="fileError() ? 'true' : null" aria-describedby="md-file-h" (change)="pickFile($event)" />
          <span id="md-file-h" class="help">
            @if (file(); as f) { {{ f.name }} · {{ size(f.size) }} } @else { No file chosen }
          </span>
          @if (fileError(); as e) { <span class="err">{{ e }}</span> }
        </div>
        @if (isExcel()) {
          <div class="field">
            <label for="md-ver">Version</label>
            <input id="md-ver" class="input mono" autocomplete="off" [value]="version()" [attr.aria-invalid]="versionError() ? 'true' : null" (input)="version.set($any($event.target).value)" />
            <span class="help">Excel sheets carry no version, so enter it here, e.g. <code>v5</code>.</span>
            @if (versionError()) { <span class="err">Enter a version.</span> }
          </div>
          <label class="check"><input type="checkbox" [checked]="longitudinal()" (change)="longitudinal.set($any($event.target).checked)" /> Longitudinal data model</label>
        } @else if (file()) {
          <p class="muted">Version and design are read from the JSON file.</p>
        }
      </div>
      <div class="panel-f">
        <button class="btn" type="button" [disabled]="busy()" (click)="ref.close()">Cancel</button>
        <button class="btn btn-primary" type="submit" [attr.aria-busy]="busy()" [disabled]="busy()">
          {{ busy() ? (model ? 'Updating…' : 'Importing…') : model ? 'Update data model' : 'Import data model' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .grow { flex: 1; min-width: 0; display: grid; gap: 8px; justify-items: start; }
      .msg { white-space: pre-wrap; margin: 0; max-height: 240px; overflow: auto; width: 100%; }
      .check { display: flex; gap: 10px; align-items: center; }
    `,
  ],
})
export class ModelDrawerComponent {
  private svc = inject(PathologyService);
  private store = inject(CatalogStore);
  private toast = inject(ToastService);
  protected ref = inject<DialogRef<boolean>>(DialogRef);
  protected model = inject<ModelDrawerData | null>(DIALOG_DATA, { optional: true })?.model;

  protected file = signal<File | null>(null);
  protected version = signal(this.model?.version ?? '');
  protected longitudinal = signal(this.model?.longitudinal ?? false);
  protected busy = signal(false);
  protected problem = signal<ServerProblem | null>(null);
  protected submitted = signal(false);
  protected isExcel = computed(() => !!this.file()?.name.toLowerCase().endsWith('.xlsx'));
  protected fileError = computed(() => (this.submitted() && !this.file() ? 'Choose a .json or .xlsx file.' : ''));
  protected versionError = computed(() => this.submitted() && this.isExcel() && !this.version().trim());

  protected size = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB');

  protected pickFile(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(f && /\.(json|xlsx)$/i.test(f.name) ? f : null);
    if (f && !this.file()) this.problem.set({ title: 'Unsupported file', message: 'Choose a .json or .xlsx file.', status: 0 });
    else this.problem.set(null);
  }

  protected copyMessage(t: string): void {
    navigator.clipboard?.writeText(t).catch(() => undefined);
  }

  protected submit(): void {
    this.submitted.set(true);
    const f = this.file();
    if (!f || this.versionError()) return;
    const excel = this.isExcel();
    const flag = String(this.longitudinal());
    const ver = this.version().trim();
    const m = this.model;
    const req: Observable<unknown> = m
      ? excel ? this.svc.updatePathologyFromExcel(m.uuid, f, ver, flag) : this.svc.updatePathologyFromJson(m.uuid, f)
      : excel ? this.svc.createPathologyFromExcel(f, ver, flag) : this.svc.createPathologyFromJson(f);
    this.busy.set(true);
    this.problem.set(null);
    req.subscribe({
      next: () => {
        this.toast.success(m ? 'Data model updated' : 'Data model imported');
        this.store.load();
        this.ref.close(true);
      },
      error: (e) => {
        this.busy.set(false);
        this.problem.set(toProblem(e, m ? 'update the data model' : 'import the data model'));
      },
    });
  }
}
