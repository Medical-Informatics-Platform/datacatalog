import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.5-4.5',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  'life-buoy': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24',
  x: 'M6 6l12 12M18 6L6 18',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  down: 'M6 9l6 6 6-6',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 19h14',
  upload: 'M12 16V5m0 0L8 9m4-4l4 4M5 19h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  collapse: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  alert: 'M12 4l9 16H3L12 4zM12 10v4M12 17v.5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1-4 4-6 8-6s7 2 8 6',
  columns: 'M4 5h5v14H4zM10 5h5v14h-5zM16 5h4v14h-4z',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  tree: 'M3 12h5c3 0 3-6 6-6h6M8 12c3 0 3 6 6 6h6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  file: 'M6 3h8l4 4v14H6zM14 3v5h5',
  up: 'M6 15l6-6 6 6',
};

/** One stroke weight, one family: all icons are authored paths on a 24 grid. */
@Component({
  selector: 'mip-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="d()" />
  </svg>`,
  styles: [':host{display:inline-flex;flex:none;line-height:0}'],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly d = computed(() => PATHS[this.name()] ?? '');
}
