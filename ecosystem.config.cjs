module.exports = {
  apps: [
    {
      name: 'reviewhood-ssr',
      script: 'dist/tunirate/server/server.mjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
