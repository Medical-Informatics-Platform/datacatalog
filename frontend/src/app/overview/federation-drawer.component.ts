import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Federation, FederationInput } from '../interfaces/federations.interface';
import { CatalogStore } from '../services/catalog.store';
import { FederationService } from '../services/federation.service';
import { IconComponent } from '../ui/icon.component';
import { ServerProblem, toProblem } from '../ui/http-error';
import { ToastService } from '../ui/toast.service';

const wholeNumber = (c: AbstractControl): ValidationErrors | null =>
  /^\d+$/.test(String(c.value ?? '').trim()) ? null : { whole: true };
const httpUrl = (c: AbstractControl): ValidationErrors | null => {
  try {
    return /^https?:$/.test(new URL(String(c.value)).protocol) ? null : { url: true };
  } catch {
    return { url: true };
  }
};

@Component({
  selector: 'mip-federation-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mip-panel mip-drawer" [formGroup]="form" (ngSubmit)="save()" novalidate role="dialog" aria-modal="true" aria-labelledby="fd-t">
      <div class="panel-h">
        <h2 id="fd-t">{{ edit ? 'Edit federation' : 'New federation' }}</h2>
        <button class="btn btn-ghost btn-icon" type="button" aria-label="Close" [disabled]="busy()" (click)="ref.close()"><mip-icon name="x" /></button>
      </div>
      <div class="panel-b">
        @if (problem(); as p) {
          <div class="banner error" role="alert" tabindex="-1">
            <div><strong>{{ p.title }}</strong><pre class="msg">{{ p.message }}</pre></div>
          </div>
        }
        <div class="field">
          <label for="f-code">Code</label>
          <input id="f-code" class="input mono" formControlName="code" [attr.aria-invalid]="bad('code') || (taken() ? true : null)" aria-describedby="f-code-h" autocomplete="off" />
          <span id="f-code-h" class="help">Short unique identifier used in links, e.g. <code>dementia</code>.</span>
          @if (bad('code')) { <span class="err">Enter a code without spaces.</span> }
          @if (taken()) { <span class="err">This code is already used. Pick another code.</span> }
        </div>
        <div class="field">
          <label for="f-title">Title</label>
          <input id="f-title" class="input" formControlName="title" [attr.aria-invalid]="bad('title')" />
          @if (bad('title')) { <span class="err">Enter a title.</span> }
        </div>
        <div class="field">
          <label for="f-url">MIP instance URL</label>
          <input id="f-url" class="input mono" type="url" formControlName="url" [attr.aria-invalid]="bad('url')" placeholder="https://" />
          @if (bad('url')) { <span class="err">Enter a full http(s) address.</span> }
        </div>
        <div class="field">
          <label for="f-desc">Description</label>
          <textarea id="f-desc" class="input" formControlName="description"></textarea>
        </div>
        <div class="two">
          <div class="field">
            <label for="f-inst">Institutions</label>
            <input id="f-inst" class="input num" inputmode="numeric" formControlName="institutions" [attr.aria-invalid]="bad('institutions')" />
            @if (bad('institutions')) { <span class="err">Whole number, 0 or more.</span> }
          </div>
          <div class="field">
            <label for="f-rec">Patient records</label>
            <input id="f-rec" class="input num" inputmode="numeric" formControlName="records" [attr.aria-invalid]="bad('records')" />
            @if (bad('records')) { <span class="err">Whole number, 0 or more.</span> }
          </div>
        </div>
        <fieldset class="field models">
          <legend class="lbl">Released data models ({{ picked().size }} selected)</legend>
          <input class="input" type="search" placeholder="Filter data models" aria-label="Filter data models" [value]="q()" (input)="q.set($any($event.target).value)" />
          <ul class="list">
            @for (m of shown(); track m.uuid) {
              <li>
                <label>
                  <input type="checkbox" [checked]="picked().has(m.uuid)" (change)="toggle(m.uuid)" />
                  <span>{{ m.label }}</span> <span class="mono muted">{{ m.version }}</span>
                </label>
              </li>
            } @empty {
              <li class="muted pad">No released data models match.</li>
            }
          </ul>
        </fieldset>
      </div>
      <div class="panel-f">
        <button class="btn" type="button" [disabled]="busy()" (click)="ref.close()">Cancel</button>
        <button class="btn btn-primary" type="submit" [attr.aria-busy]="busy()" [disabled]="busy()">
          {{ busy() ? 'Saving…' : edit ? 'Save changes' : 'Create federation' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .models { border: 0; padding: 0; margin: 0; min-width: 0; }
      .list { border: 1px solid var(--border); border-radius: var(--r-md); max-height: 220px; overflow: auto; }
      .list label { display: flex; gap: 10px; padding: 7px 12px; align-items: baseline; }
      .list li:hover { background: var(--hover); }
      .pad { padding: 12px; }
      .msg { white-space: pre-wrap; margin: 4px 0 0; max-height: 200px; overflow: auto; font: inherit; }
    `,
  ],
})
export class FederationDrawerComponent {
  private fb = inject(FormBuilder);
  private svc = inject(FederationService);
  private store = inject(CatalogStore);
  private toast = inject(ToastService);
  protected ref = inject<DialogRef<boolean>>(DialogRef);
  protected data = inject<Federation | null>(DIALOG_DATA, { optional: true });
  protected edit = !!this.data;

  protected busy = signal(false);
  protected taken = signal(false);
  protected problem = signal<ServerProblem | null>(null);
  protected q = signal('');
  protected picked = signal(new Set<string>(this.data?.dataModelIds ?? []));
  protected shown = computed(() => {
    const t = this.q().toLowerCase();
    return this.store
      .releasedModels()
      .filter((m) => !t || `${m.label} ${m.code} ${m.version}`.toLowerCase().includes(t));
  });

  protected form = this.fb.nonNullable.group({
    code: [this.data?.code ?? '', [Validators.required, Validators.pattern(/^\S+$/)]],
    title: [this.data?.title ?? '', Validators.required],
    url: [this.data?.url ?? '', [Validators.required, httpUrl]],
    description: [this.data?.description ?? ''],
    institutions: [String(this.data?.institutions ?? 0), [Validators.required, wholeNumber]],
    records: [String(this.data?.records ?? 0), [Validators.required, wholeNumber]],
  });

  constructor() {
    if (this.edit) this.form.controls.code.disable();
  }

  protected bad(name: keyof typeof this.form.controls): boolean | null {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty) ? true : null;
  }

  protected toggle(id: string): void {
    const s = new Set(this.picked());
    s.has(id) ? s.delete(id) : s.add(id);
    this.picked.set(s);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const v = this.form.getRawValue();
    const body: FederationInput = {
      code: v.code.trim(),
      title: v.title.trim(),
      url: v.url.trim(),
      description: v.description.trim(),
      institutions: Number(v.institutions),
      records: Number(v.records),
      dataModelIds: [...this.picked()],
    };
    this.busy.set(true);
    this.problem.set(null);
    const req = this.edit ? this.svc.updateFederation(this.data!.code, body) : this.svc.createFederation(body);
    req.subscribe({
      next: () => {
        this.toast.success(this.edit ? 'Federation updated' : 'Federation created');
        this.store.load();
        this.ref.close(true);
      },
      error: (e) => {
        this.busy.set(false);
        const p = toProblem(e, this.edit ? 'update the federation' : 'create the federation');
        this.problem.set(p);
        this.taken.set(p.status === 409 && !this.edit);
        if (this.taken()) setTimeout(() => document.getElementById('f-code')?.focus());
      },
    });
  }
}
