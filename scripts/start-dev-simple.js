#!/usr/bin/env node

// 简单的开发服务器启动脚本
// 用于测试和开发

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动简单开发服务器...');

// 设置环境变量
process.env.NODE_ENV = 'development';
process.env.PORT = '3001';

// 启动Next.js开发服务器
const nextPath = path.join(__dirname, '../node_modules/.bin/next');
const args = ['dev', '-H', '127.0.0.1', '-p', '3001'];

console.log('📦 启动命令:', nextPath, args.join(' '));

const child = spawn(nextPath, args, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  shell: process.platform === 'win32'
});

child.on('error', (error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`🔴 服务器进程退出，代码: ${code}`);
  process.exit(code);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('🛑 正在停止服务器...');
  child.kill();
});

process.on('SIGTERM', () => {
  console.log('🛑 正在停止服务器...');
  child.kill();
});
