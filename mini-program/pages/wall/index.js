import { http } from '../../utils/http';
import { showError } from '../../utils/toast';

Page({
  data: { posts: [], visiblePosts: [], page: 1, limit: 10, hasMore: true, windowSize: 8, loading: false },
  async onShow(){ this.resetAndLoad(); },
  async onPullDownRefresh(){ await this.resetAndLoad(); wx.stopPullDownRefresh(); },
  async resetAndLoad(){ this.setData({ posts:[], page:1, hasMore:true }); await this.loadPage(); },
  async loadPage(){
    if (this.data.loading) return;
    this.setData({ loading: true });
    try{
      const r = await http(`/api/message-wall/posts?limit=${this.data.limit}&page=${this.data.page}`);
      if(r.statusCode===200){
        const list = (r.data?.posts||[]).map(p=>{
          // 解析图片：content 末尾 [images]JSON
          let imgs = [];
          let content = p.content||'';
          const marker = '\\n\\n[images]';
          const idx = content.lastIndexOf(marker);
          if (idx !== -1) {
            const json = content.slice(idx + marker.length);
            content = content.slice(0, idx);
            try { imgs = JSON.parse(json)||[]; } catch {}
          }
          return { ...p, _createdAt: (p.createdAt? new Date(p.createdAt).toLocaleString(): ''), _images: imgs, _content: content, _liked: !!p.liked, likeCount: p.likeCount||0 };
        });
        const merged = this.data.posts.concat(list);
        this.setData({ posts: merged, hasMore: !!(r.data?.pagination?.hasMore), page: this.data.page + 1 });
        this.updateWindow();
      } else showError(r.data?.error || '加载失败');
    }catch{ showError('网络错误'); }
    finally { this.setData({ loading: false }); }
  },
  loadMore(){ if(this.data.hasMore) this.loadPage(); },
  updateWindow(){
    const start = Math.max(0, this.data.posts.length - this.data.windowSize);
    const visible = this.data.posts.slice(start);
    this.setData({ visiblePosts: visible });
  },
  async toggleLike(e){
    const id = e.currentTarget.dataset.id;
    try{
      const r = await http(`/api/message-wall/posts/${id}/like`, { method:'POST' });
      if (r.statusCode===200){
        const liked = !!r.data?.liked;
        const posts = this.data.posts.map(p => p.id===id? { ...p, _liked: liked, likeCount: Math.max(0, (p.likeCount||0) + (liked? 1 : -1)) } : p);
        this.setData({ posts }); this.updateWindow();
      }
    }catch{}
  },
  goCreate(){ wx.navigateTo({ url: '/pages/wall/create' }); }
});


