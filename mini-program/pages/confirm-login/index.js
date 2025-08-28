import { http } from '../../utils/http';
import { loginWeapp } from '../../utils/auth';
import { showError, showSuccess } from '../../utils/toast';

Page({
  data: { nonce: '', log: '' },
  onLoad(options){
    if(options && options.nonce){
      this.setData({ nonce: decodeURIComponent(options.nonce) });
    }
  },
  onInput(e){ this.setData({ nonce: e.detail.value }); },
  async ensureLogin(){ if(!wx.getStorageSync('token')) await loginWeapp('', '', { promptProfile: true }); },
  async onConfirm(){
    try {
      await this.ensureLogin();
      const nonce = (this.data.nonce || '').trim();
      if(!nonce){ showError('请先填写登录码'); return; }
      const r = await http('/api/auth/qr-login/confirm', { method: 'POST', data: { nonce } });
      if(r.statusCode === 200){ showSuccess('已确认'); this.setData({ log: '确认成功，请回到网页完成登录' }); }
      else { showError(r.data?.error || '确认失败'); this.setData({ log: JSON.stringify(r.data) }); }
    } catch(e){ showError('网络错误'); this.setData({ log: JSON.stringify(e) }); }
  }
  ,
  async onConfirmBind(){
    try {
      // 绑定流程：不要求已有 weapp token，只需要 wx.login code
      if(!this.data.nonce){ showError('请先填写绑定码'); return; }
      const { code } = await new Promise((resolve, reject)=> wx.login({ success: resolve, fail: reject }));
      if(!code){ showError('获取 code 失败'); return; }
      const r = await http('/api/auth/weapp/qr-bind/confirm', { method: 'POST', data: { nonce: this.data.nonce, code } });
      if(r.statusCode===200){ showSuccess('已确认，请在网站完成绑定'); this.setData({ log: '已确认绑定，请在网站端点击“完成绑定”' }); }
      else { showError(r.data?.error || '确认失败'); this.setData({ log: JSON.stringify(r.data) }); }
    } catch(e){ showError('网络错误'); this.setData({ log: JSON.stringify(e) }); }
  }
  
});


