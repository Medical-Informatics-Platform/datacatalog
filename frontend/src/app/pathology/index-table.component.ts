import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TreeNode, highlightParts } from '../services/pathology-tree';

/** The whole model as one scannable, virtualised table (rows mounted on demand). */
@Component({
  selector: 'mip-index-table',
  standalone: true,
  imports: [ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th" role="row"><span>Label</span><span>Code</span><span>Type</span><span>Units</span><span class="r">Range</span><span>Group</span></div>
    @if (rows().length) {
      <cdk-virtual-scroll-viewport itemSize="38" minBufferPx="380" maxBufferPx="760" class="vp" role="table" aria-label="All variables and groups">
        <button *cdkVirtualFor="let n of rows(); trackBy: id" type="button" class="tr" role="row" (click)="pick.emit(n.id)">
          <span class="nm">
            @if (n.kind === 'group') { <i class="sq"></i> } @else { <span class="tglyph" [class]="'tglyph t-' + n.type">{{ n.type[0]?.toUpperCase() }}</span> }
            <span class="t">@for (p of parts(n.label); track $index) {@if (p.hit) {<mark>{{ p.t }}</mark>} @else {{{ p.t }}}}</span>
          </span>
          <code class="muted">{{ n.code }}</code>
          <span>{{ n.kind === 'group' ? 'group' : n.type }}</span>
          <span class="muted">{{ n.variable?.units }}</span>
          <span class="num r">{{ range(n) }}</span>
          <span class="muted t">{{ groupOf(n) }}</span>
        </button>
      </cdk-virtual-scroll-viewport>
    } @else {
      <p class="none">No variables or groups match the current search and filters.</p>
    }
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; height: 100%; background: var(--surface); }
      .th, .tr { display: grid; grid-template-columns: minmax(180px, 2.2fr) minmax(110px, 1.2fr) 80px 90px 110px minmax(140px, 1.6fr); gap: 12px; align-items: center; padding: 0 16px; }
      .th { min-height: 34px; background: var(--canvas); border-bottom: 1px solid var(--border-strong); font-size: 0.8125rem; font-weight: 600; color: var(--ink-2); }
      .vp { flex: 1; min-height: 0; }
      .tr { width: 100%; height: 38px; border: 0; border-bottom: 1px solid var(--hairline); background: none; text-align: left; font-size: 0.875rem; }
      .tr:hover { background: var(--hover); }
      .tr:focus-visible { outline-offset: -2px; }
      .nm { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .r { text-align: right; padding-right: 20px; }
      .sq { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--ink-2); background: var(--surface); flex: none; margin: 0 5px; }
      code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .none { padding: 16px; color: var(--ink-2); }
      @media (max-width: 900px) { .th span:nth-child(n + 4), .tr > :nth-child(n + 4) { display: none; } .th, .tr { grid-template-columns: 1fr 1fr 70px; } }
    `,
  ],
})
export class IndexTableComponent {
  readonly rows = input.required<TreeNode[]>();
  readonly query = input('');
  readonly pick = output<string>();
  protected id = (_: number, n: TreeNode) => n.id;
  protected parts = (t: string) => highlightParts(t, this.query());

  protected range(n: TreeNode): string {
    const v = n.variable;
    if (!v || (v.minValue == null && v.maxValue == null)) return '';
    return v.minValue != null && v.maxValue != null ? `${v.minValue} – ${v.maxValue}` : v.minValue != null ? `≥ ${v.minValue}` : `≤ ${v.maxValue}`;
  }

  protected groupOf(n: TreeNode): string {
    return n.path.length > 2 ? n.path[n.path.length - 2].label : '';
  }
}
