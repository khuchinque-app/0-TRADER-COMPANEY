#!/usr/bin/env node
// Quick copy script for node_modules
const fs = require('fs');
const path = require('path');

const src = 'node_modules';
const dst = 'apps/engine/node_modules';

// Create dst if not exists
if (!fs.existsSync(dst)) {
  fs.mkdirSync(dst, { recursive: true });
}

// Copy key packages
const packages = ['express', 'ws', 'debug', 'ms'];
packages.forEach(pkg => {
  const srcPath = path.join(src, pkg);
  const dstPath = path.join(dst, pkg);
  if (fs.existsSync(srcPath)) {
    if (fs.existsSync(dstPath)) {
      fs.rmSync(dstPath, { recursive: true });
    }
    fs.cpSync(srcPath, dstPath, { recursive: true });
    console.log(`Copied ${pkg}`);
  } else {
    console.log(`Skipped ${pkg} (not found)`);
  }
});

console.log('Done');
