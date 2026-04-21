import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { AuthGuard } from './guards/auth.guard';
import { NgModule } from '@angular/core';
import { AuthCallbackComponent } from './callback/authcallback.component';
import { PathologyPageComponent } from './pages/pathology-page/pathology-page.component';
import { HomeSectionRedirectComponent } from './pages/home-section-redirect/home-section-redirect.component';


export const appRoutes: Routes = [
  { path: '', component: LandingPageComponent },
  {
    path: 'home',
    component: HomeSectionRedirectComponent,
  },
  {
    path: 'pathology',
    component: PathologyPageComponent,
    loadChildren: () =>
      import('./pages/pathology-page/pathology-page.module').then(
        (m) => m.PathologyPageModule
      ),
  },
  {
    path: 'federations',
    pathMatch: 'full',
    component: HomeSectionRedirectComponent,
    data: { fragment: 'federations' },
  },
  {
    path: 'federations',
    loadChildren: () =>
      import('./pages/federations-page/federations-page.module').then(
        (m) => m.FederationsPageModule
      ),
  },
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  { path: 'auth-callback', component: AuthCallbackComponent },
  {
    path: 'about',
    component: HomeSectionRedirectComponent,
    data: { fragment: 'about' },
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
