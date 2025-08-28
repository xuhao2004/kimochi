import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * IP定位API - 作为GPS定位的降级方案
 * 使用第三方IP定位服务获取大概位置
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效令牌' }, { status: 401 });
    }

    // 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

    // 如果是本地IP，返回默认位置（北京）
    if (clientIp === '127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.')) {
      return NextResponse.json({
        lat: 39.9042,
        lon: 116.4074,
        city: '北京市',
        country: '中国',
        source: 'default'
      });
    }

    try {
      // 尝试使用免费的IP定位服务
      const ipApiUrl = `http://ip-api.com/json/${clientIp}?lang=zh-CN&fields=status,message,country,city,lat,lon`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(ipApiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'kimochi-weather-service'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`IP定位服务响应错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.lat && data.lon) {
        return NextResponse.json({
          lat: data.lat,
          lon: data.lon,
          city: data.city || '未知城市',
          country: data.country || '未知国家',
          source: 'ip-api'
        });
      } else {
        throw new Error(`IP定位失败: ${data.message || '未知错误'}`);
      }
    } catch (ipApiError) {
      console.log('ip-api.com服务失败，尝试备用服务:', ipApiError);
      
      // 备用方案：使用ipinfo.io
      try {
        const ipinfoUrl = `https://ipinfo.io/${clientIp}/json`;
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
        
        const response = await fetch(ipinfoUrl, {
          signal: controller2.signal,
          headers: {
            'User-Agent': 'kimochi-weather-service'
          }
        });
        
        clearTimeout(timeoutId2);

        if (!response.ok) {
          throw new Error(`备用IP定位服务响应错误: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.loc) {
          const [lat, lon] = data.loc.split(',').map(Number);
          if (lat && lon) {
            return NextResponse.json({
              lat,
              lon,
              city: data.city || '未知城市',
              country: data.country || '未知国家',
              source: 'ipinfo'
            });
          }
        }
        
        throw new Error('备用IP定位数据无效');
      } catch (backupError) {
        console.log('备用IP定位服务也失败:', backupError);
        
        // 最后的降级方案：返回默认位置
        return NextResponse.json({
          lat: 39.9042,
          lon: 116.4074,
          city: '北京市',
          country: '中国',
          source: 'fallback'
        });
      }
    }
  } catch (error) {
    console.error('IP定位API错误:', error);
    
    // 发生任何错误都返回默认位置
    return NextResponse.json({
      lat: 39.9042,
      lon: 116.4074,
      city: '北京市',
      country: '中国',
      source: 'error-fallback'
    });
  }
}
