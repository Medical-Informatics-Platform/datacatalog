import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject, input, output,
} from '@angular/core';
import { TreeIndex, TreeNode } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';

const LETTER: Record<string, string> = { integer: 'I', real: 'R', nominal: 'N', text: 'T' };

/**
 * Miller columns: one lane per level, only the open path is mounted. Position is
 * depth, the path stays visible, and arrow keys follow the Finder model.
 */
@Component({
  selector: 'mip-column-browser',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cols" #scroller>
      @for (c of columns(); track c.parent.id) {
        <div class="col" role="listbox" [attr.aria-label]="c.parent.label + ', ' + c.rows.length + ' items'" (keydown)="onKey($event, c.parent)">
          <div class="hd">{{ c.parent.label }}<span class="muted num">{{ c.rows.length }}</span></div>
          @for (r of c.rows; track r.id; let i = $index) {
            <button
              type="button" role="option" class="row" [class.group]="r.kind === 'group'" [class.on]="r.id === c.active" [class.flash]="r.id === flash()"
              [attr.aria-selected]="r.id === c.active" [attr.data-id]="r.id"
              [tabindex]="r.id === c.active || (!c.active && i === 0) ? 0 : -1" (click)="select.emit(r.id)">
              @if (r.kind === 'group') {
                <span class="sq" aria-hidden="true"></span>
              } @else {
                <span class="tglyph" [class]="'tglyph t-' + r.type" aria-hidden="true">{{ letter(r.type) }}</span>
              }
              <span class="lab">
                <span class="nm">{{ r.label }}</span>
                @if (r.kind === 'variable') { <span class="cd mono muted">{{ r.code }}</span> }
              </span>
              @if (r.kind === 'group') {
                <span class="ct num muted">{{ r.totalVariables }}</span>
                <span class="ext" aria-hidden="true" [style.--pct.%]="(r.totalVariables / c.max) * 100"></span>
                <mip-icon name="right" [size]="14" />
              }
              <span class="sr-only">{{ r.kind === 'group' ? 'group, ' + r.totalVariables + ' variables' : r.type + ' variable' }}</span>
            </button>
          }
        </div>
      }
      <div class="fill" aria-hidden="true"></div>
    </div>
  `,
  styleUrl: './column-browser.component.css',
})
export class ColumnBrowserComponent {
  readonly index = input.required<TreeIndex>();
  readonly selectedId = input<string | null>(null);
  readonly flash = input<string | null>(null);
  /** Bump to pull keyboard focus to the selected row (search jumps, deep links). */
  readonly focusNonce = input(0);
  readonly select = output<string>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected letter = (t: string) => LETTER[t] ?? '·';

  protected chain = computed(() => {
    const nodes = this.index().nodes;
    const out: TreeNode[] = [];
    let n = this.selectedId() ? nodes.get(this.selectedId()!) : undefined;
    while (n) {
      out.unshift(n);
      n = n.parentId ? nodes.get(n.parentId) : undefined;
    }
    if (!out.length) out.push(nodes.get(this.index().rootId)!);
    return out;
  });

  protected columns = computed(() => {
    const nodes = this.index().nodes;
    const chain = this.chain();
    return chain
      .map((n, i) => ({ n, next: chain[i + 1] }))
      .filter(({ n }) => n.kind === 'group')
      .map(({ n, next }) => {
        const rows = n.childIds.map((id) => nodes.get(id)!);
        return {
          parent: n,
          rows,
          active: next?.id ?? null,
          max: Math.max(1, ...rows.filter((r) => r.kind === 'group').map((r) => r.totalVariables)),
        };
      });
  });

  constructor() {
    afterRenderEffect(() => {
      const id = this.selectedId();
      const nonce = this.focusNonce();
      const el = this.host.nativeElement;
      const sc = el.querySelector<HTMLElement>('.cols');
      sc?.scrollTo({ left: sc.scrollWidth, behavior: 'smooth' });
      const row = id ? el.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`) : null;
      row?.scrollIntoView({ block: 'nearest' });
      if (row && (nonce > 0 || el.contains(document.activeElement))) row.focus({ preventScroll: true });
    });
  }

  protected onKey(e: KeyboardEvent, parent: TreeNode): void {
    const col = e.currentTarget as HTMLElement;
    const rows = [...col.querySelectorAll<HTMLElement>('[role=option]')];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const go = (j: number) => rows[Math.max(0, Math.min(rows.length - 1, j))]?.focus();
    switch (e.key) {
      case 'ArrowDown': go(i + 1); break;
      case 'ArrowUp': go(i - 1); break;
      case 'Home': go(0); break;
      case 'End': go(rows.length - 1); break;
      case 'ArrowRight':
      case 'Enter':
      case ' ':
        if (i >= 0) this.select.emit(rows[i].dataset['id']!);
        break;
      case 'ArrowLeft':
        this.select.emit(parent.id);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== '/') {
          const k = e.key.toLowerCase();
          const hit = [...rows.slice(i + 1), ...rows.slice(0, i + 1)].find((r) => r.querySelector('.nm')?.textContent?.trim().toLowerCase().startsWith(k));
          hit?.focus();
          return;
        }
        return;
    }
    e.preventDefault();
  }
}
