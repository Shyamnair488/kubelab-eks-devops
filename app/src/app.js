const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const startedAt = Date.now();
let hits = 0, nextId = 5;
let tasks = [
  { id: 1, title: 'Create the EKS cluster with eksctl', done: false },
  { id: 2, title: 'Push the image to ECR', done: false },
  { id: 3, title: 'Delete a pod and watch the ReplicaSet heal it', done: false },
  { id: 4, title: 'Find the DaemonSet pod on every node', done: false },
];
app.locals.exit = () => process.exit(1);   // overridable so tests do not kill Jest

app.use(express.json());
app.use((req, res, next) => { if (req.path.startsWith('/api')) hits++; next(); });
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Values come from the Downward API (pod metadata), ConfigMap and Secret on Kubernetes.
app.get('/api/info', (req, res) => {
  const secret = process.env.API_SECRET;
  res.json({
    app: 'KubeLab',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.APP_ENV || 'local',
    message: process.env.WELCOME_MESSAGE || 'Hello from outside Kubernetes',
    pod: process.env.POD_NAME || os.hostname(),
    namespace: process.env.POD_NAMESPACE || 'n/a',
    node: process.env.NODE_NAME || 'n/a',
    podIp: process.env.POD_IP || 'n/a',
    secretLoaded: Boolean(secret),                 // never expose the secret itself
    secretLength: secret ? secret.length : 0,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    apiRequests: hits,
    time: new Date().toISOString(),
  });
});

// Burns CPU so you can trigger the HorizontalPodAutoscaler (max 60s).
app.get('/api/load', (req, res) => {
  const seconds = Math.min(Math.max(Number(req.query.seconds) || 10, 1), 60);
  const end = Date.now() + seconds * 1000;
  let x = 0; while (Date.now() < end) x += Math.sqrt(Math.random());
  res.json({ burnedSeconds: seconds, pod: process.env.POD_NAME || os.hostname() });
});

// Kills this process so you can watch Kubernetes restart it (self-healing demo).
app.post('/api/crash', (req, res) => {
  res.json({ crashing: true, pod: process.env.POD_NAME || os.hostname() });
  setTimeout(() => app.locals.exit(), 200);
});

app.get('/api/tasks', (req, res) => res.json(tasks));
app.post('/api/tasks', (req, res) => {
  const title = req.body && typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 120) return res.status(400).json({ error: 'title is required (max 120 chars)' });
  const task = { id: nextId++, title, done: false };
  tasks.push(task); res.status(201).json(task);
});
app.patch('/api/tasks/:id/toggle', (req, res) => {
  const t = tasks.find(x => x.id === Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'not found' });
  t.done = !t.done; res.json(t);
});
app.delete('/api/tasks/:id', (req, res) => {
  const n = tasks.length; tasks = tasks.filter(x => x.id !== Number(req.params.id));
  if (tasks.length === n) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

module.exports = app;
