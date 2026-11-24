import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Pathology } from '../interfaces/pathology.interface';
import { TreeIndex, TreeNode } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';

const TYPES = ['integer', 'real', 'nominal', 'text'];

@Component({
  selector: 'mip-inspector',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ins">
      @if (node(); as n) {
        <header>
          <h2>@if (n.kind === 'variable') {<span class="tglyph" [class]="'tglyph t-' + n.type" [title]="n.type + ' variable'">{{ n.type[0]?.toUpperCase() }}</span> }{{ n.label }}</h2>
          <p class="code">
            <code>{{ n.code }}</code>
            <button class="btn btn-ghost btn-sm" type="button" (click)="copy(n.code, 'code')"><mip-icon [name]="copied() === 'code' ? 'check' : 'copy'" [size]="15" /> {{ copied() === 'code' ? 'Copied' : 'Copy code' }}</button>
          </p>
        </header>

        @if (n.kind === 'variable' && n.variable; as v) {
          <section>
            @if (v.description) { <p class="desc">{{ v.description }}</p> } @else { <p class="muted">No description in this model.</p> }
            <dl class="dl">
              <dt>Type</dt><dd>{{ v.type }}</dd>
              @if (v.sql_type) { <dt>SQL type</dt><dd class="mono">{{ v.sql_type }}</dd> }
              <dt>Categorical</dt><dd>{{ v.isCategorical ? 'Yes' : 'No' }}</dd>
              @if (v.units) { <dt>Units</dt><dd>{{ v.units }}</dd> }
              @if (range(v); as r) { <dt>Range</dt><dd class="num">{{ r }}</dd> }
              @if (v.methodology) { <dt>Methodology</dt><dd>{{ v.methodology }}</dd> }
            </dl>
          </section>
          @if (v.enumerations?.length) {
            <section>
              <h3>Allowed values ({{ v.enumerations!.length }})</h3>
              @if (v.enumerations!.length > 12) {
                <input class="input" type="search" aria-label="Filter allowed values" placeholder="Filter values" [value]="ef()" (input)="ef.set($any($event.target).value)" />
              }
              <div class="enum">
                <table class="tbl">
                  <thead><tr><th>Code</th><th>Label</th></tr></thead>
                  <tbody>
                    @for (e of enums(v); track $index) { <tr><td class="mono">{{ e.code }}</td><td>{{ e.label }}</td></tr> }
                  </tbody>
                </table>
              </div>
            </section>
          }
        } @else {
          <section>
            <p class="stats num">{{ n.groupCount }} subgroup{{ n.groupCount === 1 ? '' : 's' }} · {{ n.variableCount }} variable{{ n.variableCount === 1 ? '' : 's' }} directly · {{ n.totalVariables }} in total</p>
            <ul class="bar" aria-hidden="true">@for (b of breakdown(n); track b.t) { <li [style.flex-grow]="b.n" [class]="'t-' + b.t"></li> }</ul>
            <ul class="legend">@for (b of breakdown(n); track b.t) { <li><span class="tglyph" [class]="'tglyph t-' + b.t">{{ b.t[0].toUpperCase() }}</span> {{ b.t }} <span class="num muted">{{ b.n }}</span></li> }</ul>
          </section>
          <section>
            <h3>In this group</h3>
            <ul class="kids">
              @for (c of kids(n); track c.id) {
                <li><button type="button" (click)="open.emit(c.id)">{{ c.label }}<span class="muted num">{{ c.kind === 'group' ? c.totalVariables : c.type }}</span></button></li>
              }
            </ul>
          </section>
        }
        <footer><button class="btn btn-sm" type="button" (click)="copyLink()"><mip-icon [name]="copied() === 'link' ? 'check' : 'copy'" [size]="15" /> {{ copied() === 'link' ? 'Link copied' : 'Copy link' }}</button></footer>
      } @else if (model(); as m) {
        <header>
          <h2>{{ m.label }}</h2>
          <p class="code"><code>{{ m.code }}</code> <span class="mono muted">{{ m.version }}</span></p>
        </header>
        <section>
          <dl class="dl">
            <dt>Design</dt><dd>{{ m.longitudinal ? 'Longitudinal' : 'Cross-sectional' }}</dd>
            <dt>Variables</dt><dd class="num">{{ root().totalVariables }}</dd>
            <dt>Groups</dt><dd class="num">{{ groups() }}</dd>
            <dt>Depth</dt><dd class="num">{{ depth() }}</dd>
          </dl>
          <ul class="bar" aria-hidden="true">@for (b of breakdown(root()); track b.t) { <li [style.flex-grow]="b.n" [class]="'t-' + b.t"></li> }</ul>
          <ul class="legend">@for (b of breakdown(root()); track b.t) { <li><span class="tglyph" [class]="'tglyph t-' + b.t">{{ b.t[0].toUpperCase() }}</span> {{ b.t }} <span class="num muted">{{ b.n }}</span></li> }</ul>
          <p class="muted hint">Select a group or variable in the browser to see its definition here.</p>
        </section>
      }
    </div>
  `,
  styleUrl: './inspector.component.css',
})
export class InspectorComponent {
  readonly index = input.required<TreeIndex>();
  readonly node = input<TreeNode | null>(null);
  readonly model = input<Pathology | null>(null);
  readonly open = output<string>();
  readonly link = input('');

  protected ef = signal('');
  protected copied = signal<'code' | 'link' | ''>('');
  protected root = computed(() => this.index().nodes.get(this.index().rootId)!);
  protected groups = computed(() => [...this.index().nodes.values()].filter((n) => n.kind === 'group' && n.parentId).length);
  protected depth = computed(() => Math.max(0, ...[...this.index().nodes.values()].map((n) => n.depth)));

  protected range(v: { minValue?: number; maxValue?: number; units?: string }): string {
    const lo = v.minValue ?? null;
    const hi = v.maxValue ?? null;
    if (lo === null && hi === null) return '';
    const u = v.units ? ` ${v.units}` : '';
    return lo !== null && hi !== null ? `${lo} – ${hi}${u}` : lo !== null ? `≥ ${lo}${u}` : `≤ ${hi}${u}`;
  }

  protected enums(v: { enumerations?: unknown[] }) {
    const t = this.ef().toLowerCase();
    const all = (v.enumerations ?? []).map((e) =>
      typeof e === 'object' && e ? (e as { code?: unknown; label?: unknown }) : { code: e, label: '' },
    );
    return t ? all.filter((e) => `${e.code} ${e.label}`.toLowerCase().includes(t)) : all;
  }

  protected kids(n: TreeNode): TreeNode[] {
    return n.childIds.slice(0, 40).map((id) => this.index().nodes.get(id)!);
  }

  protected breakdown(n: TreeNode): { t: string; n: number }[] {
    const counts = new Map<string, number>();
    const walk = (x: TreeNode) =>
      x.childIds.forEach((id) => {
        const c = this.index().nodes.get(id)!;
        if (c.kind === 'variable') counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
        else walk(c);
      });
    walk(n);
    return [...counts].map(([t, c]) => ({ t, n: c })).sort((a, b) => TYPES.indexOf(a.t) - TYPES.indexOf(b.t));
  }

  protected async copy(text: string, what: 'code' | 'link'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      setTimeout(() => this.copied.set(''), 1800);
    } catch {
      /* clipboard unavailable (insecure context): nothing to confirm */
    }
  }

  protected copyLink(): void {
    this.copy(this.link() || location.href, 'link');
  }
}
