import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Pathology} from "../../../interfaces/pathology.interface";

@Component({
  selector: 'app-pathology-selector',
  templateUrl: './pathology-selector.component.html',
  styleUrls: ['./pathology-selector.component.css'],
  standalone: true,
  imports: [
    FormsModule,
  ]
})
export class PathologySelectorComponent implements OnChanges, OnInit {
  @Input() crossSectionalModels: Pathology[] = [];
  @Input() longitudinalModels: Pathology[] = [];
  @Input() defaultModel: Pathology | null = null;

  @Output() pathologyChange = new EventEmitter<Pathology>();

  selectedPathology: Pathology | null = null;

  ngOnInit(): void {
    this.selectedPathology = this.defaultModel;
    this.onPathologyChange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultModel'] && changes['defaultModel'].currentValue !== this.defaultModel) {
      this.selectedPathology = this.defaultModel;
    }
    if (changes['crossSectionalModels'] || changes['longitudinalModels']) {
      // Reset selected pathology if inputs change
      this.selectedPathology = this.defaultModel;
    }
  }

  onPathologyChange(): void {
    if (this.selectedPathology) {
      this.pathologyChange.emit(this.selectedPathology);
    }
  }
}
