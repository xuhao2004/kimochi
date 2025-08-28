import { http } from '../../utils/http';

Page({
  data: {
    apiBase: '',
    allowHttp: false,
    autoLogin: false,
    testResult: '',
    devFeatures: false,
    presetsOpen: false,
    presets: [
      { label: '生产 (HTTPS)', value: 'https://app.kimochi.space' },
      { label: '本机 3001', value: 'http://127.0.0.1:3001' },
      { label: '本机 3000', value: 'http://127.0.0.1:3000' }
    ]
  },
  onShow(){
    try {
      this.setData({
        apiBase: wx.getStorageSync('API_BASE') || '',
        allowHttp: !!wx.getStorageSync('DEV_ALLOW_HTTP_OVERRIDE'),
        autoLogin: !!wx.getStorageSync('AUTO_LOGIN_ON_401'),
        devFeatures: !!wx.getStorageSync('ENABLE_DEV_FEATURES')
      });
    } catch {}
  },
  onApiBaseInput(e){ this.setData({ apiBase: (e.detail && e.detail.value) || '' }); },
  saveApiBase(){
    try{
      const v = (this.data.apiBase || '').trim();
      if (!v) { wx.removeStorageSync('API_BASE'); }
      else { wx.setStorageSync('API_BASE', v); }
      wx.showToast({ title: '已保存', icon: 'success' });
    }catch{ wx.showToast({ title: '保存失败', icon: 'none' }); }
  },
  togglePresets(){ this.setData({ presetsOpen: !this.data.presetsOpen }); },
  applyPreset(e){
    try{
      const idx = e.currentTarget.dataset.index;
      const preset = this.data.presets[idx];
      if (!preset) return;
      this.setData({ apiBase: preset.value, presetsOpen: false });
      wx.setStorageSync('API_BASE', preset.value);
      wx.showToast({ title: '已切换', icon: 'success' });
    }catch{}
  },
  onToggleDevFeatures(e){
    try{ const v = !!(e.detail && e.detail.value); if (v) wx.setStorageSync('ENABLE_DEV_FEATURES', true); else wx.removeStorageSync('ENABLE_DEV_FEATURES'); this.setData({ devFeatures: v }); }
    catch{}
  },
  clearApiBase(){
    try{ wx.removeStorageSync('API_BASE'); this.setData({ apiBase: '' }); wx.showToast({ title: '已清除', icon: 'success' }); }
    catch{ wx.showToast({ title: '清除失败', icon: 'none' }); }
  },
  onToggleHttp(e){
    try{ const v = !!(e.detail && e.detail.value); if (v) wx.setStorageSync('DEV_ALLOW_HTTP_OVERRIDE', true); else wx.removeStorageSync('DEV_ALLOW_HTTP_OVERRIDE'); this.setData({ allowHttp: v }); }
    catch{}
  },
  onToggleAutoLogin(e){
    try{ const v = !!(e.detail && e.detail.value); if (v) wx.setStorageSync('AUTO_LOGIN_ON_401', true); else wx.removeStorageSync('AUTO_LOGIN_ON_401'); this.setData({ autoLogin: v }); }
    catch{}
  },
  async testConnectivity(){
    this.setData({ testResult: '测试中...' });
    try{
      // 使用无需鉴权的公开接口进行连通性测试，避免因登录态导致误判
      const r = await http('/api/violation-reasons');
      if (r.statusCode>=200 && r.statusCode<300) {
        this.setData({ testResult: `成功：${JSON.stringify(r.data).slice(0,300)}` });
      } else {
        this.setData({ testResult: `失败：${r.statusCode} ${JSON.stringify(r.data).slice(0,300)}` });
      }
    }catch(err){
      let msg = '网络错误';
      try{ msg = (err && err.errMsg) || String(err); }catch{}
      this.setData({ testResult: msg });
    }
  }
});


