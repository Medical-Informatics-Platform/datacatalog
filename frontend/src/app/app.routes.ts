import { Routes } from '@angular/router';
import { AccountComponent } from './account/account.component';
import { AuthCallbackComponent } from './callback/authcallback.component';
import { AuthGuard } from './guards/auth.guard';
import { OverviewComponent } from './overview/overview.component';

export const appRoutes: Routes = [
  { path: '', component: OverviewComponent, title: 'MIP Data Catalog' },
  {
    path: 'pathology',
    title: 'Pathology Explorer · MIP Data Catalog',
    loadComponent: () => import('./pathology/pathology.component').then((m) => m.PathologyComponent),
  },
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard], title: 'Account · MIP Data Catalog' },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: '**', redirectTo: '' },
];
