import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {PathologyFormComponent} from "./pathology-form/pathology-form.component";

const routes: Routes = [
  {
    path: 'add',
    component: PathologyFormComponent,
    data: { isUpdate: false },
  },
  {
    path: 'update',
    component: PathologyFormComponent,
    data: { isUpdate: true },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PathologyPageRoutingModule {}
