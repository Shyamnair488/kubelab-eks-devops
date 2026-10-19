#!/usr/bin/env bash
set -euo pipefail
eksctl create cluster --name mycluster --region us-east-1 --node-type t3.small \
  --nodes 2 --nodes-min 2 --nodes-max 2 --with-oidc --managed
kubectl get nodes -o wide
