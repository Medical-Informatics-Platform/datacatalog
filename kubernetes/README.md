# Kubernetes Deployment Guide

This chart deploys the frontend, backend, data quality tool, and PostgreSQL for DataCatalog. It
creates four `ClusterIP` services (`frontend`, `backend`, `data-quality-tool`, `datacatalogdb`) and
one Ingress that points at the frontend.

## Prerequisites

- Kubernetes cluster
- Helm 3
- A namespace where the release will run
- An Ingress controller matching `frontend.ingress.className` and cert-manager with a `ClusterIssuer`
  matching `frontend.ingress.clusterIssuer`, which are `haproxy-public` and `letsencrypt-public` by
  default

For local MicroK8s usage:

```bash
sudo snap install microk8s --classic
microk8s enable dns ingress helm3 storage
```

## Required Configuration

The chart takes its namespace from the Helm release, not from `values.yaml`. Update `values.yaml` or
provide overrides for:

- `cluster.managed`: `false` for microk8s/local storage, `true` for managed-cluster storage classes
- `cluster.storageClasses.local` and `cluster.storageClasses.managed`: storage classes selected by
  `cluster.managed`; the local one is `k8s-local-storage`
- `images.repository` and `images.tag`: single tag shared by all three images, rendered as
  `<repository>/datacatalog_frontend`, `<repository>/datacatalog_backend`, and
  `<repository>/datacatalog_data_quality_tool` (defaults `hbpmip` and `2.0.0`)
- `global.publicHost`: bare public hostname, used as the Ingress and TLS host and as
  `PUBLIC_HOST=https://<publicHost>` for the backend; the Ingress is only rendered when it is set
- `frontend.ingress.className`, `frontend.ingress.clusterIssuer`, and
  `frontend.ingress.tlsSecretName` (default `datacatalog-tls`, created by cert-manager)
- `datacatalogDb.image`: PostgreSQL image, currently `postgres:18.6`
- `datacatalogDb.db`: database name, also the name in the backend `DB_URL` (default `datacatalog`)
- `datacatalogDb.storage`: size requested by the `db-pvc` volume claim (default `5Gi`)
- `backend.authentication`: renders `AUTHENTICATION=1` or `0` in the backend
- `backend.keycloak.authUrl`, `backend.keycloak.realm`, and `backend.keycloak.sslRequired`
- `dqt.flaskEnv` and `dqt.flaskDebug`: Flask flags passed to the data quality tool
- `dqt.maxUploadSizeMb`: upload limit rendered as `MAX_UPLOAD_SIZE_MB` in the data quality tool
  (default `20`, matching `compose.yaml` and the image default)

The chart expects a secret named `datacatalog-secrets` with:

- `db.user`
- `db.password`
- `keycloak.client-id`
- `keycloak.client-secret`

Create it before installing: the backend references all four keys unconditionally, so it will not
start without them even when `backend.authentication` is `false`.

Example:

```bash
kubectl -n default create secret generic datacatalog-secrets \
  --from-literal=db.user=postgres \
  --from-literal=db.password=test \
  --from-literal=keycloak.client-id=datacatalogue \
  --from-literal=keycloak.client-secret=change-me
```

## Install Or Upgrade

Render and lint first when you change values:

```bash
helm lint .
helm template datacatalog . > /dev/null
```

From the `kubernetes/` directory:

```bash
helm upgrade --install datacatalog . -n default --create-namespace
```

With MicroK8s:

```bash
microk8s helm3 upgrade --install datacatalog . -n default --create-namespace
```

## Access Model

- The frontend is exposed through Ingress when `global.publicHost` is set; TLS is issued by the
  configured `ClusterIssuer`.
- Frontend and backend services are internal `ClusterIP` services in both managed and microk8s
  deployments, as are `data-quality-tool` and `datacatalogdb`.
- The frontend container proxies `/services/` to `http://backend:8090`, and the backend reaches the
  converter at `http://data-quality-tool:8000`.
- `cluster.managed` only controls storage-class selection and whether the microk8s local
  `StorageClass` is rendered.

The database uses the `db-pvc` PVC and mounts storage at `/var/lib/postgresql`. With
`cluster.managed` set to `true` the claim is annotated so Argo CD will not prune it.

All containers are probed: the backend on `/services/actuator/health`, the data quality tool on `/`,
the frontend on `/`, and PostgreSQL with `pg_isready`.
