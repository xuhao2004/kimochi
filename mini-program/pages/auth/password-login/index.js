import { http } from '../../../utils/http';
import { showError, showSuccess } from '../../../utils/toast';

Page({
  data: { login: { identifier: '', password: '' } },
  onLoginId(e){ this.setData({ 'login.identifier': e.detail.value }); },
  onLoginPwd(e){ this.setData({ 'login.password': e.detail.value }); },
  async doPasswordLogin(){
    const { identifier, password } = this.data.login;
    if(!identifier || !password){ showError('请填写账号与密码'); return; }
    try{
      const r = await http('/api/auth/login', { method:'POST', data:{ identifier, password } });
      if (r.statusCode===200 && r.data?.token){
        wx.setStorageSync('token', r.data.token);
        // 登录成功后：检查该账号是否已绑定小程序微信
        // 登录后不再自动绑定，统一在个人中心手动绑定，保持体验一致
        wx.reLaunch({ url: '/pages/index/index' });
      } else showError(r.data?.error || '登录失败');
    }catch{ showError('网络错误'); }
  },
  goConfirmLogin(){ wx.navigateTo({ url: '/pages/confirm-login/index' }); },
});


