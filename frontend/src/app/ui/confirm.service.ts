import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the user must type this value to enable the confirm button. */
  typeToConfirm?: string;
}

@Component({
  selector: 'mip-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mip-panel" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-m">
      <div class="panel-b">
        <h2 id="cf-t">{{ o.title }}</h2>
        <p id="cf-m">{{ o.message }}</p>
        @if (o.typeToConfirm) {
          <div class="field">
            <label for="cf-in">Type <code>{{ o.typeToConfirm }}</code> to confirm</label>
            <input id="cf-in" class="input mono" autocomplete="off" [value]="typed()" (input)="typed.set($any($event.target).value)" />
          </div>
        }
      </div>
      <div class="panel-f">
        <button class="btn" type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
        <button class="btn" [class.btn-danger]="o.danger" [class.btn-primary]="!o.danger" type="button" [disabled]="!ok()" (click)="ref.close(true)">
          {{ o.confirmLabel }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected o = inject<ConfirmOptions>(DIALOG_DATA);
  protected ref = inject<DialogRef<boolean>>(DialogRef);
  protected typed = signal('');
  protected ok = computed(() => !this.o.typeToConfirm || this.typed().trim() === this.o.typeToConfirm);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(Dialog);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, { data: options, disableClose: false });
    return (await firstValueFrom(ref.closed, { defaultValue: false })) === true;
  }
}
