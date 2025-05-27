module.exports = {
  apps: [
    {
      name: 'beach-booking-backend',
      script: './backend/src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      log_file: './logs/backend.log',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'beach-booking-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      log_file: './logs/frontend.log',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}