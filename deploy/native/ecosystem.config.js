module.exports = {
  apps: [
    {
      name: 'backend-api',
      script: 'dist/src/main.js',
      cwd: '/opt/backend',
      instances: 'max',
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      
      // Logging
      log_file: '/opt/backend/logs/pm2.log',
      out_file: '/opt/backend/logs/pm2-out.log',
      error_file: '/opt/backend/logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Performance
      node_args: [
        '--max-old-space-size=2048'
      ],
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Clustering
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
    }
  ],
  
  deploy: {
    production: {
      user: 'backend',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/backend-api.git',
      path: '/opt/backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
