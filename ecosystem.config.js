/**
 * PM2生态系统配置文件
 * 用于管理kimochi心晴应用的进程配置
 * 
 * 使用方法：
 * - 开发环境：pm2 start ecosystem.config.js --env development
 * - 生产环境：pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      // 应用基本配置
      name: 'kimochi',
      script: 'npm',
      args: 'start',
      cwd: '/opt/kimochi',
      
      // 进程管理配置（针对2核2G服务器优化）
      instances: 1,
      exec_mode: 'fork',
      
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '400M', // 降低内存限制
      
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 环境变量配置
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'file:./prisma/dev.db'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./prisma/production.db'
      },
      
      // 进程监控配置
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 2000
    }
  ],
  
  // 部署配置
  deploy: {
    // 生产环境部署配置
    production: {
      user: 'root',
      host: '47.104.8.84',
      ref: 'origin/prod',
      repo: 'https://github.com/xuhao2004/kimochi.git',
      path: '/opt/kimochi',
      'post-deploy': 'npm ci --registry https://registry.npmmirror.com --only=production && npx prisma generate && npm run build && npx prisma db push && pm2 reload ecosystem.config.js --env production'
    }
  }
};
