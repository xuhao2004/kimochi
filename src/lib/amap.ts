'use client';

// 通过服务端代理访问高德开放平台，避免在前端暴露密钥
const AMAP_API_PROXY_BASE = '/api/amap';

interface AmapLocation {
  lng: number;
  lat: number;
}

interface AmapPoi {
  id: string;
  name: string;
  address: string;
  location: string; // "lng,lat"
  distance?: string;
  type?: string;
}

interface AmapGeocodeResult {
  formatted_address: string;
  province: string;
  city: string;
  district: string;
  street: string;
  number: string;
  location: string; // "lng,lat"
}

// 通用代理请求函数（调用服务端 API）
async function amapProxyRequest<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<{ status: string; data: T; info?: string }> {
  try {
    const searchParams = new URLSearchParams(params);
    const url = `${AMAP_API_PROXY_BASE}${endpoint}?${searchParams.toString()}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('高德地图代理请求失败:', error);
    return { status: 'error', data: {} as T, info: '网络请求失败' };
  }
}

// 获取当前位置（IP定位）
export async function getCurrentLocation(): Promise<{
  success: boolean;
  data?: AmapLocation & { address: string };
  error?: string;
}> {
  try {
    const result = await amapProxyRequest<{
      province: string;
      city: string;
      adcode: string;
      rectangle: string;
    }>('/ip', {});

    if (result.status === 'success' && result.data.rectangle) {
      // 解析rectangle中心点作为位置
      const rect = result.data.rectangle.split(';');
      if (rect.length === 2) {
        const [leftBottom, rightTop] = rect;
        const [lng1, lat1] = leftBottom.split(',').map(Number);
        const [lng2, lat2] = rightTop.split(',').map(Number);
        
        const centerLng = (lng1 + lng2) / 2;
        const centerLat = (lat1 + lat2) / 2;
        
        return {
          success: true,
          data: {
            lng: centerLng,
            lat: centerLat,
            address: `${result.data.province}${result.data.city}`
          }
        };
      }
    }

    return {
      success: false,
      error: result.info || '定位失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '定位服务异常'
    };
  }
}

// 地理编码（地址转坐标）
export async function geocodeAddress(address: string): Promise<{
  success: boolean;
  data?: AmapGeocodeResult[];
  error?: string;
}> {
  try {
    const result = await amapProxyRequest<{
      geocodes: AmapGeocodeResult[];
    }>('/geocode', { address });

    if (result.status === 'success' && result.data.geocodes) {
      return {
        success: true,
        data: result.data.geocodes
      };
    }

    return {
      success: false,
      error: result.info || '地址解析失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '地址解析服务异常'
    };
  }
}

// 逆地理编码（坐标转地址）
export async function reverseGeocode(lng: number, lat: number): Promise<{
  success: boolean;
  data?: AmapGeocodeResult;
  error?: string;
}> {
  try {
    const result = await amapProxyRequest<{
      regeocode: {
        formatted_address: string;
        addressComponent: {
          province: string;
          city: string;
          district: string;
          street: string;
          number: string;
        };
      };
    }>('/regeo', { lng: String(lng), lat: String(lat) });

    if (result.status === 'success' && result.data.regeocode) {
      const { regeocode } = result.data;
      return {
        success: true,
        data: {
          formatted_address: regeocode.formatted_address,
          province: regeocode.addressComponent.province,
          city: regeocode.addressComponent.city,
          district: regeocode.addressComponent.district,
          street: regeocode.addressComponent.street,
          number: regeocode.addressComponent.number,
          location: `${lng},${lat}`
        }
      };
    }

    return {
      success: false,
      error: result.info || '位置解析失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '位置解析服务异常'
    };
  }
}

// POI搜索
export async function searchPoi(
  keywords: string,
  location?: AmapLocation,
  radius = 3000
): Promise<{
  success: boolean;
  data?: AmapPoi[];
  error?: string;
}> {
  try {
    const params: Record<string, string> = {
      keywords,
      offset: '20',
      page: '1',
      extensions: 'all'
    };

    if (location) {
      params.location = `${location.lng},${location.lat}`;
      params.radius = radius.toString();
      params.sortrule = 'distance';
    }

    const result = await amapProxyRequest<{
      pois: AmapPoi[];
    }>('/place_text', params);

    if (result.status === 'success' && result.data.pois) {
      return {
        success: true,
        data: result.data.pois
      };
    }

    return {
      success: false,
      error: result.info || '搜索失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '搜索服务异常'
    };
  }
}

// 周边搜索
export async function searchNearby(
  location: AmapLocation,
  types: string = '',
  radius = 1000
): Promise<{
  success: boolean;
  data?: AmapPoi[];
  error?: string;
}> {
  try {
    const result = await amapProxyRequest<{
      pois: AmapPoi[];
    }>('/place_text', {
      location: `${location.lng},${location.lat}`,
      radius: radius.toString(),
      types,
      sortrule: 'distance'
    });

    if (result.status === 'success' && result.data.pois) {
      return {
        success: true,
        data: result.data.pois
      };
    }

    return {
      success: false,
      error: result.info || '周边搜索失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '周边搜索服务异常'
    };
  }
}

// 输入提示
export async function inputTips(
  keywords: string,
  location?: AmapLocation
): Promise<{
  success: boolean;
  data?: Array<{
    name: string;
    district: string;
    adcode: string;
    location: string;
    address: string;
    id: string;
  }>;
  error?: string;
}> {
  try {
    const params: Record<string, string> = { keywords };

    if (location) {
      params.location = `${location.lng},${location.lat}`;
    }

    const result = await amapProxyRequest<{
      tips: Array<{
        name: string;
        district: string;
        adcode: string;
        location: string;
        address: string;
        id: string;
      }>;
    }>('/tips', params);

    if (result.status === 'success' && result.data.tips) {
      return {
        success: true,
        data: result.data.tips
      };
    }

    return {
      success: false,
      error: result.info || '输入提示失败'
    };
  } catch (error) {
    return {
      success: false,
      error: '输入提示服务异常'
    };
  }
}
