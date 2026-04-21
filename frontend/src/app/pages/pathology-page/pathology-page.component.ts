import { Component, OnInit, signal} from '@angular/core';
import { FormsModule } from "@angular/forms";

import { Federation } from "../../interfaces/federations.interface";
import { FederationService } from "../../services/federation.service";
import { PathologyService } from "../../services/pathology.service";
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { Pathology } from "../../interfaces/pathology.interface";
import { FederationSelectorComponent } from "./federation-selector/federation-selector.component";
import { VisualizationComponent } from "./visualization/visualization.component";
import { ActionMenuComponent } from "./action-menu/action-menu.component";
import { PathologySelectorComponent } from "./pathology-selector/pathology-selector.component";
import { ExportOptionsComponent } from "./export-options/export-options.component";
import {ErrorService} from "./services/error.service";
import {ConfirmationDialogComponent} from "./confirmation-dialog/confirmation-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {PathologyFormComponent} from "./pathology-form/pathology-form.component";
import {GuidePopupComponent} from "./guide-popup/guide-popup.component";


@Component({
  selector: 'app-pathology-page',
  standalone: true,
  templateUrl: './pathology-page.component.html',
  styleUrls: ['./pathology-page.component.css'],
  imports: [
    FormsModule,
    FederationSelectorComponent,
    VisualizationComponent,
    ActionMenuComponent,
    PathologySelectorComponent,
    ExportOptionsComponent,
    RouterOutlet,
    GuidePopupComponent
],
})
export class PathologyPageComponent implements OnInit{
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation: Federation | null = null;
  selectedPathology: Pathology | null | undefined;
  queryPathologyCode: string | null = null;
  queryPathologySlug: string | null = null;
  queryLatestFlag = false;
  isDomainExpert = false;
  selectedFileType = signal<'json' | 'xlsx'>('json');
  crossSectionalModels: Pathology[] = [];
  longitudinalModels: Pathology[] = [];
  menuVisible = signal(false);
  isLoading = signal(false);

  // Computed metrics for the sidebar
  get variableCount(): number {
    if (!this.d3Data) return 0;
    return this.countNodes(this.d3Data, 'variable');
  }

  get groupCount(): number {
    if (!this.d3Data) return 0;
    // Subtract 1 to not count the root pathology node as a group
    return Math.max(0, this.countNodes(this.d3Data, 'group') - 1);
  }

