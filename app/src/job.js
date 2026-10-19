const steps = ['collecting data', 'building report', 'uploading report'];
steps.forEach((s, i) => setTimeout(() => console.log(`[job] ${process.env.POD_NAME}: ${s}`), i * 1000));
setTimeout(() => { console.log('[job] done'); process.exit(0); }, steps.length * 1000);
