/**
 * 高德地图API数字签名工具
 * 用于生成API请求的数字签名参数
 */

import crypto from 'crypto';

/**
 * 生成高德地图API数字签名
 * @param params API请求参数对象
 * @param privateKey 私钥（从环境变量获取）
 * @returns 签名字符串
 */
export function generateAmapSignature(params: Record<string, string>, privateKey: string): string {
  // 1. 对参数按key进行字典序排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 按照排序后的顺序拼接参数
  const paramString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // 3. 在拼接后的字符串末尾加上私钥
  const stringToSign = paramString + privateKey;
  
  // 4. 使用MD5算法计算签名
  const signature = crypto.createHash('md5').update(stringToSign).digest('hex');
  
  return signature;
}

/**
 * 为高德API请求添加签名参数
 * @param baseUrl 基础URL
 * @param params 请求参数
 * @returns 包含签名的完整URL
 */
export function buildAmapUrl(baseUrl: string, params: Record<string, string>): string {
  const privateKey = process.env.AMAP_SECRET_KEY;
  
  if (!privateKey) {
    throw new Error('AMAP_SECRET_KEY环境变量未设置');
  }
  
  // 生成签名
  const signature = generateAmapSignature(params, privateKey);
  
  // 添加签名参数
  const allParams = { ...params, sig: signature };
  
  // 构建URL
  const queryString = Object.entries(allParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  return `${baseUrl}?${queryString}`;
}

/**
 * 高德API请求工具（支持数字签名）
 */
export class AmapClient {
  private apiKey: string;
  private privateKey: string;
  
  constructor() {
    this.apiKey = process.env.AMAP_API_KEY || '';
    this.privateKey = process.env.AMAP_SECRET_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('AMAP_API_KEY环境变量未设置');
    }
    
    if (!this.privateKey) {
      throw new Error('AMAP_SECRET_KEY环境变量未设置');
    }
  }
  
  /**
   * 逆地理编码查询
   * @param longitude 经度
   * @param latitude 纬度
   * @param radius 搜索半径
   * @returns Promise<any>
   */
  async reverseGeocode(longitude: number, latitude: number, radius: number = 1000) {
    const params = {
      key: this.apiKey,
      location: `${longitude},${latitude}`,
      radius: radius.toString(),
      extensions: 'all'
    };
    
    const url = buildAmapUrl('https://restapi.amap.com/v3/geocode/regeo', params);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== '1') {
        throw new Error(`高德API错误: ${data.info} (${data.infocode})`);
      }
      
      return data;
    } catch (error) {
      console.error('高德逆地理编码查询失败:', error);
      throw error;
    }
  }
  
  /**
   * 地理编码查询
   * @param address 地址
   * @param city 城市（可选）
   * @returns Promise<any>
   */
  async geocode(address: string, city?: string) {
    const params: Record<string, string> = {
      key: this.apiKey,
      address: address
    };
    
    if (city) {
      params.city = city;
    }
    
    const url = buildAmapUrl('https://restapi.amap.com/v3/geocode/geo', params);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== '1') {
        throw new Error(`高德API错误: ${data.info} (${data.infocode})`);
      }
      
      return data;
    } catch (error) {
      console.error('高德地理编码查询失败:', error);
      throw error;
    }
  }
  
  /**
   * IP定位
   * @param ip IP地址（可选，默认为请求方IP）
   * @returns Promise<any>
   */
  async ipLocation(ip?: string) {
    const params: Record<string, string> = {
      key: this.apiKey
    };
    
    if (ip) {
      params.ip = ip;
    }
    
    const url = buildAmapUrl('https://restapi.amap.com/v3/ip', params);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== '1') {
        throw new Error(`高德API错误: ${data.info} (${data.infocode})`);
      }
      
      return data;
    } catch (error) {
      console.error('高德IP定位查询失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const amapClient = new AmapClient();
