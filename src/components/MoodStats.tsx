'use client';

import React, { useState, useEffect } from 'react';
import AppleSelect from '@/components/AppleSelect';

interface MoodData {
  timeRange: string;
  type: string;
  totalPosts: number;
  moodDistribution: Record<string, number>;
  moodTrends: Record<string, Array<{ date: string; count: number }>>;
  topMoods: [string, number][];
  recentMoodHistory: Array<{
    mood: string;
    date: string;
    user?: { name: string; accountType: string };
  }>;
  healthScore: number;
  suggestions: string[];
  generatedAt: string;
}

interface MoodStatsProps {
  className?: string;
}

export default function MoodStats({ className = '' }: MoodStatsProps) {
  const [data, setData] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [viewType, setViewType] = useState('personal');

  useEffect(() => {
    fetchMoodStats();
  }, [timeRange, viewType]);

  const fetchMoodStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stats/mood?range=${timeRange}&type=${viewType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        console.error('获取心情统计失败');
      }
    } catch (error) {
      console.error('获取心情统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthScoreText = (score: number) => {
    if (score >= 80) return '很好';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需要关注';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
        <p className="text-center text-gray-500">暂无数据</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
      {/* 标题和控制器 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">心情统计</h3>
        <div className="flex items-center gap-2">
          <AppleSelect
            value={timeRange}
            onChange={(val) => setTimeRange(val)}
            options={[
              { value: '7d', label: '近7天', icon: '🗓️' },
              { value: '30d', label: '近30天', icon: '🗓️' },
              { value: '90d', label: '近90天', icon: '🗓️' },
              { value: 'all', label: '全部', icon: '∞' }
            ]}
            placeholder="时间范围"
            size="compact"
            className="w-[120px]"
          />

          <AppleSelect
            value={viewType}
            onChange={(val) => setViewType(val)}
            options={[
              { value: 'personal', label: '个人', icon: '👤' },
              { value: 'global', label: '全体', icon: '🌐' }
            ]}
            placeholder="视图"
            size="compact"
            className="w-[120px]"
          />
        </div>
      </div>

      {/* 健康评分 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">心情健康度</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthScoreColor(data.healthScore)}`}>
            {data.healthScore}分 · {getHealthScoreText(data.healthScore)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              data.healthScore >= 80 ? 'bg-green-500' :
              data.healthScore >= 60 ? 'bg-blue-500' :
              data.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.healthScore}%` }}
          />
        </div>
      </div>

      {/* 心情分布 */}
      {data.topMoods.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">心情分布</h4>
          <div className="space-y-2">
            {data.topMoods.slice(0, 5).map(([mood, count]) => {
              const percentage = (count / data.totalPosts) * 100;
              return (
                <div key={mood} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{mood.split(' ')[0]}</span>
                    <span className="text-sm text-gray-700">{mood.split(' ').slice(1).join(' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 最近心情 */}
      {data.recentMoodHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">最近心情</h4>
          <div className="flex flex-wrap gap-2">
            {data.recentMoodHistory.slice(0, 8).map((entry, index) => (
              <div
                key={index}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-lg text-xs"
                title={`${formatDate(entry.date)}${entry.user ? ` - ${entry.user.name}` : ''}`}
              >
                <span className="text-sm">{entry.mood?.split(' ')[0]}</span>
                <span className="text-gray-600">{formatDate(entry.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 建议 */}
      {data.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💡 心情建议</h4>
          <div className="space-y-2">
            {data.suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-100">
        共记录 {data.totalPosts} 条心情 · 更新于 {formatDate(data.generatedAt)}
      </div>
    </div>
  );
}
