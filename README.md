# KubeLab: learn Docker, ECR, EKS and Kubernetes by doing

A working Node.js app plus every file you need to containerize it, push it to **Amazon ECR**, and run it on **Amazon EKS** with a **ReplicaSet, Deployment, DaemonSet, Service, ConfigMap, Secret, Job, CronJob and HPA**. The web UI shows which pod answers, lets you crash a pod, and burns CPU to trigger autoscaling, so each concept is visible.

## 1. Architecture

![KubeLab architecture](docs/architecture.png)

Editable vector version: `docs/architecture.svg`. Steps 1-8 follow a change from `git push` to a user request.

## 2. Where every file goes

```
kubelab/
├── app/
│   ├── src/app.js, server.js        <- API (health, info, tasks, load, crash)
│   ├── src/agent.js                 <- DaemonSet workload
│   ├── src/job.js                   <- Job / CronJob workload
│   ├── public/index.html            <- UI (Dashboard, Experiments, Learn, Checklist)
│   ├── tests/app.test.js            <- Jest + Supertest
│   ├── Dockerfile                   <- DOCKERFILE (multi-stage: test / runtime)
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml               <- DOCKER COMPOSE (project root): app x3 + nginx + test
├── nginx/nginx.conf                 <- load balancer config for Compose
├── k8s/                             <- KUBERNETES YAML (apply order = file number)
│   ├── 00-namespace.yaml  01-configmap.yaml  02-secret.yaml
│   ├── 03-deployment.yaml 04-service.yaml
│   └── extras/ replicaset.yaml daemonset.yaml job.yaml cronjob.yaml hpa.yaml
├── scripts/ create-cluster.sh  deploy.sh  cleanup.sh
├── .github/workflows/deploy.yml     <- GitHub Actions (path must be exact)
├── docs/architecture.png / .svg    <- architecture diagram
├── docs/screenshots/                <- save your screenshots here (names in the Word report)
├── Makefile                         <- shortcuts: make test / up / cluster / deploy / cleanup
└── README.md
```
Image lines in the YAML say `ACCOUNT_ID.dkr.ecr...`. Leave them: `deploy.sh` and the pipeline replace it with your real account ID.

## 2. Prerequisites
Node 20+, Docker, Git, AWS CLI (`aws configure`), `eksctl`, `kubectl`.

## 3. Module 1: run with npm and test
```bash
cd app && npm install && npm test && npm start     # http://localhost:3000
```
Learn: 8 tests cover health, pod metadata, secret never leaking, CRUD, validation, crash and load endpoints.

## 4. Module 2: Docker and Compose
```bash
docker build -t kubelab:local ./app && docker run -p 3000:3000 kubelab:local
docker compose up --build --scale app=3         # http://localhost:8080 (nginx -> 3 containers)
docker compose ps && docker compose logs -f app
docker compose --profile test run --rm test     # tests inside a container
docker compose down
```
Learn: images vs containers, multi-stage builds, health checks, a reverse proxy balancing 3 replicas. In the UI open **Experiments > Send 20 requests**: bars show the 3 containers.

## 5. Module 3: create the EKS cluster (free-tier sizing)
```bash
eksctl create cluster --name mycluster --region us-east-1 --node-type t3.small \
  --nodes 2 --nodes-min 2 --nodes-max 2 --with-oidc --managed
kubectl get nodes -o wide        # 2 Ready (15-20 min)
```

## 6. Module 4: ECR + deploy everything
```bash
./scripts/deploy.sh
kubectl -n kubelab get all
kubectl -n kubelab get svc kubelab     # open EXTERNAL-IP in the browser
```

## 7. Module 5: Kubernetes experiments (the learning part)
**Pods and Deployment**
```bash
kubectl -n kubelab get pods -o wide
kubectl -n kubelab describe deploy kubelab
kubectl -n kubelab scale deploy kubelab --replicas=3        # (HPA may override; see module 9)
```
**ReplicaSet self-healing** (break it on purpose)
```bash
kubectl -n kubelab get rs
kubectl -n kubelab delete pod <a kubelab-rs pod>            # a new one appears within seconds
kubectl -n kubelab scale rs kubelab-rs --replicas=4
```
**DaemonSet** (one pod per node)
```bash
kubectl -n kubelab get ds
kubectl -n kubelab get pods -l app=kubelab-agent -o wide    # 2 pods on 2 different nodes
kubectl -n kubelab logs ds/kubelab-agent
```
**Rolling update and rollback**
```bash
kubectl -n kubelab set env deploy/kubelab APP_VERSION=2.1.0
kubectl -n kubelab rollout status deploy/kubelab
kubectl -n kubelab rollout history deploy/kubelab
kubectl -n kubelab rollout undo deploy/kubelab
```
**ConfigMap and Secret**
```bash
kubectl -n kubelab edit configmap kubelab-config            # change WELCOME_MESSAGE
kubectl -n kubelab rollout restart deploy/kubelab           # env vars load on pod start
kubectl -n kubelab get secret kubelab-secret -o yaml        # base64 is encoding, NOT encryption
```
**Self-healing by crashing** : UI > Experiments > *Crash the pod*, then `kubectl -n kubelab get pods` (RESTARTS increases).
**Load balancing** : UI > Experiments > *Send 20 requests*: different pods answer.
**Job and CronJob**
```bash
kubectl -n kubelab get jobs,cronjobs
kubectl -n kubelab logs job/kubelab-job
```
**HPA (autoscaling)**: run `kubectl -n kubelab get hpa -w` in one terminal; in the UI click *Burn CPU*. Replicas rise toward 4, then fall after a few minutes. Check `kubectl top pods -n kubelab`.
**Troubleshooting toolkit**: `describe`, `logs`, `logs --previous`, `get events --sort-by=.lastTimestamp`, `exec -it <pod> -- sh`, `port-forward svc/kubelab 8081:80`.

## 8. Module 6: GitHub Actions CI/CD
1. `git init && git add . && git commit -m "init"`, create a GitHub repo, `git remote add origin <url>`, `git push -u origin main`.
2. Settings > Secrets and variables > Actions: add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
3. If the deploy job says `Unauthorized`: `eksctl create iamidentitymapping --cluster mycluster --region us-east-1 --arn <your-iam-user-arn> --group system:masters --username ci`.
4. Change something in `app/`, push, watch Actions: test, build, push to ECR, rolling update.

## 9. Clean up (do not skip)
```bash
./scripts/cleanup.sh
```
Check the AWS console: no EKS cluster, EC2 nodes, load balancer, or CloudFormation stacks left. EKS is not free-tier.

## 10. Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `ImagePullBackOff` | ECR image missing: re-run `deploy.sh`; `kubectl -n kubelab describe pod <pod>` |
| `Pending` pods, "Too many pods" | t3.small allows ~11 pods per node; delete the ReplicaSet (`kubectl -n kubelab delete rs kubelab-rs`) or lower replicas |
| EXTERNAL-IP `<pending>` | wait 2-3 min; `describe svc kubelab` |
| HPA shows `<unknown>` | metrics-server not ready: `kubectl get deploy metrics-server -n kube-system` |
| Compose: nginx 502 after scaling | `docker compose restart nginx` (it caches container IPs) |

## 11. Report
Open `KubeLab-Project-Report.docx`; each box says which screenshot to paste and the file name to save in `docs/screenshots/`.

## 12. Ideas to go further
Ingress + AWS Load Balancer Controller, HTTPS with ACM, StatefulSet with EBS, Helm, Terraform, Prometheus and Grafana.
