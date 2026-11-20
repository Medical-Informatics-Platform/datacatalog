import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';
import { TreeNode, highlightParts } from '../services/pathology-tree';

/** Ranked search hits that replace the columns while a query is active. */
@Component({
  selector: 'mip-result-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list" role="listbox" aria-label="Search results" (keydown)="onKey($event)">
      @for (n of results(); track n.id; let i = $index) {
        <button type="button" role="option" class="hit" [tabindex]="i === 0 ? 0 : -1" [attr.data-id]="n.id" (click)="pick.emit(n.id)">
          @if (n.kind === 'group') { <span class="sq" aria-hidden="true"></span> } @else { <span class="tglyph" [class]="'tglyph t-' + n.type" aria-hidden="true">{{ n.type[0]?.toUpperCase() }}</span> }
          <span class="body">
            <span class="top">
              <span class="nm">@for (p of parts(n.label); track $index) {@if (p.hit) {<mark>{{ p.t }}</mark>} @else {{{ p.t }}}}</span>
              <code class="muted">@for (p of parts(n.code); track $index) {@if (p.hit) {<mark>{{ p.t }}</mark>} @else {{{ p.t }}}}</code>
            </span>
            <span class="path muted">{{ pathOf(n) }}</span>
            @if (snippet(n); as s) { <span class="snip muted">{{ s }}</span> }
          </span>
        </button>
      } @empty {
        <p class="none">No variables or groups match. Try fewer letters, or set the filters to “All” and “Any type”.</p>
      }
      @if (capped()) { <p class="none">Showing the first {{ results().length }} matches. Refine the search to narrow down.</p> }
    </div>
  `,
  styles: [
    `
      :host { display: block; height: 100%; overflow-y: auto; background: var(--surface); }
      .hit { display: flex; gap: 12px; width: 100%; padding: 10px 16px; border: 0; border-bottom: 1px solid var(--hairline); background: none; text-align: left; align-items: flex-start; }
      .hit:hover { background: var(--hover); }
      .hit:focus-visible { outline-offset: -2px; }
      .sq { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--ink-2); background: var(--surface); flex: none; margin: 5px 5px 0; }
      .tglyph { margin-top: 1px; }
      .body { display: grid; gap: 2px; min-width: 0; flex: 1; }
      .top { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
      .nm { font-weight: 500; }
      .path, .snip { font-size: 0.8125rem; }
      .none { padding: 16px; color: var(--ink-2); font-size: 0.9375rem; }
    `,
  ],
})
export class ResultListComponent {
  readonly results = input.required<TreeNode[]>();
  readonly query = input('');
  readonly capped = input(false);
  readonly pick = output<string>();
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected parts = (t: string) => highlightParts(t, this.query());
  protected pathOf = (n: TreeNode) => n.path.slice(0, -1).map((c) => c.label).join(' › ');

  protected snippet(n: TreeNode): string {
    const q = this.query().trim().toLowerCase();
    if (!q || !n.description || `${n.label} ${n.code}`.toLowerCase().includes(q)) return '';
    const i = n.description.toLowerCase().indexOf(q);
    if (i < 0) return '';
    const a = Math.max(0, i - 40);
    return (a ? '…' : '') + n.description.slice(a, i + q.length + 60) + '…';
  }

  constructor() {
    afterRenderEffect(() => {
      this.results();
      this.host.nativeElement.scrollTop = 0;
    });
  }

  protected onKey(e: KeyboardEvent): void {
    const rows = [...this.host.nativeElement.querySelectorAll<HTMLElement>('[role=option]')];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    rows[Math.max(0, Math.min(rows.length - 1, i + d))]?.focus();
    e.preventDefault();
  }
}
