import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Federation } from '../interfaces/federations.interface';
import { CatalogStore } from '../services/catalog.store';
import { FederationService } from '../services/federation.service';
import { SessionService } from '../services/session.service';
import { ConfirmService } from '../ui/confirm.service';
import { IconComponent } from '../ui/icon.component';
import { toProblem } from '../ui/http-error';
import { ToastService } from '../ui/toast.service';
import { FederationDrawerComponent } from './federation-drawer.component';
import { FederationRowComponent } from './federation-row.component';

@Component({
  selector: 'mip-federation-directory',
  standalone: true,
  imports: [FederationRowComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'slash($event)' },
  template: `
    <section class="wrap" id="federations" aria-labelledby="fd-h">
      <div class="head">
        <h2 id="fd-h">Federations</h2>
        @if (session.isAdmin()) {
          <button class="btn btn-primary" type="button" (click)="create()"><mip-icon name="plus" /> New federation</button>
        }
      </div>
      <div class="tools">
        <div class="search">
          <mip-icon name="search" />
          <input #q class="input" type="search" aria-label="Search federations" placeholder="Search federations   ( / )" [value]="text()" (input)="text.set($any($event.target).value)" />
        </div>
        <label class="sel">
          <span class="muted">Data model</span>
          <select class="input" [value]="model()" (change)="model.set($any($event.target).value)">
            <option value="">All</option>
            @for (o of modelOptions(); track o.code) { <option [value]="o.code">{{ o.label }}</option> }
          </select>
        </label>
        <p class="count muted" aria-live="polite">Showing {{ shown().length }} of {{ all().length }}</p>
      </div>

      @switch (store.state()) {
        @case ('error') {
          <div class="banner error" role="alert">
            <span>Federations didn't load.</span><button class="btn btn-sm" type="button" (click)="store.load()">Retry</button>
          </div>
        }
        @case ('ready') {
          <div class="list">
            @for (f of shown(); track f.code) {
              <mip-federation-row [fed]="f" [color]="store.lineColor(f.code)" [admin]="session.isAdmin()" (edit)="editFed($event)" (remove)="removeFed($event)" />
            } @empty {
              <div class="empty">
                <p>No federation matches {{ text() ? '“' + text() + '”' : 'these filters' }}.</p>
                <button class="btn btn-sm" type="button" (click)="clear()">Clear filters</button>
              </div>
            }
          </div>
        }
        @default {
          <div class="list" aria-busy="true">
            @for (i of [1, 2, 3]; track i) {
              <div class="sk"><div class="skel" style="height:14px;width:90px"></div><div class="skel" style="height:22px;width:50%;margin-top:10px"></div><div class="skel" style="height:44px;margin-top:12px"></div></div>
            }
          </div>
        }
      }
    </section>
  `,
  styleUrl: './federation-directory.component.css',
})
export class FederationDirectoryComponent {
  protected store = inject(CatalogStore);
  protected session = inject(SessionService);
  private dialog = inject(Dialog);
  private confirmSvc = inject(ConfirmService);
  private fedSvc = inject(FederationService);
  private toast = inject(ToastService);

  protected text = signal('');
  protected model = signal('');
  protected all = this.store.federationsWithModels;

  protected modelOptions = computed(() => {
    const seen = new Map<string, string>();
    this.all().forEach((f) => f.pathologies.forEach((m) => seen.set(m.code ?? m.label, m.label)));
    return [...seen].map(([code, label]) => ({ code, label })).sort((a, b) => a.label.localeCompare(b.label));
  });

  protected shown = computed(() => {
    const t = this.text().trim().toLowerCase();
    const m = this.model();
    return this.all().filter(
      (f) =>
        (!t || `${f.title} ${f.code} ${f.description}`.toLowerCase().includes(t)) &&
        (!m || f.pathologies.some((p) => (p.code ?? p.label) === m)),
    );
  });

  protected slash(e: KeyboardEvent): void {
    const el = e.target as HTMLElement;
    if (e.key !== '/' || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
    const input = document.querySelector<HTMLInputElement>('#federations input[type=search]');
    if (input) {
      e.preventDefault();
      input.focus();
    }
  }

  protected clear(): void {
    this.text.set('');
    this.model.set('');
  }

  protected create(): void {
    this.dialog.open(FederationDrawerComponent, { panelClass: 'mip-drawer-host', data: null });
  }

  protected editFed(f: Federation): void {
    this.dialog.open(FederationDrawerComponent, { panelClass: 'mip-drawer-host', data: f });
  }

  protected async removeFed(f: Federation): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: `Delete federation “${f.title}”?`,
      message: 'It disappears from the public catalog. Its data models are kept.',
      confirmLabel: 'Delete federation',
      danger: true,
      typeToConfirm: f.code,
    });
    if (!ok) return;
    this.fedSvc.deleteFederation(f.code).subscribe({
      next: () => {
        this.toast.success('Federation deleted');
        this.store.load();
      },
      error: (e) => this.toast.error(toProblem(e, 'delete the federation').message),
    });
  }
}
