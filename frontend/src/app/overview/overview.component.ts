import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '../services/catalog.store';
import { formatCount } from '../services/pathology-tree';
import { FederationDirectoryComponent } from './federation-directory.component';
import { LineMapComponent } from './line-map.component';
import { PlatformPreviewComponent } from './platform-preview.component';

@Component({
  selector: 'mip-overview',
  standalone: true,
  imports: [RouterLink, LineMapComponent, PlatformPreviewComponent, FederationDirectoryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wrap hero">
      <div class="copy">
        <h1>What Europe's federated brain-health networks collect, variable by variable.</h1>
        <p class="lead">
          This catalog publishes metadata only: which federations exist, how many hospitals and records each holds, and
          every variable in their data models. Patient records never leave the hospitals; MIP runs analyses where the
          data lives.
        </p>
        <div class="cta">
          <a class="btn btn-primary" routerLink="/pathology">Explore data models</a>
          <a class="btn" routerLink="/" fragment="federations">Browse federations</a>
        </div>
      </div>
      <div class="map" aria-live="polite">
        @if (store.state() === 'ready') {
          <mip-line-map [federations]="store.federationsWithModels()" />
        } @else if (store.state() === 'error') {
          <p class="muted">The network map didn't load.</p>
        } @else {
          <div class="skel" style="height:300px"></div>
        }
      </div>
    </section>

    <section class="strip" aria-label="Network figures">
      <div class="wrap">
        @if (store.state() === 'error') {
          <div class="banner error" role="status">
            <span>Network figures didn't load.</span>
            <button class="btn btn-sm" type="button" (click)="store.load()">Retry</button>
          </div>
        } @else {
          <dl class="cells" [attr.aria-busy]="store.state() !== 'ready'">
            @for (c of cells(); track c.label) {
              <div class="cell">
                <dt>{{ c.label }}</dt>
                <dd class="num">
                  @if (store.state() === 'ready') { {{ c.value }} } @else { <span class="skel bar"></span> }
                </dd>
              </div>
            }
          </dl>
          <p class="note muted">Figures as reported by each federation.</p>
        }
      </div>
    </section>

    <mip-platform-preview />
    <mip-federation-directory />

    <section class="wrap about" id="about" aria-labelledby="ab-h">
      <h2 id="ab-h">About</h2>
      <div class="cols">
        <div>
          <h3>What MIP is</h3>
          <p>
            The Medical Informatics Platform (MIP) lets researchers analyse clinical brain-health data held in
            different hospitals without moving it. Each hospital keeps its records locally; analyses run on site and
            only aggregated results are combined.
          </p>
        </div>
        <div>
          <h3>What this catalog holds</h3>
          <p>
            Descriptions of federations, and the Common Data Elements (CDEs) of each pathology: groups, variables,
            types, units, ranges and allowed values. Use it to check what exists before designing a study.
          </p>
          <div class="hn">
            <div><h3 class="ok">Holds</h3><ul><li>Federation descriptions and sizes</li><li>Data model structure</li><li>Variable definitions</li></ul></div>
            <div><h3 class="no">Never holds</h3><ul><li>Patient-level records</li></ul></div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  protected store = inject(CatalogStore);

  protected cells = () => {
    const m = this.store.metrics();
    return [
      { label: 'federations', value: formatCount(m.federations) },
      { label: 'participating institutions', value: formatCount(m.institutions) },
      { label: 'patient records', value: formatCount(m.records) },
      { label: 'released data models', value: formatCount(m.models) },
    ];
  };

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
}
