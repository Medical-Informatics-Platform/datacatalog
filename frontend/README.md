# Datacatalog Frontend

This directory contains the Angular 22 frontend for DataCatalog. The app bootstraps as a standalone
application from `src/main.ts` with standalone and lazy-loading routes, Angular Material, D3-based
visualisation, and a dev proxy for `/services` requests to the backend. Only the `pathology` route
still loads an `NgModule` (`pathology-page.module.ts`); every other route uses standalone
components declared in `src/app/app.routes.ts`.

## Prerequisites

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` (the `engines` range of Angular CLI 22)
- npm `10+`

## Development

Install dependencies and start the dev server:

```bash
npm ci
npm start
```

The app runs at `http://localhost:4200`. API calls to `/services` are proxied to
`http://localhost:8090` through `src/proxy.conf.json`, so the backend has to listen on that port.

## Common Commands

- `npm start`: run the Angular dev server
- `npm run watch`: rebuild continuously in development mode
- `npm run build`: create a production bundle in `dist/datacatalog-frontend`
- `npm test -- --watch=false --browsers=ChromeHeadless`: run the Karma/Jasmine suite once

## Authentication and CSRF

- Login redirects to `/services/oauth2/authorization/keycloak` and returns to
  `/auth-callback?token=...`; logout posts to `/services/logout` and then clears local state.
- `provideHttpClient(withXsrfConfiguration(...))` in `src/main.ts` copies the `MIP-XSRF-TOKEN`
  cookie into the `X-MIP-XSRF-TOKEN` header expected by the backend. CSRF protection is active in
  every backend profile, including `AUTHENTICATION=0`.
- `guards/auth.guard.ts` protects `/account` and sends unauthenticated visitors to login. With
  `AUTHENTICATION=0` the app is browsable without a session, but role-gated writes still fail because
  no principal carries `DC_DOMAIN_EXPERT` or `DC_ADMIN`.

## Docker Build

Build the production image from this directory:

```bash
docker build -t datacatalog-frontend .
```

The container compiles the Angular app with Node 24 and serves the built output with Nginx on port
`80`. `nginx.conf` proxies `/services/` to `http://backend:8090`, the service name used by both
`compose.yaml` and the Helm chart, and falls back to `index.html` for client-side routing.

## Project Layout

- `src/main.ts`: standalone bootstrap, router, HTTP and XSRF providers
- `src/app/app.routes.ts`: route table, including `loadComponent` and `loadChildren` routes
- `src/app/pages/`: landing, home redirect, pathology, federations, account, about, and shared code
- `src/app/services/`: `auth.service.ts`, `federation.service.ts`, `pathology.service.ts`, `user.service.ts`
- `src/app/interfaces/`: `federations`, `pathology`, and `user` types
- `src/app/callback/`: OAuth callback component
- `src/assets/`: static images and logos
- `src/DESIGN_SYSTEM.yaml`: MIP brand rules (logo variants, colors, typography) to follow on UI work
- `src/proxy.conf.json`: local backend proxy
- `nginx.conf`: production container config
- `angular.json`: Angular workspace configuration
