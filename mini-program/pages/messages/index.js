import { http } from '../../utils/http';
import { showError } from '../../utils/toast';

Page({
  data: { 
    messages: [], page: 1, limit: 10, hasMore: true, 
    filter:'all', batchMode:false, selectedMap:{},
    source:'all', // all | admin | user
    priority:'all', // all | urgent | high | normal | low
    sortField:'createdAt', // createdAt | priority
    sortOrder:'desc'
  },
  async onShow(){ this.resetAndLoad(); },
  async onPullDownRefresh(){ await this.resetAndLoad(); wx.stopPullDownRefresh(); },
  async resetAndLoad(){
    this.setData({ messages:[], page:1, hasMore:true, selectedMap:{} });
    await this.loadPage();
  },
  async loadPage(){
    try{
      const qp = [];
      qp.push(`page=${this.data.page}`);
      qp.push(`limit=${this.data.limit}`);
      qp.push('includeAdmin=true'); // 包含广播型管理员消息
      if (this.data.filter==='unread') qp.push('isRead=false');
      if (this.data.priority!=='all') qp.push(`priority=${this.data.priority}`);
      if (this.data.source==='admin') qp.push('source=admin');
      if (this.data.source==='user') qp.push('source=user');
      if (this.data.sortField) qp.push(`sortField=${this.data.sortField}`);
      if (this.data.sortOrder) qp.push(`sortOrder=${this.data.sortOrder}`);
      const qs = qp.join('&');
      const r = await http(`/api/user-messages?${qs}`);
      if(r.statusCode===200){
        const list = (r.data?.messages||[]).map(m=>({ ...m, _createdAt: m.createdAt? new Date(m.createdAt).toLocaleString(): '' }));
        this.setData({ messages: this.data.messages.concat(list), hasMore: (this.data.page * this.data.limit) < (r.data?.pagination?.total||0), page: this.data.page + 1 });
        if (typeof wx.setTabBarBadge === 'function' && r.data?.unreadCount !== undefined) {
          const count = Number(r.data.unreadCount)||0;
          if (count > 0) wx.setTabBarBadge({ index: 0, text: String(Math.min(99, count)) });
          else wx.removeTabBarBadge({ index: 0 });
        }
      } else showError(r.data?.error || '加载失败');
    }catch{ showError('网络错误'); }
  },
  loadMore(){ if(this.data.hasMore) this.loadPage(); },
  filterAll(){ this.setData({ filter:'all' }); this.resetAndLoad(); },
  filterUnread(){ this.setData({ filter:'unread' }); this.resetAndLoad(); },
  showAll(){ this.setData({ source:'all' }); this.resetAndLoad(); },
  showAdmin(){ this.setData({ source:'admin' }); this.resetAndLoad(); },
  showUser(){ this.setData({ source:'user' }); this.resetAndLoad(); },
  setPriority(e){ const v = e?.currentTarget?.dataset?.v || 'all'; this.setData({ priority: v }); this.resetAndLoad(); },
  sortByTime(){ this.setData({ sortField:'createdAt', sortOrder:'desc' }); this.resetAndLoad(); },
  sortByPriority(){ this.setData({ sortField:'priority', sortOrder:'desc' }); this.resetAndLoad(); },
  async markAllRead(){ try{ await http('/api/user-messages', { method:'PUT', data:{ markAllAsRead:true } }); this.resetAndLoad(); }catch{} },
  toggleBatchMode(){ this.setData({ batchMode: !this.data.batchMode, selectedMap:{} }); },
  onSelectItem(e){ const id = e.currentTarget.dataset.id; const m = { ...this.data.selectedMap }; m[id] = !m[id]; this.setData({ selectedMap: m }); },
  async deleteSelected(){
    const ids = Object.keys(this.data.selectedMap).filter(id=>this.data.selectedMap[id]);
    if(ids.length===0) return;
    const selected = this.data.messages.filter(m=>ids.includes(m.id));
    const adminIds = selected.filter(m=>m.source==='admin_message').map(m=>m.id);
    const userIds = selected.filter(m=>m.source!=='admin_message').map(m=>m.id);
    try{
      if (userIds.length>0) await http('/api/user-messages', { method:'DELETE', data:{ messageIds: userIds } });
      if (adminIds.length>0) await http('/api/admin/messages', { method:'DELETE', data:{ messageIds: adminIds } });
      this.toggleBatchMode(); this.resetAndLoad();
    }catch{}
  }
});


