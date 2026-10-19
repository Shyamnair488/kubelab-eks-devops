const request = require('supertest');
const app = require('../src/app');

describe('health and info', () => {
  test('GET /health', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200); expect(r.body.status).toBe('ok');
  });
  test('GET /api/info has pod metadata', async () => {
    const r = await request(app).get('/api/info');
    expect(r.body).toMatchObject({ app: 'KubeLab', secretLoaded: false });
    ['pod', 'node', 'namespace', 'podIp', 'message'].forEach(k => expect(r.body).toHaveProperty(k));
  });
  test('secret value is never returned', async () => {
    process.env.API_SECRET = 'super-secret-value';
    const r = await request(app).get('/api/info');
    expect(r.body.secretLoaded).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain('super-secret-value');
    delete process.env.API_SECRET;
  });
});

describe('tasks API', () => {
  test('create, toggle, delete', async () => {
    const c = await request(app).post('/api/tasks').send({ title: 'x' });
    expect(c.status).toBe(201);
    expect((await request(app).patch(`/api/tasks/${c.body.id}/toggle`)).body.done).toBe(true);
    expect((await request(app).delete(`/api/tasks/${c.body.id}`)).status).toBe(204);
  });
  test('validation and 404', async () => {
    expect((await request(app).post('/api/tasks').send({ title: ' ' })).status).toBe(400);
    expect((await request(app).patch('/api/tasks/999/toggle')).status).toBe(404);
    expect((await request(app).delete('/api/tasks/999')).status).toBe(404);
  });
});

describe('kubernetes demo endpoints', () => {
  test('load endpoint runs and caps input', async () => {
    const r = await request(app).get('/api/load?seconds=0.0001');
    expect(r.status).toBe(200); expect(r.body.burnedSeconds).toBe(1);   // minimum is clamped to 1s
  }, 10000);
  test('crash calls exit (mocked)', async () => {
    app.locals.exit = jest.fn();
    const r = await request(app).post('/api/crash');
    expect(r.body.crashing).toBe(true);
    await new Promise(res => setTimeout(res, 400));
    expect(app.locals.exit).toHaveBeenCalled();
  });
  test('serves UI', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(200); expect(r.text).toContain('KubeLab');
  });
});
