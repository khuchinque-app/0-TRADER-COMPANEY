#!/usr/bin/env node
/**
 * host-online.js
 * Sets up an SSH server and tunnels the trading app online.
 *
 * This script:
 * 1. Starts the SSH server with password "admin1"
 * 2. Starts the trading app (engine + terminal)
 * 3. Optionally creates tunnels to expose the services online
 *
 * Usage: node host-online.js [--no-tunnel]
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = __dirname;
const USE_TUNNEL = !process.argv.includes('--no-tunnel');

// Configuration
const SSH_PORT = 2222;
const ENGINE_PORT = 3001;
const TERMINAL_PORT = 3000;
const SSH_PASSWORD = 'admin1';
const SSH_USERNAME = 'admin';

console.log('=== Trading Company Online Host ===');
console.log(`Project Root: ${PROJECT_ROOT}`);
console.log(`SSH Port: ${SSH_PORT}`);
console.log(`Engine Port: ${ENGINE_PORT}`);
console.log(`Terminal Port: ${TERMINAL_PORT}`);
console.log('');

// Step 1: Check if dependencies are installed
console.log('[1/4] Checking dependencies...');
try {
  execSync('ls node_modules/.package-lock.json', { cwd: PROJECT_ROOT, stdio: 'ignore' });
  console.log('  [OK] Dependencies already installed');
} catch (e) {
  console.log('  Installing dependencies...');
  execSync('npm install', { cwd: PROJECT_ROOT, stdio: 'inherit' });
}

// Step 2: Build shared package
console.log('[2/4] Building shared package...');
try {
  execSync('npm run build', { cwd: path.join(PROJECT_ROOT, 'packages/shared'), stdio: 'inherit' });
  console.log('  [OK] Shared package built');
} catch (e) {
  console.error('  [FAIL] Shared package build failed');
  process.exit(1);
}

// Step 3: Start the app services
console.log('[3/4] Starting trading app services...');

// Start engine
const engineProc = spawn('npm', ['run', 'dev:engine'], {
  cwd: PROJECT_ROOT,
  stdio: ['ignore', 'pipe', 'pipe']
});

engineProc.stdout.on('data', (data) => {
  process.stdout.write(`[engine] ${data}`);
});
engineProc.stderr.on('data', (data) => {
  process.stderr.write(`[engine] ${data}`);
});

// Start terminal (after a brief delay to let engine start)
setTimeout(() => {
  const terminalProc = spawn('npm', ['run', 'dev:terminal'], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  terminalProc.stdout.on('data', (data) => {
    process.stdout.write(`[terminal] ${data}`);
  });
  terminalProc.stderr.on('data', (data) => {
    process.stderr.write(`[terminal] ${data}`);
  });

  // Step 4: Set up SSH server and tunnels
  console.log('[4/4] Setting up SSH server and tunnels...');

  // Install and configure SSH server
  setupSSHServer();

  // Set up tunnels if requested
  if (USE_TUNNEL) {
    setupTunnels();
  }

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    engineProc.kill();
    terminalProc.kill();
    process.exit(0);
  });

}, 2000);

function setupSSHServer() {
  console.log('  Installing SSH server...');
  try {
    execSync('npm install -g @homebridge/ssh2', { stdio: 'ignore' });
  } catch (e) {
    console.log('  [WARN] Could not install SSH server globally');
  }

  // Create SSH server script
  const sshServerScript = `
const { Server } = require('@homebridge/ssh2');
const { exec } = require('child_process');

const server = new Server({
  listen: {
    port: ${SSH_PORT},
    host: '0.0.0.0'
  }
});

server.on('connection', (client) => {
  client.on('authentication', (ctx) => {
    if (ctx.method === 'password' && ctx.username === '${SSH_USERNAME}' && ctx.password === '${SSH_PASSWORD}') {
      ctx.accept();
    } else {
      ctx.reject();
    }
  });

  client.on('session', (accept, reject) => {
    const session = accept();
    session.on('exec', (accept, reject) => {
      const stream = accept();
      stream.stdout.write('Trading Company SSH Access\\n');
      stream.stdin.resume();
      stream.on('close', () => {
        stream.exit(0);
      });
    });
  });
});

server.listen(() => {
  console.log('SSH server listening on port ${SSH_PORT}');
  console.log('Username: ${SSH_USERNAME}');
  console.log('Password: ${SSH_PASSWORD}');
});
`;

  fs.writeFileSync(path.join(PROJECT_ROOT, 'ssh-server.js'), sshServerScript);

  // Start SSH server in background
  const sshProc = spawn('node', [path.join(PROJECT_ROOT, 'ssh-server.js')], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe'
  });

  sshProc.stdout.on('data', (data) => {
    process.stdout.write(`[ssh] ${data}`);
  });
  sshProc.stderr.on('data', (data) => {
    process.stderr.write(`[ssh] ${data}`);
  });

  console.log('  [OK] SSH server starting');
  console.log(`  Connect with: ssh ${SSH_USERNAME}@<your-ip> -p ${SSH_PORT}`);
  console.log(`  Password: ${SSH_PASSWORD}`);
}

function setupTunnels() {
  console.log('  Setting up online tunnels...');

  // Try using localtunnel for web UI
  try {
    const tunnelTerminal = spawn('npx', ['localtunnel', '--port', String(TERMINAL_PORT), '--subdomain', 'trading-terminal'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });

    tunnelTerminal.stdout.on('data', (data) => {
      process.stdout.write(`[tunnel-terminal] ${data}`);
    });

    tunnelTerminal.stderr.on('data', (data) => {
      process.stderr.write(`[tunnel-terminal] ${data}`);
    });

    const tunnelEngine = spawn('npx', ['localtunnel', '--port', String(ENGINE_PORT), '--subdomain', 'trading-engine'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });

    tunnelEngine.stdout.on('data', (data) => {
      process.stdout.write(`[tunnel-engine] ${data}`);
    });

    tunnelEngine.stderr.on('data', (data) => {
      process.stderr.write(`[tunnel-engine] ${data}`);
    });

    console.log('  [OK] Tunnels starting via localtunnel');
  } catch (e) {
    console.log('  [WARN] Could not start tunnels:', e.message);
  }
}
