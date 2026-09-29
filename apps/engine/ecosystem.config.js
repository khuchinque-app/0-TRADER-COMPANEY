module.exports = {
  apps: [{
    name: 'engine',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      // pm2's env block OVERRIDES the shell — resolve deploy values dynamically
      // so ENGINE_HOST=0.0.0.0 ENGINE_PORT=22220 pm2 start honors the deploy.
      ENGINE_PORT: Number(process.env.ENGINE_PORT || 3001),
      ENGINE_HOST: process.env.ENGINE_HOST || '127.0.0.1'
    },
    error_file: './logs/engine-error.log',
    out_file: './logs/engine-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
