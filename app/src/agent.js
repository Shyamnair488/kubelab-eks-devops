const tick = () => console.log(`[node-agent] node=${process.env.NODE_NAME} pod=${process.env.POD_NAME} time=${new Date().toISOString()}`);
tick(); setInterval(tick, 30000);
