// PM2 Ecosystem Config — production process manager
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: "renew-server",
      cwd: "./apps/server",
      script: "node",
      args: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        TZ: "Asia/Kolkata",
      },
      error_file: "../../logs/server-error.log",
      out_file: "../../logs/server-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
    {
      name: "renew-operator",
      cwd: "./apps/operator",
      script: "node_modules/.bin/next",
      args: "start --port 3000",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "../../logs/operator-error.log",
      out_file: "../../logs/operator-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
    {
      name: "renew-admin",
      cwd: "./apps/admin",
      script: "node_modules/.bin/next",
      args: "start --port 3001",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "../../logs/admin-error.log",
      out_file: "../../logs/admin-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
  ],
};
