'use client';

import React from 'react';
import AppleSelect from './AppleSelect';

interface MoodSelectorProps {
  value: string;
  onChange: (mood: string) => void;
  className?: string;
  placeholder?: string;
  size?: 'default' | 'compact';
}

const moodOptions = [
  { value: '', label: '选择心情...', icon: '💭' },
  { value: '😊 开心', label: '开心', icon: '😊' },
  { value: '😄 兴奋', label: '兴奋', icon: '😄' },
  { value: '😌 平静', label: '平静', icon: '😌' },
  { value: '🤔 思考', label: '思考', icon: '🤔' },
  { value: '😴 疲惫', label: '疲惫', icon: '😴' },
  { value: '😢 难过', label: '难过', icon: '😢' },
  { value: '😤 生气', label: '生气', icon: '😤' },
  { value: '😵 困惑', label: '困惑', icon: '😵' },
  { value: '🥺 委屈', label: '委屈', icon: '🥺' },
  { value: '😎 自信', label: '自信', icon: '😎' },
  { value: '🤗 温暖', label: '温暖', icon: '🤗' },
  { value: '😭 痛哭', label: '痛哭', icon: '😭' },
  { value: '🙂 还好', label: '还好', icon: '🙂' },
  { value: '😪 困倦', label: '困倦', icon: '😪' },
  { value: '🥳 庆祝', label: '庆祝', icon: '🥳' }
];

export default function MoodSelector({ value, onChange, className = '', placeholder = '选择当前心情...', size = 'default' }: MoodSelectorProps) {
  return (
    <AppleSelect
      value={value}
      onChange={onChange}
      options={moodOptions}
      placeholder={placeholder}
      className={className}
      size={size}
    />
  );
}
