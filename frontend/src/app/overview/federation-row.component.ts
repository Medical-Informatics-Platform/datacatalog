import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, input, output, signal, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { formatCount } from '../services/pathology-tree';
import { IconComponent } from '../ui/icon.component';

type Fed = Federation & { pathologies: Pathology[] };

@Component({
  selector: 'mip-federation-row',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [id]="'fed-' + fed().code" [attr.aria-labelledby]="'fed-' + fed().code + '-title'" tabindex="-1" [style.--line]="color()">
      <div class="head">
        <div class="main">
          <div class="ttl"><h3 [id]="'fed-' + fed().code + '-title'">{{ fed().title }}</h3><code class="muted">{{ fed().code }}</code></div>
          <p class="facts-inline muted">{{ n(fed().institutions) }} institution{{ fed().institutions === 1 ? '' : 's' }} · {{ n(fed().records) }} patient record{{ fed().records === 1 ? '' : 's' }}</p>
          <p #desc class="desc" [class.clamp]="!open()" [id]="'d-' + fed().code">{{ fed().description }}</p>
          @if (overflows() || open()) {
            <button class="more" type="button" [attr.aria-expanded]="open()" [attr.aria-controls]="'d-' + fed().code" (click)="open.set(!open())">
              {{ open() ? 'Show less' : 'Show full description' }}
            </button>
          }
        </div>
        <dl class="facts">
          <div><dt>Institutions</dt><dd class="num">{{ n(fed().institutions) }}</dd></div>
          <div><dt>Patient records</dt><dd class="num">{{ n(fed().records) }}</dd></div>
        </dl>
      </div>
      <div class="foot">
        <ul class="chips" [attr.aria-label]="'Data models in ' + fed().title">
          @for (m of fed().pathologies; track m.uuid) {
            <li>
              <a class="chip" routerLink="/pathology" [queryParams]="{ federationCode: fed().code, pathologyCode: m.code, version: m.version }">
                <span class="dot" [style.--line]="color()"></span>{{ m.label }} <span class="mono muted">{{ m.version }}</span>
              </a>
            </li>
          } @empty {
            <li class="muted small">No released data models yet.</li>
          }
        </ul>
        <div class="acts">
          @if (count() > 0) {
            <a class="btn btn-primary" routerLink="/pathology" [queryParams]="{ federationCode: fed().code }">
              Explore {{ count() }} data model{{ count() === 1 ? '' : 's' }} <mip-icon name="right" [size]="15" /><span class="sr-only"> in {{ fed().title }}</span>
            </a>
          }
          @if (fed().url) {
            <a class="mip-link" [href]="fed().url" target="_blank" rel="noopener">Open MIP <mip-icon name="external" [size]="15" /><span class="sr-only"> for {{ fed().title }} (opens in a new tab)</span></a>
          }
          @if (admin()) {
            <span class="admin-icons">
              <button class="btn btn-sm btn-icon" type="button" [attr.aria-label]="'Edit ' + fed().title" (click)="edit.emit(fed())"><mip-icon name="edit" [size]="16" /></button>
              <button class="btn btn-sm btn-icon" type="button" [attr.aria-label]="'Delete ' + fed().title" (click)="remove.emit(fed())"><mip-icon name="trash" [size]="16" /></button>
            </span>
          }
        </div>
      </div>
    </article>
  `,
  styleUrl: './federation-row.component.css',
})
export class FederationRowComponent {
  readonly fed = input.required<Fed>();
  readonly color = input('var(--line-1)');
  readonly admin = input(false);
  readonly edit = output<Fed>();
  readonly remove = output<Fed>();

  protected open = signal(false);
  protected overflows = signal(false);
  private desc = viewChild.required<ElementRef<HTMLElement>>('desc');
  protected n = formatCount;
  protected count = computed(() => this.fed().pathologies.length);

  constructor() {
    afterNextRender(() => {
      const el = this.desc().nativeElement;
      const measure = () => {
        if (!this.open()) this.overflows.set(el.scrollHeight > el.clientHeight + 1);
      };
      measure();
      new ResizeObserver(measure).observe(el);
    });
  }
}
