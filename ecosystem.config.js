// ecosystem.config.js — PM2 processes (structure.md: Whitelabel Platform)
// Ports: whitelabel-backend :11112 | exchange (Admin Login Portal + mirror) :22221
module.exports = {
  apps: [
    {
      name: 'whitelabel-backend',
      script: 'server.mjs',
      cwd: '/home/khuchinque/0-TRADER-COMPANEY/apps/whitelabel-backend',
      env: { NODE_ENV: 'production', PORT_WHITELABEL: 11112 },
    },
    {
      name: 'exchange',
      script: 'server.mjs',
      cwd: '/home/khuchinque/0-TRADER-COMPANEY/apps/exchange',
      env: {
        NODE_ENV: 'production',
        PORT_EXCHANGE: 22221,
        API_INTERNAL_URL: 'http://localhost:11110',
        WHITELABEL_URL: 'http://localhost:11112',
      },
    },
  ],
};
