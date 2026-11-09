import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { createTidyTree } from './tidy-tree';
import { FormsModule } from '@angular/forms';
import { ErrorService } from '../services/error.service';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { SearchBarComponent } from './search-bar/search-bar.component';

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css'],
  standalone: true,
  imports: [FormsModule, BreadcrumbComponent, SearchBarComponent],
})
export class VisualizationComponent implements OnInit, OnChanges {
  @Input() pathologyHierarchy: any;

  breadcrumbPath: string[] = [];
  error: string | null = null;
  maxDepth = 2;
  newAvailableDepths = 5;
  isZoomEnabled = false;
  isFullscreen = false;
  private shouldForcePortrait = false;
  private orientationLocked = false;
  private originalData: any;

  constructor(
    private elementRef: ElementRef,
    private errorService: ErrorService
  ) {
    this.errorService.error$.subscribe((message) => {
      this.error = message;
    });
  }

  ngOnInit(): void {
    if (this.pathologyHierarchy) {
      this.originalData = this.pathologyHierarchy;
      this.initializeVisualization();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pathologyHierarchy']?.currentValue) {
      this.originalData = this.pathologyHierarchy;
      this.initializeVisualization();
    }
  }

  private initializeVisualization(): void {
    this.breadcrumbPath = [this.pathologyHierarchy?.name || 'Root'];
    this.renderChart();
  }

  createArray(size: number): number[] {
    return Array.from({ length: size }, (_, i) => i + 1);
  }

  onSearchResult(selectedItem: string): void {
    this.selectSearchResult(selectedItem);
  }

  private selectSearchResult(selected: string): void {
    const targetNode = this.findNodeByName(this.originalData, selected);

    if (!targetNode) {
      console.warn('No node found for the given search query.');
      return;
    }

    if (targetNode.children?.length > 0) {
      this.breadcrumbPath = this.getPathToNode(this.originalData, targetNode) || [];
      this.renderChart(targetNode);
    } else {
      const parentNode = this.findParentNode(this.originalData, targetNode);
      if (parentNode) {
        this.breadcrumbPath = this.getPathToNode(this.originalData, parentNode) || [];
        this.renderChart(parentNode, targetNode, 1);
        this.maxDepth = 1;
      }
    }
  }

  onZoomToggleChange() {
    const currentNode = this.findNodeByPath(this.originalData, this.breadcrumbPath);

    const currentMaxDepth = this.maxDepth;
    this.renderChart(currentNode, null, this.maxDepth);
    this.maxDepth = currentMaxDepth;
  }

  onMaxDepthChange(): void {
    const currentNode = this.findNodeByPath(this.originalData, this.breadcrumbPath);
    const currentMaxDepth = this.maxDepth;
    this.renderChart(currentNode, null, this.maxDepth);
    this.maxDepth = currentMaxDepth;
  }

  private getPathToNode(node: any, target: any, path: string[] = []): string[] | null {
    path.push(node.name);
    if (node === target) return path;

    for (const child of node.children || []) {
      const foundPath = this.getPathToNode(child, target, [...path]);
      if (foundPath) return foundPath;
    }

    return null;
  }

  private findParentNode(currentNode: any, targetNode: any, parent: any = null): any {
    if (currentNode === targetNode) return parent;
    for (const child of currentNode.children || []) {
      const foundParent = this.findParentNode(child, targetNode, currentNode);
      if (foundParent) return foundParent;
    }
    return null;
  }

  private findNodeByName(node: any, name: string): any {
    if (node.name === name) return node;
    for (const child of node.children || []) {
      const found = this.findNodeByName(child, name);
      if (found) return found;
    }
    return null;
  }

  handleBreadcrumbClick(index: number): void {
    this.breadcrumbPath = this.breadcrumbPath.slice(0, index + 1);
    const targetNode = this.findNodeByPath(this.originalData, this.breadcrumbPath);
    if (targetNode) {
      this.renderChart(targetNode);
    }
  }

  private findNodeByPath(node: any, path: string[]): any {
    return path.reduce(
      (current, part) => current?.children?.find((child: any) => child.name === part) || current,
      node
    );
  }

  onNodeClicked(_nodeData: any): void {
    // We handle the path highlighting internally in createTidyTree to avoid expensive re-renders
  }

  private renderChart(
    node: any = this.originalData,
    highlightedNode: any = null,
    maxDepth: number | null = null
  ): void {
    const container = this.elementRef.nativeElement.querySelector('#chart');
    if (!container) return;

    const appliedDepth = maxDepth !== null ? maxDepth : this.maxDepth;

    createTidyTree(
      this.breadcrumbPath,
      node,
      container,
      (path) => {
        this.breadcrumbPath = path;
      },
      (newAvailableDepths) => {
        this.newAvailableDepths = newAvailableDepths;
        if (this.maxDepth > newAvailableDepths) {
          this.maxDepth = newAvailableDepths;
        }
      },
      highlightedNode,
      appliedDepth,
      this.isZoomEnabled,
      this.onNodeClicked.bind(this)
    );
  }

  toggleFullscreen(): void {
    const chartContainer = this.elementRef.nativeElement.querySelector('#chart-container') as HTMLElement;
    if (!chartContainer) return;

    const doc: any = document;
    if (!doc.fullscreenElement) {
      this.shouldForcePortrait = this.isMobileViewport();
      const request =
        chartContainer.requestFullscreen?.bind(chartContainer) ||
        (chartContainer as any).webkitRequestFullscreen?.bind(chartContainer) ||
        (chartContainer as any).msRequestFullscreen?.bind(chartContainer);
      request?.();
    } else {
      this.shouldForcePortrait = false;
      const exit =
        doc.exitFullscreen?.bind(doc) ||
        (doc as any).webkitExitFullscreen?.bind(doc) ||
        (doc as any).msExitFullscreen?.bind(doc);
      exit?.();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    if (this.isFullscreen && this.shouldForcePortrait) {
      void this.lockPortraitOrientation();
    }

    if (!this.isFullscreen && this.orientationLocked) {
      void this.unlockOrientation();
      this.shouldForcePortrait = false;
    }
  }

  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  private async lockPortraitOrientation(): Promise<void> {
    const arte: any = screen;
    const orientation = arte?.orientation;
    if (orientation?.lock) {
      try {
        await orientation.lock('portrait-primary');
        this.orientationLocked = true;
      } catch {
        this.orientationLocked = false;
      }
    }
  }

  private async unlockOrientation(): Promise<void> {
    const arte: any = screen;
    const orientation = arte?.orientation;
    if (this.orientationLocked && orientation?.unlock) {
      try {
        await orientation.unlock();
      } finally {
        this.orientationLocked = false;
      }
    }
  }
}