  private countNodes(node: any, type: string): number {
    let count = node.type === type ? 1 : 0;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child, type);
      }
    }
    return count;
  }

  constructor(
    private federationService: FederationService,
    private pathologyService: PathologyService,
    private authService: AuthService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}



  ngOnInit(): void {
    // Check for the user's role first
    this.authService.hasRole('DC_DOMAIN_EXPERT').subscribe((hasRole) => {
      this.isDomainExpert = hasRole;
    });

    this.isLoading.set(true);
    // Load federations and query params together
    this.federationService.getFederationsWithPathologies().subscribe({
      next: (federations: Federation[]) => {
        this.federations = federations;
        this.isLoading.set(false);

        // Now process the query parameters
        this.route.queryParams.subscribe((params) => {
          const federationCode = params['federationCode'];
          const pathologyCode = params['pathologyCode'];
          const latestFlag = params['latest'];

          // Set selectedFederation based on federationCode
          this.selectedFederation = federationCode
            ? this.federations.find((fed) => fed.code === federationCode) || null
            : null;

          if (typeof pathologyCode === 'string') {
            this.queryPathologyCode = this.normalizeIdentifier(pathologyCode);
            this.queryPathologySlug = this.slugifyIdentifier(this.queryPathologyCode);
          } else {
            this.queryPathologyCode = null;
            this.queryPathologySlug = null;
          }
          this.queryLatestFlag = this.parseLatestFlag(latestFlag);

      console.log('[Pathology] Applied query params', {
            federationCode,
            pathologyCode,
            normalizedCode: this.queryPathologyCode,
            slug: this.queryPathologySlug,
            latest: this.queryLatestFlag,
          });

          this.loadPathologies();
        });
      },
      error: (error) => {
        console.error('Error loading federations:', error);
        this.errorService.setError('Failed to load federations.');
      },
    });
  }

  loadPathologies(): void {
    this.isLoading.set(true);
    if (this.selectedFederation) {
      this.pathologyService.getPathologiesByIds(this.selectedFederation.dataModelIds).subscribe((pathologies) => {
        this.handlePathologyResponse(pathologies);
        this.isLoading.set(false);
      });

    } else {
      if (this.isDomainExpert){
        this.pathologyService.getAllPathologies().subscribe((pathologies) => {
          this.handlePathologyResponse(pathologies);
          this.isLoading.set(false);
        });
      }
      else {
        this.pathologyService.getAllReleasedPathologies().subscribe((pathologies) => {
          this.handlePathologyResponse(pathologies);
          this.isLoading.set(false);
        });
      }
    }
  }

  handlePathologyResponse(pathologies: Pathology[]): void {
    const { crossSectional, longitudinal } = this.pathologyService.categorizePathologies(pathologies);
    this.crossSectionalModels = crossSectional;
    this.longitudinalModels = longitudinal;
    this.selectedPathology = this.pickPathologySelection(crossSectional, longitudinal);
    this.loadVisualizationData();
  }

  loadVisualizationData(): void {
    if (this.selectedPathology) {
      this.d3Data = this.pathologyService.convertToD3Hierarchy(this.selectedPathology);
    }
  }

  onSelectedPathologyChange(selectedPathology: Pathology | null): void {
    this.selectedPathology = selectedPathology;
    this.loadVisualizationData();
  }

  onSelectedFederationChange(selectedFederation: Federation | null): void {
    this.selectedFederation = selectedFederation;
    this.loadPathologies();
  }

  private pickPathologySelection(crossSectional: Pathology[], longitudinal: Pathology[]): Pathology | null {
    const combined = [...crossSectional, ...longitudinal];

    if (!this.queryPathologyCode) {
      console.log('[Pathology] No pathologyCode query provided; falling back to first available model.');
      return crossSectional[0] || longitudinal[0] || null;
    }

    const matchingLogs = combined.map((model) => {
      const normalizedCode = this.normalizeIdentifier(model.code);
      const normalizedLabel = this.normalizeIdentifier(model.label);
      const candidates = [
        normalizedCode,
        normalizedLabel,
        this.slugifyIdentifier(normalizedCode),
        this.slugifyIdentifier(normalizedLabel),
      ].filter((candidate): candidate is string => candidate !== null);

      const exactMatch = candidates.some((candidate) =>
        candidate === this.queryPathologyCode
        || (this.queryPathologySlug !== null && candidate === this.queryPathologySlug)
      );
      const partialMatch = candidates.some((candidate) =>
        (this.queryPathologyCode !== null && candidate.includes(this.queryPathologyCode))
        || (this.queryPathologySlug !== null && candidate.includes(this.queryPathologySlug))
      );

      return {
        code: model.code,
        label: model.label,
        version: model.version,
        candidates,
        exactMatch,
        partialMatch,
        matches: exactMatch || partialMatch,
      };
    });

    const matchingModels = combined.filter((_, index) => matchingLogs[index].matches);

    console.log('[Pathology] Evaluated pathology matches', {
      query: {
        code: this.queryPathologyCode,
        slug: this.queryPathologySlug,
        latest: this.queryLatestFlag,
      },
      results: matchingLogs,
    });

    if (matchingModels.length === 0) {
      console.log('[Pathology] No matching pathology entries found; falling back to default ordering.');
      return crossSectional[0] || longitudinal[0] || null;
    }

    if (this.queryLatestFlag) {
      const selectedLatest = matchingModels.reduce((latest, current) =>
        this.compareSemanticVersions(current.version, latest.version) > 0 ? current : latest
      , matchingModels[0]);
      console.log('[Pathology] Selected latest matching pathology entry', {
        code: selectedLatest.code,
        label: selectedLatest.label,
        version: selectedLatest.version,
      });
      return selectedLatest;
    }

    const selectedModel = matchingModels[0];
    console.log('[Pathology] Selected matching pathology entry', {
      code: selectedModel.code,
      label: selectedModel.label,
      version: selectedModel.version,
    });
    return selectedModel;
  }

  private parseLatestFlag(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return false;
  }

  private compareSemanticVersions(a: string | undefined, b: string | undefined): number {
    const aTokens = this.tokenizeVersion(a);
    const bTokens = this.tokenizeVersion(b);
    const maxLength = Math.max(aTokens.length, bTokens.length);

    for (let i = 0; i < maxLength; i += 1) {
      const aToken = aTokens[i];
      const bToken = bTokens[i];

      if (aToken === undefined && bToken === undefined) {
        return 0;
      }
      if (aToken === undefined) {
        return -1;
      }
      if (bToken === undefined) {
        return 1;
      }

      const aIsNumeric = /^\d+$/.test(aToken);
      const bIsNumeric = /^\d+$/.test(bToken);

      if (aIsNumeric && bIsNumeric) {
        const aVal = parseInt(aToken, 10);
        const bVal = parseInt(bToken, 10);
        if (aVal !== bVal) {
          return aVal > bVal ? 1 : -1;
        }
        continue;
      }

      if (aIsNumeric) {
        return 1;
      }
      if (bIsNumeric) {
        return -1;
      }

      if (aToken !== bToken) {
        return aToken > bToken ? 1 : -1;
      }
    }

    return 0;
  }

  private tokenizeVersion(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const rawTokens = normalized.match(/[a-z]+|\d+/g) || [];
    if (rawTokens.length > 1 && rawTokens[0] === 'v') {
      rawTokens.shift();
    }
    return rawTokens;
  }

  private normalizeIdentifier(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private slugifyIdentifier(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const slug = value.replace(/[^a-z0-9]/g, '');
    return slug.length > 0 ? slug : null;
  }


  handleAction(action: string): void {
    switch (action) {
      case 'add':
        this.goToAddPathology();
        break;
      case 'update':
        this.goToUpdatePathology();
        break;
      case 'delete':
        this.deletePathology();
        break;
      case 'release':
        this.releasePathology();
        break;
      default:
        console.error('Unknown action:', action);
    }
  }

  goToAddPathology(): void {
    const dialogRef = this.dialog.open(PathologyFormComponent, {
      data: { isUpdateMode: false }, // Pass props for add mode
    });

    dialogRef.componentInstance.pathologyUpdated.subscribe(() => {
      this.onPathologyUpdated(); // Refresh pathologies after adding
      dialogRef.close(); // Close the dialog after the operation
    });
  }

  goToUpdatePathology(): void {
    if (this.selectedPathology) {
      const dialogRef = this.dialog.open(PathologyFormComponent, {
        data: {
          isUpdateMode: true,
          pathologyId: this.selectedPathology.uuid, // Pass the current pathology's ID for update mode
        },
      });

      dialogRef.componentInstance.pathologyUpdated.subscribe(() => {
        this.onPathologyUpdated(); // Refresh pathologies after updating
        dialogRef.close(); // Close the dialog after the operation
      });
    }
  }

  onPathologyUpdated(): void {
    this.loadPathologies();
  }


  // Check if the current route is a child route
  isChildRouteActive(): boolean {
    const currentPath = this.router.url;
    return currentPath.includes('/pathology/add') || currentPath.includes('/pathology/update');
  }

  deletePathology(): void {
    if (!this.selectedPathology) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Pathology',
        message: 'Are you sure you want to delete this pathology? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && this.selectedPathology?.uuid) {
        this.pathologyService.deletePathology(this.selectedPathology.uuid).subscribe({
          next: () => {
            this.pathologyService.getAllPathologies().subscribe((pathologies: Pathology[]) => {
              this.handlePathologyResponse(pathologies);
            });
          },
          error: (error: any) => console.error('Error deleting pathology:', error)
        });
      }
    });
  }

  releasePathology(): void {
    if (!this.selectedPathology) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Release Pathology',
        message: 'Are you sure you want to release this pathology?'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && this.selectedPathology?.uuid) {
        this.pathologyService.releasePathology(this.selectedPathology.uuid).subscribe({
          next: () => {
            this.pathologyService.getAllPathologies().subscribe((pathologies: Pathology[]) => {
              this.handlePathologyResponse(pathologies);
            });
          },
          error: (error: any) => console.error('Error releasing pathology:', error)
        });
      }
    });
  }

  exportPathology(fileType: 'json' | 'xlsx'): void {
    if (this.selectedPathology) {
      this.pathologyService.exportPathology(this.selectedPathology, fileType);
    }
  }

  handleMenuToggle(visible: boolean): void {
    this.menuVisible.set(visible);
  }
}
