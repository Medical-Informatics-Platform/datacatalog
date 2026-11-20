import { provideZoneChangeDetection } from "@angular/core";
import 'zone.js'; // Required for Angular
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import {appRoutes} from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      }),
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'MIP-XSRF-TOKEN',
        headerName: 'X-MIP-XSRF-TOKEN',
      })
    )
  ]
}).catch(err => console.error(err));
