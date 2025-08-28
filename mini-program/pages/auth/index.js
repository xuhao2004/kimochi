import { http } from '../../utils/http';
import { showError } from '../../utils/toast';

Page({
  data: {},
  async onLoad(){
    // 自动检测：若当前微信已绑定账号，则直接登录并跳转首页
    try {
      const { code } = await new Promise((resolve, reject)=> wx.login({ success: resolve, fail: reject }));
      if (!code) return;
      const r = await http('/api/auth/weapp/check-bound', { method: 'POST', data: { code } });
      if (r.statusCode === 200 && r.data?.bound && r.data?.token) {
        try { wx.setStorageSync('token', r.data.token); } catch {}
        wx.reLaunch({ url: '/pages/index/index' });
        return;
      }
    } catch (e) {
      // 静默忽略，进入选择页
    }
  },
  goDevSettings(){ wx.navigateTo({ url: '/pages/dev-settings/index' }); },
  goPasswordLogin(){ wx.navigateTo({ url: '/pages/auth/password-login/index' }); },
  goRegister(){ wx.navigateTo({ url: '/pages/auth/register/index' }); },
  goConfirmLogin(){ wx.navigateTo({ url: '/pages/confirm-login/index' }); },
  goScan(){
    wx.scanCode({
      onlyFromCamera: false,
      success: (res)=>{
        const txt = (res.result || '').trim();
        let nonce = '';
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
        if (!nonce && /^[a-zA-Z0-9_-]{16,64}$/.test(txt)) { nonce = txt; }
        if(nonce){ wx.navigateTo({ url: `/pages/confirm-login/index?nonce=${encodeURIComponent(nonce)}` }); }
        else { wx.showToast({ title: '二维码不合法', icon: 'none' }); }
      },
      fail: ()=> wx.showToast({ title: '已取消', icon: 'none' })
    });
  }
});


