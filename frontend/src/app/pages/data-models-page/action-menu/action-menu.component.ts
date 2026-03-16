import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-action-menu',
  templateUrl: './action-menu.component.html',
  styleUrls: ['./action-menu.component.css'],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ActionMenuComponent {
  @Input() isSelectedDataModelReleased: boolean = false; // Determines menu options
  @Output() action = new EventEmitter<string>(); // Emits actions to parent
  @Output() menuVisibleChange = new EventEmitter<boolean>();

  menuVisible: boolean = false;
  toggleMenu(): void {
    this.menuVisible = !this.menuVisible;
    this.emitMenuVisibilityChange();
  }

  private emitMenuVisibilityChange(): void {
    this.menuVisibleChange.emit(this.menuVisible);
  }

  emitAction(actionType: string): void {
    this.action.emit(actionType);
    this.menuVisible = false;
    this.menuVisibleChange.emit(this.menuVisible);
  }


  onEscape(): void {
    if (this.menuVisible) {
      this.toggleMenu();
    }
  }
}
