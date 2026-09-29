module.exports = {
  apps: [
    {
      name: 'tawes-admin',
      script: 'src/server.js',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '--env-file-if-exists=.env',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      error_log: '/tmp/tawes-admin-error.log',
      out_log: '/tmp/tawes-admin-out.log',
    },
  ],
};
