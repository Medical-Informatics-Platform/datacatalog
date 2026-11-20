import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Crumb } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';

/** The route from the data model down to the selected node; the terminus is "you are here". */
@Component({
  selector: 'mip-route-strip',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length > 1) {
      <button class="back btn btn-sm" type="button" (click)="go.emit(crumbs()[crumbs().length - 2].id)">
        <mip-icon name="left" [size]="16" /> {{ crumbs()[crumbs().length - 2].label }}
      </button>
    }
    <nav aria-label="Route to the selected item" [style.--line]="color()">
      <ol>
        @for (c of crumbs(); track c.id; let last = $last) {
          <li [class.here]="last">
            @if (last) {
              <span class="st" aria-current="location"><i class="dot"></i>{{ c.label }}</span>
            } @else {
              <button class="st" type="button" (click)="go.emit(c.id)"><i class="dot"></i>{{ c.label }}</button>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [
    `
      :host { display: flex; align-items: center; gap: 12px; min-width: 0; }
      nav { flex: 1; min-width: 0; overflow-x: auto; }
      ol { display: flex; align-items: center; width: max-content; padding: 6px 0; }
      li { display: flex; align-items: center; }
      li + li::before { content: ''; width: 28px; height: 4px; background: var(--line); border-radius: 2px; animation: grow var(--dur-3) var(--ease); transform-origin: left; }
      .st { display: inline-flex; align-items: center; gap: 8px; padding: 4px 6px; border: 0; background: none; font-size: 0.8125rem; font-weight: 500; color: var(--ink); max-width: 22ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: var(--r-sm); }
      button.st:hover { background: var(--hover); color: var(--blue); }
      .dot { width: 10px; height: 10px; border-radius: 50%; border: 3px solid var(--line); background: #fff; flex: none; }
      .here .st { font-weight: 600; }
      .here .dot { width: 14px; height: 14px; border: 3px solid var(--orange); background: #fff; box-shadow: 0 0 0 2px var(--ink); }
      .back { display: none; }
      @keyframes grow { from { transform: scaleX(0); } }
      @media (max-width: 767px) { .back { display: inline-flex; } nav { display: none; } }
    `,
  ],
})
export class RouteStripComponent {
  readonly crumbs = input.required<Crumb[]>();
  readonly color = input('var(--blue)');
  readonly go = output<string>();
}
