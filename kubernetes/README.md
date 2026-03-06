# Kubernetes Deployment Guide

This chart deploys the frontend, backend, data quality tool, and PostgreSQL for DataCatalog.

## Prerequisites

- Kubernetes cluster
- Helm 3
- A namespace where the release will run

For local MicroK8s usage:

```bash
sudo snap install microk8s --classic
microk8s enable dns ingress helm3
```

## Required Configuration

Update `values.yaml` before deploying:

- `managed_cluster`: `false` for local NodePort access, `true` for ingress-based clusters
- `namespace`: target namespace
- `datacatalog_images.repository` and `datacatalog_images.tag`: image location and release tag
- `datacatalogDb.image`: PostgreSQL image, currently `postgres:18.3`
- `backend.publicHost`: public hostname used by the frontend and auth callback
- `backend.dqtUrl`: URL of the data quality tool service

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

- `managed_cluster: false`: frontend and backend are exposed through NodePorts defined in the templates
- `managed_cluster: true`: the chart creates an ingress for the frontend host in `backend.publicHost`

The database uses a PVC and mounts storage at `/var/lib/postgresql`.
