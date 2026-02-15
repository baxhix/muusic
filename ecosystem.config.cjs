module.exports = {
  apps: [
    {
      name: 'muusic2',
      script: 'server/index.js',
      cwd: '/var/www/muusic2.0',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
