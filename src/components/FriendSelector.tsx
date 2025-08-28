'use client';

import React, { useState, useEffect } from 'react';

interface Friend {
  id: string;
  name: string;
  nickname?: string;
  profileImage?: string;
  accountType: string;
  isAdmin: boolean;
}

interface FriendGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  _count: {
    friendships: number;
  };
}

interface FriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFriends: string[];
  selectedGroups: string[];
  onSelectionChange: (friends: string[], groups: string[]) => void;
}

export default function FriendSelector({ 
  isOpen, 
  onClose, 
  selectedFriends, 
  selectedGroups, 
  onSelectionChange 
}: FriendSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchTerm, setSearchTerm] = useState('');

  const [localSelectedFriends, setLocalSelectedFriends] = useState<string[]>(selectedFriends);
  const [localSelectedGroups, setLocalSelectedGroups] = useState<string[]>(selectedGroups);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalSelectedFriends(selectedFriends);
    setLocalSelectedGroups(selectedGroups);
  }, [selectedFriends, selectedGroups]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 获取好友列表
      const friendsResponse = await fetch('/api/chat/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.friends || []);
      }

      // 获取分组列表
      const groupsResponse = await fetch('/api/chat/friend-groups', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setGroups(groupsData.groups || []);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendToggle = (friendId: string) => {
    const newSelection = localSelectedFriends.includes(friendId)
      ? localSelectedFriends.filter(id => id !== friendId)
      : [...localSelectedFriends, friendId];
    setLocalSelectedFriends(newSelection);
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelection = localSelectedGroups.includes(groupId)
      ? localSelectedGroups.filter(id => id !== groupId)
      : [...localSelectedGroups, groupId];
    setLocalSelectedGroups(newSelection);
  };

  const handleConfirm = () => {
    onSelectionChange(localSelectedFriends, localSelectedGroups);
    onClose();
  };

  const handleReset = () => {
    setLocalSelectedFriends([]);
    setLocalSelectedGroups([]);
  };

  const filteredFriends = friends.filter(friend => 
    (friend.nickname || friend.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/[0.05]">
          {/* 头部 */}
          <div className="px-6 py-4 border-b border-black/[0.05]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">👥 选择可见范围</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 标签页 */}
          <div className="px-6 py-3 border-b border-black/[0.05]">
            <div className="flex space-x-1 bg-gray-100/60 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'friends'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👥 好友 ({localSelectedFriends.length})
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'groups'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📁 分组 ({localSelectedGroups.length})
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="px-6 py-3 border-b border-black/[0.05]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'friends' ? '搜索好友...' : '搜索分组...'}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {activeTab === 'friends' ? (
                  filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <label
                        key={friend.id}
                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          localSelectedFriends.includes(friend.id)
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'bg-gray-50/60 hover:bg-gray-100/80 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={localSelectedFriends.includes(friend.id)}
                          onChange={() => handleFriendToggle(friend.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            friend.isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {friend.profileImage ? (
                              <img src={friend.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              (friend.nickname || friend.name).charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {friend.nickname || friend.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {friend.isAdmin ? '👨‍🏫 老师' : '👤 学生'}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? '没有找到匹配的好友' : '暂无好友'}
                    </div>
                  )
                ) : (
                  filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                      <label
                        key={group.id}
                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          localSelectedGroups.includes(group.id)
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-gray-50/60 hover:bg-gray-100/80 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={localSelectedGroups.includes(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div className="ml-3 flex items-center space-x-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ 
                              backgroundColor: group.color ? `${group.color}20` : '#f3f4f6',
                              color: group.color || '#6b7280'
                            }}
                          >
                            📁
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {group.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {group._count.friendships} 位好友
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? '没有找到匹配的分组' : '暂无分组'}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-black/[0.05] flex space-x-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2 px-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              清空选择
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
