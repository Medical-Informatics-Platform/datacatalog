import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {PathologyPageRoutingModule} from "./pathology-page-routing.module";
import {PathologyPageComponent} from "./pathology-page.component";
import {PathologyFormComponent} from "./pathology-form/pathology-form.component";

@NgModule({
  imports: [
    CommonModule,
    PathologyPageRoutingModule,
    PathologyPageComponent,
    PathologyFormComponent,
    // Import the routing module for this page
  ],
  exports: [PathologyPageComponent], // Export the main component
})
export class PathologyPageModule {}
