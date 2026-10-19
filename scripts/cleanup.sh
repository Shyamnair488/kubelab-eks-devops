#!/usr/bin/env bash
# Free tier: delete everything. The Service must go first so AWS removes the load balancer.
kubectl delete -f k8s/04-service.yaml --ignore-not-found
kubectl delete namespace kubelab --ignore-not-found
eksctl delete cluster --name mycluster --region us-east-1
aws ecr delete-repository --repository-name kubelab --region us-east-1 --force
