// index.js
import { http } from '../../utils/http';
import { loginWeapp } from '../../utils/auth';
Page({
  data: { unread: 0, dailyPreview: '', hotPosts: [], weather: null, locating: false },
  goDevSettings(){ wx.navigateTo({ url: '/pages/dev-settings/index' }); },
  goProfile(){ wx.navigateTo({ url: '/pages/profile/index' }); },
  goConfirm(){ wx.navigateTo({ url: '/pages/confirm-login/index' }); },
  goPrivacy(){ wx.navigateTo({ url: '/pages/privacy/index' }); },
  goScan(){
    wx.scanCode({
      onlyFromCamera: false,
      success: (res)=>{
        const txt = (res.result || '').trim();
        let nonce = '';
        // 若二维码是 URL，提取其域名作为 API 基址，确保后续确认请求命中同一环境
        try{
          const mHost = txt.match(/^(https?:\/\/[^\/\?#]+)/i);
          const apiBaseFromQr = (mHost && mHost[1]) || '';
          if (apiBaseFromQr && /^https:\/\//i.test(apiBaseFromQr)) {
            wx.setStorageSync('API_BASE', apiBaseFromQr);
          }
        }catch{}
        const m = txt.match(/[?&]nonce=([^&]+)/);
        if (m && m[1]) {
          try { nonce = decodeURIComponent(m[1]); } catch { nonce = m[1]; }
        }
        if (!nonce && /^[a-zA-Z0-9_-]{16,64}$/.test(txt)) {
          nonce = txt;
        }
        if(nonce){
          wx.navigateTo({ url: `/pages/confirm-login/index?nonce=${encodeURIComponent(nonce)}` });
        } else {
          wx.showToast({ title: '二维码不合法', icon: 'none' });
        }
      },
      fail: ()=> wx.showToast({ title: '已取消', icon: 'none' })
    })
  },
  goDaily(){ wx.navigateTo({ url: '/pages/daily/index' }); },
  goWall(){ wx.navigateTo({ url: '/pages/wall/index' }); },
  goMessages(){ wx.navigateTo({ url: '/pages/messages/index' }); },
  async locateAndFetchWeather(){
    try{
      this.setData({ locating: true });
      const loc = await new Promise((resolve, reject)=> wx.getLocation({ type:'gcj02', success: resolve, fail: reject }));
      const token = wx.getStorageSync('token');
      const base = require('../../utils/http').getResolvedApiBase();
      const res = await new Promise((resolve, reject)=>{
        wx.request({
          url: base.replace(/\/$/, '') + '/api/weather',
          method: 'POST',
          data: { lat: loc.latitude, lon: loc.longitude },
          header: { 'content-type':'application/json', Authorization: `Bearer ${token}` },
          success: resolve, fail: reject
        });
      });
      if(res.statusCode===200){
        this.setData({ weather: { locationName: res.data.locationName, summary: res.data.summary, temperatureC: res.data.temperatureC } });
      }
    }catch(err){
      // 静默失败
    }finally{ this.setData({ locating: false }); }
  },
  async onShow(){
    // 未登录：引导到“登录与注册”页，不再静默创建账号
    try{
      const token = wx.getStorageSync('token');
      if (!token) {
        try {
          const { code } = await new Promise((resolve, reject)=> wx.login({ success: resolve, fail: reject }));
          if (code) {
            const r = await http('/api/auth/weapp/check-bound', { method: 'POST', data: { code } });
            if (r.statusCode === 200 && r.data?.bound && r.data?.token) {
              wx.setStorageSync('token', r.data.token);
            } else {
              wx.reLaunch({ url: '/pages/auth/index' });
              return;
            }
          } else {
            wx.reLaunch({ url: '/pages/auth/index' });
            return;
          }
        } catch {
          wx.reLaunch({ url: '/pages/auth/index' });
          return;
        }
      }
    }catch{}
    // 强制完善密保邮箱：若 securityEmail 为空且未获特批，则要求完善；
    // 兼容旧逻辑：若邮箱与手机号均为空，也引导完善
    try{
      const prof = await http('/api/profile');
      if (prof.statusCode===200 && prof.data?.user) {
        const u = prof.data.user;
        const needSecurity = !u.securityEmail && !u.securityEmailExempt;
        const needBasic = !u.email && !u.phone;
        if (needSecurity || needBasic) {
          wx.showToast({ title: needSecurity ? '请完善密保邮箱' : '请完善邮箱或手机号', icon: 'none' });
          wx.navigateTo({ url: '/pages/profile/index?force=1' });
          return;
        }
      }
    }catch{}
    // 未读数
    try{
      const r = await http('/api/user-messages');
      if(r.statusCode===200){ this.setData({ unread: r.data?.unreadCount || 0 }); }
    }catch{ this.setData({ unread: 0 }); }

    // 心语预览
    try{
      const d = await http('/api/daily');
      if (d.statusCode===200) this.setData({ dailyPreview: d.data?.sentence || '' });
    }catch{ this.setData({ dailyPreview: '' }); }

    // 热帖预览（取第一页3条）
    try{
      const p = await http('/api/message-wall/posts?limit=3&page=1');
      if (p.statusCode===200) {
        const list = (p.data?.posts||[]).map(post=>{
          let content = post.content||''; const marker='\n\n[images]'; const idx=content.lastIndexOf(marker); if(idx!==-1) content = content.slice(0,idx);
          return { ...post, _createdAt: (post.createdAt? new Date(post.createdAt).toLocaleString(): ''), _content: content };
        });
        this.setData({ hotPosts: list });
      }
    }catch{ this.setData({ hotPosts: [] }); }

    // 位置与天气（静默触发，用户可在首次授权时允许）
    this.locateAndFetchWeather();
  },
  
})
