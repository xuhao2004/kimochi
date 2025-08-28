import { useEffect } from 'react';

export function usePageVisit(pageName: string) {
  useEffect(() => {
    const recordPageVisit = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        await fetch('/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            page: pageName,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // 静默失败，不影响用户体验
        console.log('页面访问记录失败:', error);
      }
    };

    recordPageVisit();
  }, [pageName]);
}
