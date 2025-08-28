"use client";

import React, { useState, useEffect } from 'react';
import AppleConfirmDialog from './AppleConfirmDialog';
import { useAlert } from './AppleAlert';

interface FriendGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  order: number;
  isDefault: boolean;
  _count: {
    friendships: number;
  };
}

interface FriendGroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsUpdated?: () => void;
}

const FriendGroupManager: React.FC<FriendGroupManagerProps> = ({
  isOpen,
  onClose,
  onGroupsUpdated
}) => {
  const { showAlert } = useAlert();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FriendGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<FriendGroup | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const colors = [
    { name: '蓝色', value: '#3B82F6' },
    { name: '绿色', value: '#10B981' },
    { name: '紫色', value: '#8B5CF6' },
    { name: '红色', value: '#EF4444' },
    { name: '橙色', value: '#F97316' },
    { name: '粉色', value: '#EC4899' },
    { name: '青色', value: '#06B6D4' },
    { name: '黄色', value: '#EAB308' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friend-groups', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('获取分组失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      showAlert({
        title: '创建失败',
        message: '分组名称不能为空',
        type: 'warning'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friend-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchGroups();
        setShowCreateForm(false);
        setFormData({ name: '', description: '', color: '#3B82F6' });
        onGroupsUpdated?.();
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '分组创建成功' }
        }));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '创建分组失败' }
        }));
      }
    } catch (error) {
      console.error('创建分组失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '创建分组失败' }
      }));
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !formData.name.trim()) {
      showAlert({
        title: '更新失败',
        message: '分组名称不能为空',
        type: 'warning'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/friend-groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: editingGroup.id,
          ...formData
        })
      });

      if (response.ok) {
        await fetchGroups();
        setEditingGroup(null);
        setFormData({ name: '', description: '', color: '#3B82F6' });
        onGroupsUpdated?.();
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '分组更新成功' }
        }));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '更新分组失败' }
        }));
      }
    } catch (error) {
      console.error('更新分组失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '更新分组失败' }
      }));
    }
  };

  const handleDeleteGroup = (group: FriendGroup) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  };

  const confirmDeleteGroup = async () => {
    if (!selectedGroup) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/friend-groups?groupId=${selectedGroup.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchGroups();
        onGroupsUpdated?.();
        setShowDeleteDialog(false);
        setSelectedGroup(null);
        // 使用更好的成功提示而不是alert
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '分组删除成功' }
        }));
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '删除分组失败' }
        }));
      }
    } catch (error) {
      console.error('删除分组失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '删除分组失败' }
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (group: FriendGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#3B82F6'
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setShowCreateForm(false);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" style={{ animation: 'dialogBounceIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">分组管理</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingGroup(null);
              setFormData({ name: '', description: '', color: '#3B82F6' });
            }}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>新建分组</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 创建/编辑表单 */}
          {(showCreateForm || editingGroup) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-900 mb-3">
                {editingGroup ? '编辑分组' : '创建新分组'}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入分组名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组描述（可选）</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="输入分组描述"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分组颜色</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`w-12 h-8 rounded-lg border-2 transition-all ${
                          formData.color === color.value ? 'border-gray-400 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {editingGroup ? '更新' : '创建'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 分组列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-500">暂无自定义分组</p>
                  <p className="text-sm text-gray-400 mt-1">创建分组来更好地管理您的好友</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{group.name}</p>
                      {group.description && (
                        <p className="text-sm text-gray-500 truncate">{group.description}</p>
                      )}
                      <p className="text-xs text-gray-400">{group._count.friendships} 位好友</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEdit(group)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AppleConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteGroup}
        title="删除分组"
        message={`确定要删除分组"${selectedGroup?.name}"吗？分组内的好友将移动到"我的好友"分组。`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FriendGroupManager;
