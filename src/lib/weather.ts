export type WeatherInfo = {
  locationName: string;
  summary: string;
  temperatureC: number;
};

// 使用和风天气 GeoAPI: 最近城市查询
// 文档: https://dev.qweather.com/docs/api/geoapi/city-lookup/
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = process.env.HEWEATHER_API_KEY;
  if (!key) throw new Error("未配置和风天气密钥 HEWEATHER_API_KEY");
  const GATEWAY_BASE = normalizeBase(process.env.QWEATHER_GATEWAY_BASE);
  const GEO_BASE = normalizeBase(process.env.QWEATHER_GEO_BASE) ?? (GATEWAY_BASE ?? "https://geoapi.qweather.com");
  const inChina = lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
  const rangePart = inChina ? "&range=cn" : "";
  // 官方示例经度,纬度（如 116.41,39.92），最多支持小数点后两位（按文档）
  const lon2 = Number(lon.toFixed(2));
  const lat2 = Number(lat.toFixed(2));
  
  // 检查是否为私有网关（qweatherapi.com域名）
  const isPrivateGateway = GATEWAY_BASE ? GATEWAY_BASE.includes('qweatherapi.com') : false;
  
  // 私有网关和官方API使用不同的路径
  const paths = isPrivateGateway
    ? [
        "/geo/v2/city/lookup",     // 私有网关标准路径
        "/v2/city/lookup",         // 备用路径
      ]
    : GATEWAY_BASE
    ? [
        "/geoapi/v2/city/lookup",  // 其他私有网关格式
        "/api/geo/v2/city/lookup",
        "/geo/v2/city/lookup",
        "/v2/city/lookup",
      ]
    : ["/v2/city/lookup"]; // 官方分域
  
  const query = `location=${lon2},${lat2}&key=${key}&lang=zh${rangePart}&number=1`;
  const { data, lastTried } = await fetchWithPathFallback<QWeatherGeoResponse>(GEO_BASE, paths, query);
  if (String(data?.code) !== "200") {
    throw new Error(`GeoAPI 响应错误 code=${data?.code ?? "未知"}, tried=${lastTried}`);
  }
  const loc = data?.location?.[0];
  if (!loc) throw new Error("GeoAPI 未找到对应位置");
  const parts = (loc.adm2 ? [loc.adm2, loc.name] : [loc.adm1, loc.name]).filter(Boolean);
  return parts.join(" · ");
}

// 使用和风天气 实况天气 API  
// 文档: https://dev.qweather.com/docs/api/weather/weather-now/
export async function getWeather(lat: number, lon: number): Promise<{ summary: string; temperatureC: number }> {
  const key = process.env.HEWEATHER_API_KEY;
  if (!key) throw new Error("未配置和风天气密钥 HEWEATHER_API_KEY");
  const GATEWAY_BASE = normalizeBase(process.env.QWEATHER_GATEWAY_BASE);
  const WEATHER_BASE = normalizeBase(process.env.QWEATHER_WEATHER_BASE) ?? (GATEWAY_BASE ?? "https://devapi.qweather.com");
  
  // 首先获取LocationID（私有网关通常需要LocationID而不是经纬度）
  const isPrivateGateway = GATEWAY_BASE ? GATEWAY_BASE.includes('qweatherapi.com') : false;
  
  let locationParam: string;
  if (isPrivateGateway) {
    // 对于私有网关，先通过GeoAPI获取LocationID
    const locationId = await getLocationId(lat, lon);
    locationParam = locationId;
  } else {
    // 官方API支持经纬度
    const lon2 = Number(lon.toFixed(2));
    const lat2 = Number(lat.toFixed(2));
    locationParam = `${lon2},${lat2}`;
  }
  
  const paths = isPrivateGateway
    ? [
        "/v7/weather/now",         // 私有网关标准路径
        "/weather/v7/weather/now", // 备用路径
      ]
    : GATEWAY_BASE
    ? [
        "/devapi/v7/weather/now",
        "/api/weather/v7/weather/now",
        "/weather/v7/weather/now",
        "/v7/weather/now",
      ]
    : ["/v7/weather/now"]; // 官方分域
  
  const query = `location=${locationParam}&key=${key}&lang=zh`;
  const { data, lastTried } = await fetchWithPathFallback<QWeatherWeatherResponse>(WEATHER_BASE, paths, query);
  if (String(data?.code) !== "200") {
    throw new Error(`WeatherNow 响应错误 code=${data?.code ?? "未知"}, tried=${lastTried}`);
  }
  const summary = data?.now?.text;
  const tempStr = data?.now?.temp;
  if (summary == null || tempStr == null) {
    throw new Error("WeatherNow 数据不完整");
  }
  const temperatureC = parseFloat(String(tempStr));
  if (!Number.isFinite(temperatureC)) {
    throw new Error("WeatherNow 温度解析失败");
  }
  return { summary, temperatureC };
}

// 辅助函数：获取LocationID
async function getLocationId(lat: number, lon: number): Promise<string> {
  const key = process.env.HEWEATHER_API_KEY;
  if (!key) throw new Error("未配置和风天气密钥 HEWEATHER_API_KEY");
  const GATEWAY_BASE = normalizeBase(process.env.QWEATHER_GATEWAY_BASE);
  const GEO_BASE = normalizeBase(process.env.QWEATHER_GEO_BASE) ?? (GATEWAY_BASE ?? "https://geoapi.qweather.com");
  const inChina = lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
  const rangePart = inChina ? "&range=cn" : "";
  const lon2 = Number(lon.toFixed(2));
  const lat2 = Number(lat.toFixed(2));
  
  const paths = ["/geo/v2/city/lookup", "/v2/city/lookup"];
  const query = `location=${lon2},${lat2}&key=${key}&lang=zh${rangePart}&number=1`;
  const { data } = await fetchWithPathFallback<QWeatherGeoResponse>(GEO_BASE, paths, query);
  if (String(data?.code) !== "200") {
    throw new Error(`获取LocationID失败 code=${data?.code ?? "未知"}`);
  }
  const loc = data?.location?.[0];
  if (!loc?.id) throw new Error("未找到LocationID");
  return loc.id;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function normalizeBase(input?: string | null): string | undefined {
  if (!input) return undefined;
  let base = input.trim();
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }
  // 移除末尾斜杠，避免双斜杠
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

type QWeatherLocation = {
  name?: string;
  id?: string;
  lat?: string;
  lon?: string;
  adm1?: string;
  adm2?: string;
};
type QWeatherGeoResponse = { code?: string; location?: QWeatherLocation[] };
type QWeatherNow = { text?: string; temp?: string };
type QWeatherWeatherResponse = { code?: string; now?: QWeatherNow };

async function fetchWithPathFallback<T extends object>(base: string, paths: string[], query: string): Promise<{
  data: T;
  lastStatus?: number;
  lastText?: string;
  lastTried: string[];
}> {
  const tried: string[] = [];
  let lastStatus: number | undefined;
  let lastText: string | undefined;
  for (const p of paths) {
    const url = `${base}${p}?${query}`;
    tried.push(url);
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as T;
      return { data, lastStatus, lastText, lastTried: tried };
    }
    lastStatus = res.status;
    lastText = await safeText(res);
    // 404/405等路径类错误时尝试下一个；其他错误也继续尝试
  }
  throw new Error(`HTTP ${lastStatus ?? -1}: ${lastText ?? ""}; tried=${tried.join(" | ")}`);
}


