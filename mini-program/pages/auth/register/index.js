import { http } from '../../../utils/http';
import { showError, showSuccess } from '../../../utils/toast';

Page({
  data: {
    reg: { name: '', gender: '', birthDate: '' },
    genders: ['男','女','不方便透露'],
    emailReg: { identifier: '', password: '', code: '' },
    sendingEmailCode: false,
  },
  onRegName(e){ this.setData({ 'reg.name': e.detail.value }); },
  onRegGender(e){ const idx = Number(e.detail.value||0); this.setData({ 'reg.gender': this.data.genders[idx] }); },
  onRegBirth(e){ this.setData({ 'reg.birthDate': e.detail.value }); },

  onEmailIdentifier(e){ this.setData({ 'emailReg.identifier': e.detail.value }); },
  onEmailPassword(e){ this.setData({ 'emailReg.password': e.detail.value }); },
  onEmailCode(e){ this.setData({ 'emailReg.code': e.detail.value }); },
  // 移除手机号注册入口

  async sendEmailCode(){
    const email = (this.data.emailReg.identifier||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('请输入有效邮箱'); return; }
    try{
      this.setData({ sendingEmailCode: true });
      const res = await http('/api/auth/email/request-code', { method: 'POST', data: { email, purpose: 'email_register' } });
      if(res.statusCode===200){ showSuccess('验证码已发送'); }
      else { showError(res.data?.error || '发送失败'); }
    }catch{ showError('网络错误'); }
    finally { this.setData({ sendingEmailCode: false }); }
  },

  async doEmailRegister(){
    const { name, gender, birthDate } = this.data.reg;
    const { identifier, password, code } = this.data.emailReg;
    if(!name || !gender || !birthDate){ showError('请完善基本信息'); return; }
    if(!identifier || !password || !code){ showError('请填写邮箱、密码与验证码'); return; }
    try{
      const r = await http('/api/auth/register', { method:'POST', data:{ name, gender, birthDate, identifier, password, code, channel: 'email', source: 'weapp' } });
      if(r.statusCode===200){
        showSuccess('注册成功');
        const l = await http('/api/auth/login', { method:'POST', data:{ identifier, password } });
        if (l.statusCode===200 && l.data?.token){
          wx.setStorageSync('token', l.data.token);
          // 已用邮箱注册：securityEmail 已设置，无需强制弹窗
          wx.reLaunch({ url:'/pages/index/index' });
        }
        else { wx.navigateBack({ delta: 1 }); }
      } else showError(r.data?.error || '注册失败');
    }catch{ showError('网络错误'); }
  },
  
});


