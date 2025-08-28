'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getCurrentLocation, inputTips, reverseGeocode } from '@/lib/amap';
import { useAlert } from './AppleAlert';

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  className?: string;
  placeholder?: string;
}

export default function LocationPicker({ value, onChange, className = '', placeholder = '输入位置...' }: LocationPickerProps) {
  const { showAlert } = useAlert();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() && inputValue !== value) {
        searchLocations(inputValue.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLocationFromBrowser = async () => {
    setIsLoadingLocation(true);
    
    try {
      // 优先使用浏览器GPS定位
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              // 使用高德地图逆地理编码
              const result = await reverseGeocode(longitude, latitude);
              
              if (result.success && result.data) {
                const address = result.data.formatted_address;
                setInputValue(address);
                onChange(address);
                
                // 添加到建议列表
                const locationSuggestion: LocationSuggestion = {
                  id: 'current',
                  name: '当前位置',
                  address: address,
                  latitude,
                  longitude
                };
                setSuggestions([locationSuggestion]);
              } else {
                throw new Error(result.error || '位置解析失败');
              }
            } catch (error) {
              console.error('逆地理编码失败:', error);
              // 降级处理：显示坐标
              const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              setInputValue(fallbackAddress);
              onChange(fallbackAddress);
            } finally {
              setIsLoadingLocation(false);
            }
          },
          async (error) => {
            console.log('GPS定位失败，尝试IP定位:', error.message);
            // GPS定位失败，使用IP定位
            await fallbackToIpLocation();
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
          }
        );
      } else {
        // 浏览器不支持GPS，使用IP定位
        await fallbackToIpLocation();
      }
    } catch (error) {
      console.error('定位失败:', error);
      setIsLoadingLocation(false);
      showAlert({
        title: '定位失败',
        message: '定位服务暂时不可用',
        type: 'warning'
      });
    }
  };

  // IP定位降级方案
  const fallbackToIpLocation = async () => {
    try {
      const result = await getCurrentLocation();
      
      if (result.success && result.data) {
        const address = result.data.address;
        setInputValue(address);
        onChange(address);
        
        // 添加到建议列表
        const locationSuggestion: LocationSuggestion = {
          id: 'ip-location',
          name: 'IP定位',
          address: address,
          latitude: result.data.lat,
          longitude: result.data.lng
        };
        setSuggestions([locationSuggestion]);
      } else {
        throw new Error(result.error || 'IP定位失败');
      }
    } catch (error) {
      console.error('IP定位失败:', error);
      showAlert({
        title: '定位失败',
        message: '定位服务暂时不可用，请手动输入位置',
        type: 'warning'
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchNearbyPlaces = async (lat: number, lng: number) => {
    try {
      // 这里可以集成地图服务API来搜索附近的地点
      // 由于没有具体的API key，我们创建一些模拟的建议
      const mockSuggestions: LocationSuggestion[] = [
        {
          id: 'current',
          name: '当前位置',
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng
        }
      ];
      
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('搜索附近地点失败:', error);
    }
  };

  const searchLocations = async (query: string) => {
    try {
      // 使用高德地图输入提示API
      const result = await inputTips(query);
      
      if (result.success && result.data) {
        const suggestions: LocationSuggestion[] = result.data
          .filter(tip => tip.location && tip.location !== '') // 过滤掉没有坐标的结果
          .map(tip => {
            const [lng, lat] = tip.location.split(',').map(Number);
            return {
              id: tip.id,
              name: tip.name,
              address: tip.district + tip.address,
              latitude: lat,
              longitude: lng
            };
          });
        
        setSuggestions(suggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        console.error('搜索失败:', result.error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('搜索地点失败:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!newValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange('');
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          // 使用当前输入值
          onChange(inputValue);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.name);
    onChange(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            maxLength={50}
          />
          
          {/* 清除按钮 */}
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onChange('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 定位按钮 */}
        <button
          type="button"
          onClick={getLocationFromBrowser}
          disabled={isLoadingLocation}
          className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 text-sm"
        >
          {isLoadingLocation ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <span className="hidden sm:inline">定位</span>
        </button>
      </div>

      {/* 建议列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors ${
                index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="font-medium text-gray-900 text-sm">
                📍 {suggestion.name}
              </div>
              {suggestion.address && (
                <div className="text-xs text-gray-500 mt-1">
                  {suggestion.address}
                </div>
              )}
            </button>
          ))}
          
          {/* 自定义输入选项 */}
          <button
            type="button"
            onClick={() => {
              onChange(inputValue);
              setShowSuggestions(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-t border-gray-100 first:rounded-t-xl last:rounded-b-xl transition-colors"
          >
            <div className="font-medium text-gray-900 text-sm">
              ✏️ 使用 &ldquo;{inputValue}&rdquo;
            </div>
            <div className="text-xs text-gray-500 mt-1">
              直接使用您输入的位置信息
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
