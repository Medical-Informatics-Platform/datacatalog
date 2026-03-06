# Datacatalog Frontend

This directory contains the Angular 21 frontend for DataCatalog. The app uses standalone components, Angular Material, D3-based visualization, and a dev proxy for `/services` requests to the backend.

## Prerequisites

- Node.js `20.19+`
- npm `10+`

## Development

Install dependencies and start the dev server:

```bash
npm ci
npm start
```

The app runs at `http://localhost:4200`. API calls to `/services` are proxied to `http://localhost:8090` through `src/proxy.conf.json`.

## Common Commands

- `npm start`: run the Angular dev server
- `npm run watch`: rebuild continuously in development mode
- `npm run build`: create a production bundle in `dist/datacatalog-frontend`
- `npm test -- --watch=false --browsers=ChromeHeadless`: run the Karma/Jasmine suite once

## Docker Build

Build the production image from this directory:

```bash
docker build -t datacatalog-frontend .
```

The container compiles the Angular app with Node 20 and serves the built output with Nginx on port `80`.

## Project Layout

- `src/app/`: application code
- `src/assets/`: static images and logos
- `src/proxy.conf.json`: local backend proxy
- `angular.json`: Angular workspace configuration
