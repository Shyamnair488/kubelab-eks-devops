const app = require('./app');
const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`KubeLab listening on ${port}`));
process.on('SIGTERM', () => { console.log('SIGTERM received, shutting down'); server.close(() => process.exit(0)); });
