#!/usr/bin/env node
/**
 * Trading Company - Process Manager
 * 
 * Automates starting/stopping the trading venue servers.
 * Usage:
 *   node manage.js start    - Start both servers
 *   node manage.js stop     - Stop both servers
 *   node manage.js status   - Check status
 *   node manage.js logs     - Show recent logs
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const CONFIG = {
  projectDir: 'C:/Users/etern/OneDrive/Documents/2.PROJECT- TRADING-COMPANEY',
  enginePort: 3001,
  terminalPort: 3000,
  engineScript: 'apps/engine/src/index.ts',
  terminalDir: 'apps/terminal',
  logFile: 'server.log'
};

let engineProcess = null;
let terminalProcess = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { 
      cwd: CONFIG.projectDir,
      stdio: 'pipe',
      timeout: opts.timeout || 30000,
      encoding: 'utf8'
    });
  } catch (e) {
    return e.stdout || e.message;
  }
}

function killPort(port) {
  try {
    const result = execSync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { encoding: 'utf8' }
    );
    const pids = result.split('\n')
      .filter(Boolean)
      .map(line => line.trim().split(/\s+/).pop())
      .filter(Boolean);
    
    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
        log(`Killed PID ${pid} on port ${port}`);
      } catch (e) {}
    });
  } catch (e) {}
}

function waitForPort(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: 'utf8' }
      );
      if (result.includes(`${port}`)) return true;
    } catch (e) {}
    sleep(500);
  }
  return false;
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function installDeps() {
  log('Checking dependencies...');
  
  const enginePkgs = path.join(CONFIG.projectDir, 'apps/engine/node_modules');
  const terminalPkgs = path.join(CONFIG.projectDir, 'apps/terminal/node_modules');
  
  if (!require('fs').existsSync(path.join(enginePkgs, 'express'))) {
    log('Installing engine dependencies...');
    exec('npm install --prefer-offline --no-audit --no-fund', { 
      cwd: path.join(CONFIG.projectDir, 'apps/engine'),
      timeout: 300000 
    });
    log('Engine dependencies installed');
  }
  
  if (!require('fs').existsSync(path.join(terminalPkgs, 'next'))) {
    log('Installing terminal dependencies...');
    exec('npm install --prefer-offline --no-audit --no-fund', { 
      cwd: path.join(CONFIG.projectDir, 'apps/terminal'),
      timeout: 300000 
    });
    log('Terminal dependencies installed');
  }
}

function startEngine() {
  log('Starting engine on port ' + CONFIG.enginePort + '...');
  killPort(CONFIG.enginePort);
  
  const cwd = path.join(CONFIG.projectDir, 'apps/engine');
  engineProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd,
    stdio: 'ignore',
    detached: true
  });
  
  engineProcess.unref();
  log(`Engine PID: ${engineProcess.pid}`);
  
  if (waitForPort(CONFIG.enginePort)) {
    log('[OK] Engine started successfully');
    return true;
  } else {
    log('[FAIL] Engine failed to start');
    return false;
  }
}

function startTerminal() {
  log('Starting terminal on port ' + CONFIG.terminalPort + '...');
  killPort(CONFIG.terminalPort);
  
  const cwd = path.join(CONFIG.projectDir, CONFIG.terminalDir);
  terminalProcess = spawn('npx', ['next', 'dev', '-p', String(CONFIG.terminalPort)], {
    cwd,
    stdio: 'ignore',
    detached: true
  });
  
  terminalProcess.unref();
  log(`Terminal PID: ${terminalProcess.pid}`);
  
  if (waitForPort(CONFIG.terminalPort, 15000)) {
    log('[OK] Terminal started successfully');
    return true;
  } else {
    log('[WARN] Terminal may still be starting (Next.js build takes time)');
    return true; // Don't fail - Next.js can be slow
  }
}

function stopAll() {
  log('Stopping all servers...');
  
  if (engineProcess) {
    try { engineProcess.kill('SIGTERM'); } catch (e) {}
    engineProcess = null;
  }
  if (terminalProcess) {
    try { terminalProcess.kill('SIGTERM'); } catch (e) {}
    terminalProcess = null;
  }
  
  killPort(CONFIG.enginePort);
  killPort(CONFIG.terminalPort);
  log('All servers stopped');
}

function getStatus() {
  const engineOk = waitForPort(CONFIG.enginePort, 2000);
  const terminalOk = waitForPort(CONFIG.terminalPort, 2000);
  
  console.log('\n=== Trading Company Status ===');
  console.log(`Engine (port ${CONFIG.enginePort}): ${engineOk ? 'RUNNING' : 'STOPPED'}`);
  console.log(`Terminal (port ${CONFIG.terminalPort}): ${terminalOk ? 'RUNNING' : 'STOPPED'}`);
  console.log('');
  
  if (engineOk) {
    console.log('API Endpoints:');
    console.log('  http://localhost:' + CONFIG.enginePort + '/api/market/BTCUSDT');
    console.log('  http://localhost:' + CONFIG.enginePort + '/api/ledger/guest1');
    console.log('  http://localhost:' + CONFIG.enginePort + '/api/fx');
    console.log('  http://localhost:' + CONFIG.enginePort + '/health');
  }
  console.log('');
  
  if (terminalOk) {
    console.log(`UI: http://localhost:${CONFIG.terminalPort}`);
  }
  console.log('');
  console.log('Log file: ' + path.join(CONFIG.projectDir, CONFIG.logFile));
  console.log('=============================\n');
}

// Main
const command = process.argv[2] || 'status';

switch (command) {
  case 'start':
    installDeps();
    startEngine();
    startTerminal();
    setTimeout(() => getStatus(), 2000);
    break;
    
  case 'stop':
    stopAll();
    break;
    
  case 'status':
    getStatus();
    break;
    
  case 'logs':
    const fs = require('fs');
    const logPath = path.join(CONFIG.projectDir, CONFIG.logFile);
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      console.log(content.slice(-2000));
    } catch (e) {
      console.log('No log file found');
    }
    break;
    
  default:
    console.log('Usage: node manage.js [start|stop|status|logs]');
}
