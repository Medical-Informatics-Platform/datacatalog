import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Federation } from '../interfaces/federations.interface';
import { Pathology } from '../interfaces/pathology.interface';
import { SessionService } from './session.service';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Single source of truth for federations + data models. Strict (surfaces HTTP
 * errors) so views can render a retry state instead of a silent empty list.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private http = inject(HttpClient);
  private session = inject(SessionService);

  readonly state = signal<LoadState>('idle');
  readonly federations = signal<Federation[]>([]);
  readonly models = signal<Pathology[]>([]);

  /** Anonymous visitors only ever see released models; experts see drafts too. */
  readonly visibleModels = computed(() =>
    this.session.isExpert() ? this.models() : this.models().filter((m) => m.released),
  );
  readonly releasedModels = computed(() => this.models().filter((m) => m.released));

  readonly metrics = computed(() => {
    const f = this.federations();
    const sum = (k: 'institutions' | 'records') =>
      f.reduce((n, x) => n + (Number(x[k]) || 0), 0);
    return {
      federations: f.length,
      institutions: sum('institutions'),
      records: sum('records'),
      models: this.releasedModels().length,
    };
  });

  /** Stable per-federation line colour: index in the code-sorted list, 8 palette slots. */
  readonly lineColors = computed(() => {
    const codes = this.federations().map((f) => f.code).sort();
    return new Map(codes.map((c, i) => [c, `var(--line-${(i % 8) + 1})`]));
  });

  lineColor(code: string | undefined | null): string {
    return (code && this.lineColors().get(code)) || 'var(--line-1)';
  }

  /** Federation with its resolved models, for directory cards. */
  readonly federationsWithModels = computed(() => {
    const byId = new Map(this.visibleModels().map((m) => [m.uuid, m]));
    return this.federations().map((f) => ({
      ...f,
      pathologies: (f.dataModelIds ?? []).map((id) => byId.get(id)).filter((m): m is Pathology => !!m),
    }));
  });

  load(): void {
    this.state.set('loading');
    forkJoin({
      federations: this.http.get<Federation[]>('/services/federations'),
      models: this.http.get<Pathology[]>('/services/datamodels'),
    }).subscribe({
      next: ({ federations, models }) => {
        this.federations.set(federations);
        this.models.set(models);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  /** Load once; views call this on init. */
  ensureLoaded(): void {
    if (this.state() === 'idle') this.load();
  }
}
