import { http } from '../../utils/http';
import { showError, showSuccess } from '../../utils/toast';

Page({
  data: { title:'', content:'', images:[], isAnonymous:false, tagsInput:'', visibilities:['公开','部分好友','老师','同班同学'], visMap:['public','selective_friends','teachers','classmates'], visIndex:0, groups:[], selectedGroups:{}, friends:[], selectedFriends:{}, locationName:'', locationGeo:null },
  async onShow(){
    try{
      const res = await http('/api/chat/friend-groups');
      if (res.statusCode===200) this.setData({ groups: res.data?.groups||[] });
    }catch{}
    try{
      const fr = await http('/api/chat/friends');
      if (fr.statusCode===200) this.setData({ friends: fr.data?.friends||[] });
    }catch{}
  },
  onTitle(e){ this.setData({ title: e.detail.value }); },
  onContent(e){ this.setData({ content: e.detail.value }); },
  onTagsInput(e){ this.setData({ tagsInput: e.detail.value }); },
  onAnon(e){ this.setData({ isAnonymous: !!e.detail.value }); },
  async chooseImages(){
    try{
      const r = await new Promise((resolve,reject)=> wx.chooseMedia({ count: 6, mediaType:['image'], success: resolve, fail: reject }));
      const files = (r.tempFiles||[]).slice(0,6);
      const token = wx.getStorageSync('token');
      const uploaded = [];
      for (const f of files){
        const up = await new Promise((resolve,reject)=>{
          const { getResolvedApiBase } = require('../../utils/http');
          const base = getResolvedApiBase();
          wx.uploadFile({ url: base.replace(/\/$/, '') + '/api/upload', filePath:f.tempFilePath, name:'file', header:{ Authorization:`Bearer ${token}` }, success: resolve, fail: reject });
        });
        try{ const data = JSON.parse(up.data||'{}'); if(data.url) uploaded.push(data.url); }catch{}
      }
      this.setData({ images: (this.data.images||[]).concat(uploaded).slice(0,6) });
    }catch{ /* ignore */ }
  },
  onVisChange(e){ this.setData({ visIndex: Number(e.detail.value||0) }); },
  onToggleGroup(e){ const id=e.currentTarget.dataset.id; const map={...this.data.selectedGroups}; map[id]=!map[id]; this.setData({ selectedGroups: map }); },
  onToggleFriend(e){ const id=e.currentTarget.dataset.id; const map={...this.data.selectedFriends}; map[id]=!map[id]; this.setData({ selectedFriends: map }); },
  async chooseLocation(){
    try{
      const res = await new Promise((resolve,reject)=> wx.chooseLocation({ success: resolve, fail: reject }));
      const name = res?.name || res?.address || '';
      const geo = (typeof res?.latitude==='number' && typeof res?.longitude==='number') ? { lat: res.latitude, lon: res.longitude } : null;
      this.setData({ locationName: name, locationGeo: geo });
    }catch{ /* ignore */ }
  },
  clearLocation(){ this.setData({ locationName:'', locationGeo:null }); },
  async onSubmit(){
    try{
      if(!this.data.title || !this.data.content){ showError('请填写标题与内容'); return; }
      const visibility = this.data.visMap[this.data.visIndex] || 'public';
      const tags = this.data.tagsInput ? this.data.tagsInput.split(/[，,\s]+/).filter(Boolean) : [];
      const groups = Object.keys(this.data.selectedGroups).filter(k=>this.data.selectedGroups[k]);
      const friends = Object.keys(this.data.selectedFriends).filter(k=>this.data.selectedFriends[k]);
      const selective = this.data.visMap[this.data.visIndex]==='selective_friends';
      const teachers = this.data.visMap[this.data.visIndex]==='teachers';
      const visibilitySettings = (selective || teachers) && (groups.length>0 || friends.length>0) ? { groups, friends } : undefined;
      const payload = { title: this.data.title, content: this.data.content, visibility, isAnonymous: this.data.isAnonymous, tags, images: this.data.images, visibilitySettings };
      if (this.data.locationName) payload.location = this.data.locationName;
      const r = await http('/api/message-wall/posts', { method:'POST', data: payload });
      if(r.statusCode===200){ showSuccess('发布成功'); wx.navigateBack(); }
      else showError(r.data?.error || '发布失败');
    }catch{ showError('网络错误'); }
  }
});


