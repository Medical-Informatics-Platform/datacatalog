import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './callback/authcallback.component';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: '<main><h1>MIP Data Catalog</h1><p>UI scaffold ready for rebuild.</p></main>',
})
export class PlaceholderComponent {}

export const appRoutes: Routes = [
  { path: '', component: PlaceholderComponent },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: '**', redirectTo: '' },
];
