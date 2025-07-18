#!/bin/bash

# Create database credentials secret
kubectl create secret generic database-credentials \
  --namespace nebulance \
  --from-literal=POSTGRES_USER=appuser \
  --from-literal=POSTGRES_PASSWORD=tsfe/oyISE4QOPToiyEbbHfvjDc= \
  --from-literal=POSTGRES_DB=appdb \
  --dry-run=client -o yaml | kubectl apply -f -

# Create application credentials secret
kubectl create secret generic application-credentials \
  --namespace nebulance \
  --from-literal=JWT_SECRET=24CZOL57stdJrcwrcxMAnh05YDybY/HF5+jZzEWkN7c= \
  --from-literal=API_KEY=36ba7929d6f0007a73d964350e830a20 \
  --from-literal=NODE_ENV=production \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments
kubectl rollout restart deployment/frontend deployment/backend -n nebulance