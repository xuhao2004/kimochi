"use client";

import React, { useState } from 'react';

interface User {
  id: string;
  name: string;
  nickname?: string;
  accountType: string;
  className?: string;
  college?: string;
  major?: string;
  isSuperAdmin?: boolean;
  isOnline?: boolean;
}

interface GroupData {
  groupType: string;
  groupName: string;
  users: User[];
  subGroups?: GroupData[];
  groupId?: string;
  isCustomGroup?: boolean;
  hierarchicalData?: GroupData[];
}

interface CollapsibleContactGroupProps {
  group: GroupData;
  level: number;
  onUserClick: (userId: string) => void;
  isFavorite?: (userId: string) => boolean;
  onToggleFavorite?: (userId: string) => void;
}

const CollapsibleContactGroup: React.FC<CollapsibleContactGroupProps> = ({
  group,
  level,
  onUserClick,
  isFavorite,
  onToggleFavorite
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0); // 第一层默认展开
  
  // 根据层级设置不同的样式
  const getLevelStyles = (level: number) => {
    const baseStyles = "transition-all duration-300 ease-in-out";
    
    // 使用更合理的缩进，避免过度嵌套导致空间不足
    const getIndentClass = (level: number) => {
      switch (level) {
        case 0: return "";
        case 1: return "ml-3";
        case 2: return "ml-6";
        case 3: return "ml-9";
        default: return "ml-12";
      }
    };
    
    const indentStyles = getIndentClass(level);
    
    // 好友分组特殊样式
    if (group.groupType === 'friend_group') {
      return {
        container: `${baseStyles} ${indentStyles} mb-3`,
        header: "bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/50 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md",
        icon: "w-4 h-4 text-pink-600",
        text: "text-sm font-medium text-pink-900 truncate",
        badge: "bg-pink-500 text-white"
      };
    }

    switch (level) {
      case 0: // 年级
        return {
          container: `${baseStyles} ${indentStyles} mb-4`,
          header: "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 mb-3 shadow-sm hover:shadow-md",
          icon: "w-5 h-5 text-blue-600",
          text: "text-base font-bold text-blue-900 truncate",
          badge: "bg-blue-500 text-white"
        };
      case 1: // 学院
        return {
          container: `${baseStyles} ${indentStyles} mb-3`,
          header: "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md",
          icon: "w-4 h-4 text-green-600",
          text: "text-sm font-semibold text-green-900 truncate",
          badge: "bg-green-500 text-white"
        };
      case 2: // 专业
        return {
          container: `${baseStyles} ${indentStyles} mb-2`,
          header: "bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200/50 rounded-lg p-2.5 mb-2 shadow-sm hover:shadow-md",
          icon: "w-4 h-4 text-purple-600",
          text: "text-sm font-medium text-purple-900 truncate",
          badge: "bg-purple-500 text-white"
        };
      case 3: // 班级
        return {
          container: `${baseStyles} ${indentStyles} mb-2`,
          header: "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 rounded-lg p-2.5 mb-2 shadow-sm hover:shadow-md",
          icon: "w-3.5 h-3.5 text-orange-600",
          text: "text-xs font-medium text-orange-900 truncate",
          badge: "bg-orange-500 text-white"
        };
      default:
        return {
          container: `${baseStyles} ${indentStyles} mb-1`,
          header: "bg-gray-50 border border-gray-200/50 rounded-lg p-2 mb-1",
          icon: "w-3 h-3 text-gray-600",
          text: "text-xs font-normal text-gray-900 truncate",
          badge: "bg-gray-500 text-white"
        };
    }
  };

  const styles = getLevelStyles(level);
  const totalUsers = countTotalUsers(group);
  const onlineUsers = countOnlineUsers(group);

  return (
    <div className={styles.container}>
      {/* 分组标题 */}
      <div
        className={`${styles.header} cursor-pointer select-none relative pr-12`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center min-w-0">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {/* 展开/折叠图标 */}
            <div className={`transform transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            {/* 分组名称 - 允许换行且设置最大宽度 */}
            <h3 className={`${styles.text} flex-1 min-w-0 leading-tight`} title={group.groupName}>
              {group.groupName}
            </h3>
          </div>
          {/* 右侧数字 - 绝对定位，统一尺寸，右对齐 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <div className={`${styles.badge} w-8 h-8 rounded-full text-xs font-bold shadow-lg flex items-center justify-center flex-shrink-0`}>
              {totalUsers}
            </div>
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="space-y-1.5 animate-fadeIn overflow-hidden">
          {/* 子分组 */}
          {group.subGroups?.map((subGroup, index) => (
            <div 
              key={`${subGroup.groupName}-${index}`}
              className="border-l-2 border-gray-100/50 pl-2 ml-1"
            >
              <CollapsibleContactGroup
                group={subGroup}
                level={level + 1}
                onUserClick={onUserClick}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
          
          {/* 用户列表 */}
          {group.users.length > 0 && (
            <div className="space-y-2 ml-2">
              {group.users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onUserClick(user.id)}
                  className="group flex items-center p-3 rounded-xl hover:bg-white/90 hover:shadow-md cursor-pointer transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-gray-200/50 active:scale-[0.99] min-w-0"
                >
                  {/* 用户头像 */}
                  <div className="relative mr-3 flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                      {user.nickname?.[0] || user.name[0]}
                    </div>
                    {/* 在线状态指示器 */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  
                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate flex-1" title={user.nickname && user.nickname !== user.name ? `${user.nickname}（${user.name}）` : user.name}>
                        {user.nickname && user.nickname !== user.name ? (
                          <>
                            <span className="text-gray-900">{user.nickname}</span>
                            <span className="text-gray-500">（{user.name}）</span>
                          </>
                        ) : (
                          user.name
                        )}
                      </p>
                    </div>
                    
                    {/* 仅显示在线状态标签 */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {user.isOnline ? (
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap text-green-700 bg-green-50 border border-green-200/50">
                          在线
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap text-gray-500 bg-gray-50 border border-gray-200/50">
                          离线
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 收藏按钮（悬浮显示） */}
                  <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity min-w-[28px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(user.id); }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${isFavorite && isFavorite(user.id) ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                      title={isFavorite && isFavorite(user.id) ? '取消收藏' : '收藏联系人'}
                    >
                      <svg className={`w-3.5 h-3.5 ${isFavorite && isFavorite(user.id) ? 'text-yellow-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 辅助函数：计算总用户数
function countTotalUsers(group: GroupData): number {
  let count = group.users.length;
  if (group.subGroups) {
    group.subGroups.forEach(subGroup => {
      count += countTotalUsers(subGroup);
    });
  }
  return count;
}

// 辅助函数：计算在线用户数
function countOnlineUsers(group: GroupData): number {
  let count = group.users.filter(user => user.isOnline).length;
  if (group.subGroups) {
    group.subGroups.forEach(subGroup => {
      count += countOnlineUsers(subGroup);
    });
  }
  return count;
}

export default CollapsibleContactGroup;
