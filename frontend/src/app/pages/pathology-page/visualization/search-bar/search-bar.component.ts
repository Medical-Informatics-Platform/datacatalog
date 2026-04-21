import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['./search-bar.component.css'],
})
export class SearchBarComponent implements OnInit, OnChanges {
  @Input() pathologyHierarchy: any;
  @Output() searchResultSelected = new EventEmitter<string>();
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  searchQuery = '';
  variables: { name: string; type: string; path: string }[] = [];
  groups: { name: string; path: string }[] = [];
  filteredItems: any[] = [];
  searchSuggestionsVisible = false;
  isSearchExpanded = false;
  filterType = 'variables';
  variableTypeFilter = '';
  variableTypes: string[] = [];

  constructor(private eRef: ElementRef) {}

  ngOnInit(): void {
    this.extractVariablesAndGroups(this.pathologyHierarchy);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pathologyHierarchy']?.currentValue) {
      this.variables = [];
      this.groups = [];
      this.variableTypes = [];
      this.extractVariablesAndGroups(this.pathologyHierarchy);
      this.applyFilter(this.filterType);
    }
  }

  toggleSearch(event: MouseEvent): void {
    event.stopPropagation();

    if (this.isSearchExpanded) {
      this.closeSearch();
      return;
    }

    this.isSearchExpanded = true;
    this.searchSuggestionsVisible = false;
    this.applyFilter(this.filterType);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }

  closeSearch(): void {
    this.isSearchExpanded = false;
    this.searchQuery = '';
    this.searchSuggestionsVisible = false;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event): void {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.closeSearch();
    }
  }

  extractVariablesAndGroups(hierarchy: any): void {
    const traverse = (node: any, path: string) => {
      if (!node) {
        return;
      }

      const currentPath = path ? `${path} > ${node.name}` : node.name;

      if (node.hasOwnProperty('variableCount')) {
        this.groups.push({ name: node.name, path: currentPath });
        node.children.forEach((child: any) => traverse(child, currentPath));
      } else {
        this.variables.push({ name: node.name, type: node.type, path: currentPath });
        if (node.type && !this.variableTypes.includes(node.type)) {
          this.variableTypes.push(node.type);
        }
      }
    };

    traverse(hierarchy, '');
    this.variableTypes.sort((a, b) => a.localeCompare(b));
  }

  handleSearch(query: string): void {
    this.searchQuery = query.toLowerCase().trim();
    this.applyFilter(this.filterType);
    this.searchSuggestionsVisible = true;
  }

  applyFilter(type: string): void {
    const normalizedQuery = this.searchQuery.trim();
    let results: any[] = [];

    if (type === 'variables') {
      results = this.variables.filter(
        (variable) =>
          (!normalizedQuery || variable.name.toLowerCase().includes(normalizedQuery)) &&
          (this.variableTypeFilter ? variable.type === this.variableTypeFilter : true)
      );
    } else {
      results = this.groups.filter(
        (group) => !normalizedQuery || group.name.toLowerCase().includes(normalizedQuery)
      );
    }

    this.filteredItems = results.slice(0, 18);
  }

  applyVariableTypeFilter(type: string): void {
    this.variableTypeFilter = type;
    this.applyFilter(this.filterType);
  }

  onItemClick(item: any): void {
    this.searchQuery = item.name || item;
    this.searchSuggestionsVisible = false;
    this.searchResultSelected.emit(this.searchQuery);
  }

  generateTooltip(item: any): string {
    if ('type' in item) {
      return `Path: ${item.path}\nType: ${item.type}`;
    }
    return `Path: ${item.path}`;
  }

  onSearchFocus(): void {
    this.searchSuggestionsVisible = true;
    this.applyFilter(this.filterType);
  }
}
