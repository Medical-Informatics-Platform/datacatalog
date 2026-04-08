# Kubernetes Deployment Guide

This chart deploys the frontend, backend, data quality tool, and PostgreSQL for DataCatalog.

## Prerequisites

- Kubernetes cluster
- Helm 3
- A namespace where the release will run

For local MicroK8s usage:

```bash
sudo snap install microk8s --classic
microk8s enable dns ingress helm3 storage
```

## Required Configuration

The chart now takes its namespace from the Helm release, not from `values.yaml`.

Update `values.yaml` or provide overrides for:

- `cluster.managed`: `false` for microk8s/local storage, `true` for managed-cluster storage classes
- `images.repository` and `images.tag`: image location and release tag
- `global.publicHost`: bare public hostname used by the frontend ingress and backend auth callback URL
- `datacatalogDb.image`: PostgreSQL image, currently `postgres:18.3`
- `backend.authentication`: enable or disable Keycloak-backed authentication in the backend
- `cluster.storageClasses.managed` if your managed cluster uses a different default storage class
- `frontend.ingress.tlsSecretName`: override the default TLS secret name

The chart expects a secret named `datacatalog-secrets` with:

- `db.user`
- `db.password`
- `keycloak.client-id`
- `keycloak.client-secret`

Example:

```bash
kubectl -n default create secret generic datacatalog-secrets \
  --from-literal=db.user=postgres \
  --from-literal=db.password=test \
  --from-literal=keycloak.client-id=datacatalog \
  --from-literal=keycloak.client-secret=change-me
```

## Install Or Upgrade

From the `kubernetes/` directory:

```bash
helm upgrade --install datacatalog . -n default --create-namespace
```

With MicroK8s:

```bash
microk8s helm3 upgrade --install datacatalog . -n default --create-namespace
```

## Access Model

- The frontend is exposed through ingress when `global.publicHost` is set.
- Frontend and backend services are internal `ClusterIP` services in both managed and microk8s deployments.
- `cluster.managed` only controls storage-class selection and whether the microk8s local `StorageClass` is rendered.

The database uses a PVC and mounts storage at `/var/lib/postgresql`.
