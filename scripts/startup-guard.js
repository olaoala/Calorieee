const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

const PORT = 3000;
const projectRoot = path.resolve(__dirname, '..');
const nextDir = path.join(projectRoot, '.next');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        resolve(true);
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(false));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  const portInUse = await isPortInUse(PORT);

  if (portInUse) {
    console.error('');
    console.error('Startup blocked: port 3000 is already in use.');
    console.error('A stale Next.js process or old build can leave the app in a broken state.');
    console.error('');
    console.error('Fix it with:');
    console.error('  Stop-Process -Id <PID> -Force');
    console.error('  Remove-Item .next -Recurse -Force');
    console.error('  npm run dev');
    console.error('');
    process.exit(1);
  }

  const runtimePath = path.join(nextDir, 'server', 'webpack-runtime.js');
  if (fs.existsSync(nextDir) && !fs.existsSync(runtimePath)) {
    console.error('');
    console.error('Startup blocked: a stale .next build was detected.');
    console.error('Remove the build output before starting the app.');
    console.error('');
    console.error('Run:');
    console.error('  Remove-Item .next -Recurse -Force');
    console.error('  npm run dev');
    console.error('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Startup guard failed:');
  console.error(error);
  process.exit(1);
});
