# Deploying to Kubernetes

Manifests here target namespace `peadminns`. Two placeholders must be
replaced before applying:

- `REPLACE_ME_REGISTRY` (in `03-backend.yaml`, `04-frontend.yaml`) — your
  container registry path.
- `REPLACE_ME_HOST` (in `01-configmap.yaml`, `05-ingress.yaml`) — the
  hostname the Ingress should route.
- `REPLACE_ME_SPLUNK_HOST` (in `01-configmap.yaml`) — your Splunk management
  API host.

```bash
# from the repo root, once you have the real values:
sed -i 's#REPLACE_ME_REGISTRY#ghcr.io/yourorg#g' k8s/03-backend.yaml k8s/04-frontend.yaml
sed -i 's#REPLACE_ME_HOST#splunk-tool.yourcompany.com#g' k8s/01-configmap.yaml k8s/05-ingress.yaml
sed -i 's#REPLACE_ME_SPLUNK_HOST#splunk.yourcompany.com#g' k8s/01-configmap.yaml
```

## 1. Build and push images

```bash
docker build -t <registry>/splunk-log-viewer-backend:latest ./backend
docker push <registry>/splunk-log-viewer-backend:latest

docker build -t <registry>/splunk-log-viewer-frontend:latest -f frontend/Dockerfile.prod ./frontend
docker push <registry>/splunk-log-viewer-frontend:latest
```

(Use a real tag — a git SHA or version — instead of `latest` for anything
beyond a first test, so deployments are reproducible and rollouts/rollbacks
are predictable.)

## 2. Create the namespace and credentials secret

```bash
kubectl apply -f k8s/00-namespace.yaml

kubectl create secret generic splunk-credentials \
  --namespace peadminns \
  --from-literal=SPLUNK_USERNAME='svc-log-viewer' \
  --from-literal=SPLUNK_PASSWORD='your-service-account-password'
```

Never commit real credentials — `02-secret.example.yaml` is a template only,
not something to `kubectl apply`.

## 3. Apply everything else

```bash
kubectl apply -k k8s/
```

This creates the ConfigMap, backend Deployment/Service/PVC, frontend
Deployment/Service, and Ingress.

## 4. Verify

```bash
kubectl -n peadminns get pods
kubectl -n peadminns logs deploy/backend
kubectl -n peadminns port-forward svc/frontend 8080:80   # quick check without an Ingress
```

Then confirm the backend can actually reach Splunk:

```bash
kubectl -n peadminns exec deploy/backend -- python -c \
  "import httpx; print(httpx.get('http://localhost:8000/api/health').json())"
```

## Notes / things to revisit

- **Saved searches storage**: currently a JSON file on the backend pod's
  volume (`backend/app/storage.py`), backed by a `ReadWriteOnce` PVC. That's
  fine for a single backend replica (as configured) but won't stay
  consistent if you scale the backend beyond 1 — move to a real database
  first if you need that.
- **TLS**: the Ingress ships HTTP-only; the commented-out `tls:` block in
  `05-ingress.yaml` shows how to terminate TLS (e.g. via cert-manager) once
  you have a certificate/issuer.
- **CORS**: the frontend's nginx reverse-proxies `/api` to the backend
  Service, so the browser only ever calls its own origin — Splunk
  credentials and the backend's internal Service DNS name are never exposed
  to the browser.
- **Resource requests/limits** in `03-backend.yaml`/`04-frontend.yaml` are
  conservative starting points — tune based on actual usage.
