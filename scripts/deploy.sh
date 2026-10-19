#!/usr/bin/env bash
# Build -> push to ECR -> apply every manifest. Run from the project root.
set -euo pipefail
REGION=us-east-1; REPO=kubelab
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"; IMAGE="$REGISTRY/$REPO:latest"

aws ecr describe-repositories --repository-names $REPO --region $REGION >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name $REPO --region $REGION
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$REGISTRY"
docker build -t $REPO:latest ./app
docker tag $REPO:latest "$IMAGE" && docker push "$IMAGE"

# metrics-server is required for HPA and `kubectl top`
kubectl get deploy metrics-server -n kube-system >/dev/null 2>&1 || \
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

for f in k8s/*.yaml k8s/extras/*.yaml; do
  sed "s|ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/kubelab:latest|$IMAGE|" "$f" | kubectl apply -f -
done
kubectl -n kubelab rollout status deployment/kubelab
kubectl -n kubelab get all
echo "Open the EXTERNAL-IP of service/kubelab in your browser (2-3 min for DNS)."
