import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 健康检查API端点
 * 用于部署脚本和监控系统检查服务状态
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // 检查数据库连接
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }
    
    // 检查内存使用情况
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    // 检查系统负载
    const uptime = process.uptime();
    const totalLatency = Date.now() - startTime;
    
    // 确定整体健康状态
    const isHealthy = dbStatus === 'healthy' && 
                     memUsageMB.heapUsed < 800 && // 堆内存使用小于800MB
                     totalLatency < 1000; // 响应时间小于1秒
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      checks: {
        database: {
          status: dbStatus,
          latency: dbLatency
        },
        memory: {
          status: memUsageMB.heapUsed < 800 ? 'healthy' : 'warning',
          usage: memUsageMB
        },
        response: {
          status: totalLatency < 1000 ? 'healthy' : 'slow',
          latency: totalLatency
        }
      }
    };
    
    // 根据健康状态返回相应的HTTP状态码
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checks: {
        database: { status: 'unknown' },
        memory: { status: 'unknown' },
        response: { status: 'error' }
      }
    }, { status: 503 });
  }
}
