'use client';

import React, { useState } from 'react';
import StickerPicker from '@/components/StickerPicker';
import FriendSelector from '@/components/FriendSelector';
import LocationPicker from '@/components/LocationPicker';
import MoodSelector from '@/components/MoodSelector';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'public',
    isAnonymous: false,
    tags: [] as string[],
    location: '',
    mood: ''
  });
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);

  const visibilityOptions = [
    { value: 'public', label: '🌐 公开可见', desc: '所有用户都可以看到' },
    { value: 'friends', label: '👥 仅好友', desc: '只有全部好友可以看到' },
    { value: 'selective_friends', label: '👥 部分好友', desc: '选择特定好友或分组可见' },
    { value: 'teachers', label: '👨‍🏫 仅老师', desc: '只有老师可以看到' },
    { value: 'classmates', label: '🎓 仅同学', desc: '只有同班同学可以看到' },
    { value: 'teachers_classmates', label: '👨‍🏫🎓 老师和同学', desc: '老师和同班同学可以看到' }
  ];



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '请填写标题和内容' }
      }));
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: '未登录，请先登录' }
        }));
        setLoading(false);
        return;
      }

      // 追加图片标记到内容末尾（与小程序约定一致）
      let finalContent = formData.content.trim();
      if (images.length > 0) {
        finalContent = `${finalContent}\n\n[images]${JSON.stringify(images)}`;
      }

      const response = await fetch('/api/message-wall/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          content: finalContent,
          tags: formData.tags.length > 0 ? formData.tags : null,
          location: formData.location.trim() || null,
          mood: formData.mood || null,
          visibilitySettings: formData.visibility === 'selective_friends' ? {
            friends: selectedFriends,
            groups: selectedGroups
          } : null
        })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('showSuccessToast', {
          detail: { message: '帖子发布成功！' }
        }));
        resetForm();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        window.dispatchEvent(new CustomEvent('showErrorToast', {
          detail: { message: error.error || '发布失败' }
        }));
      }
    } catch (error) {
      console.error('发布帖子失败:', error);
      window.dispatchEvent(new CustomEvent('showErrorToast', {
        detail: { message: '发布失败' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      visibility: 'public',
      isAnonymous: false,
      tags: [],
      location: '',
      mood: ''
    });
    setSelectedFriends([]);
    setSelectedGroups([]);
    setNewTag('');
    setImages([]);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim()) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleChooseImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: '未登录，请先登录' } }));
      return;
    }
    setUploading(true);
    try {
      const limit = 6;
      const remain = Math.max(0, limit - images.length);
      for (const file of files.slice(0, remain)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (res.ok && data.url) {
          setImages(prev => [...prev, data.url]);
        } else {
          window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: data.error || '图片上传失败' } }));
        }
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('showErrorToast', { detail: { message: '图片上传失败' } }));
    } finally {
      setUploading(false);
      // 清空 input 以便重复选择同一文件
      event.currentTarget.value = '';
    }
  };

  const removeImage = (url: string) => {
    setImages(prev => prev.filter(u => u !== url));
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* 模态框 */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/[0.05] overflow-hidden">
          
          {/* 头部 */}
          <div className="px-8 py-6 border-b border-black/[0.05]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">✨ 发布新帖子</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* 标题 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  📝 标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="给你的帖子起个吸引人的标题..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                  maxLength={100}
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {formData.title.length}/100
                </div>
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  💭 内容
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="分享你的想法、感受或经历..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm resize-none"
                  maxLength={1000}
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {formData.content.length}/1000
                </div>

                {/* 图片上传 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">📷 图片（最多6张，可选）</label>
                    <span className="text-xs text-gray-500">{images.length}/6</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {images.map((url) => (
                      <div key={url} className="group relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                        <img src={url} alt="上传图片" className="max-w-full max-h-full object-contain object-center" />
                        <button type="button" onClick={() => removeImage(url)} className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full hidden group-hover:flex items-center justify-center">✕</button>
                      </div>
                    ))}
                    {images.length < 6 && (
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400">
                        <input type="file" accept="image/*" multiple onChange={handleChooseImages} className="hidden" />
                        {uploading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : '+'}
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => setStickerOpen(true)}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400"
                      title="从表情选择一张"
                    >
                      😊
                    </button>
                  </div>
                </div>
              </div>

              {/* 可见范围 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  👁️ 谁可以看到
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {visibilityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        formData.visibility === option.value
                          ? 'border-blue-500 bg-blue-50/80'
                          : 'border-gray-200 bg-white/60 hover:bg-gray-50/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={formData.visibility === option.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.desc}
                        </div>
                      </div>
                      {formData.visibility === option.value && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                
                {/* 部分好友选择 */}
                {formData.visibility === 'selective_friends' && (
                  <div className="mt-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">选择可见对象</h4>
                      <button
                        type="button"
                        onClick={() => setShowFriendSelector(true)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        选择好友
                      </button>
                    </div>
                    
                    {/* 已选择的好友和分组显示 */}
                    <div className="space-y-2">
                      {selectedFriends.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">已选择好友 ({selectedFriends.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedFriends.slice(0, 5).map((friendId) => (
                              <span
                                key={friendId}
                                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                              >
                                好友ID: {friendId}
                              </span>
                            ))}
                            {selectedFriends.length > 5 && (
                              <span className="text-xs text-gray-500">
                                等{selectedFriends.length}人
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {selectedGroups.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">已选择分组 ({selectedGroups.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedGroups.map((groupId) => (
                              <span
                                key={groupId}
                                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md"
                              >
                                分组ID: {groupId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedFriends.length === 0 && selectedGroups.length === 0 && (
                        <p className="text-sm text-gray-500">
                          请点击&ldquo;选择好友&rdquo;选择可以看到此帖子的好友或分组
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  🏷️ 标签 (最多5个)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-blue-900"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                {formData.tags.length < 5 && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="输入标签..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!newTag.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      添加
                    </button>
                  </div>
                )}
              </div>

              {/* 位置和心情 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 位置 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    📍 位置 (可选)
                  </label>
                  <LocationPicker
                    value={formData.location}
                    onChange={(location) => setFormData(prev => ({ ...prev, location }))}
                    placeholder="你在哪里..."
                  />
                </div>

                {/* 心情 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    😊 心情 (可选)
                  </label>
                  <MoodSelector
                    value={formData.mood}
                    onChange={(mood) => setFormData(prev => ({ ...prev, mood }))}
                    placeholder="选择心情..."
                    size="compact"
                  />
                </div>
              </div>

              {/* 匿名选项 */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">👤 匿名发布</span>
                    <p className="text-xs text-gray-600">其他用户将看不到你的真实身份</p>
                  </div>
                </label>
              </div>

              {/* 底部按钮 */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading || !formData.title.trim() || !formData.content.trim()}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>发布中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>发布帖子</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* 好友选择器 */}
      <FriendSelector
        isOpen={showFriendSelector}
        onClose={() => setShowFriendSelector(false)}
        selectedFriends={selectedFriends}
        selectedGroups={selectedGroups}
        onSelectionChange={(friends, groups) => {
          setSelectedFriends(friends);
          setSelectedGroups(groups);
        }}
      />
    </div>
    <StickerPicker
      isOpen={stickerOpen}
      onClose={() => setStickerOpen(false)}
      onSelect={(url) => {
        if (images.length >= 6) return;
        setImages(prev => [...prev, url]);
      }}
      title="选择表情作为图片"
      variant="sheet"
    />
    </>
  );
}
