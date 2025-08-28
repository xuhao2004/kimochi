// pages/profile/index.js
import { http, getResolvedApiBase } from '../../utils/http';
import { loginWeapp } from '../../utils/auth';
import { showError, showSuccess } from '../../utils/toast';

Page({
  data: {
    log: '',
    form: { name: '', nickname:'', email: '', personalEmail: '', contactPhone: '', securityEmail: '', securityEmailCode: '', securityEmailExempt: false, gender:'', birthDate:'', office:'' },
    weapp: { bound: false, nickname: '', openid: '' },
    avatarUrl: '',
    userTag: '',
    canEdit: false,
    sendingSecEmail: false,
    accountType: '',
    isSuperAdmin: false,
    pendingNameChangeTo: '',
    genderOptions: ['男','女','不方便透露'],
    genderIndex: 0,
    // 开发特性开关与面板状态
    devFeatures: false,
    changeSecOpen: false,
    changeSec: { newEmail: '', oldCode: '', newCode: '', sendingOld: false, sendingNew: false, submitting: false },
    exempt: { applying: false, list: [] },
    exemptReason: ''
  },

  async ensureLogin() {
    if (!wx.getStorageSync('token')) {
      wx.reLaunch({ url: '/pages/auth/index' });
      throw new Error('未登录');
    }
  },
  toggleEdit(){ this.setData({ canEdit: !this.data.canEdit }); },

  async onShow() {
    await this.ensureLogin();
    // 默认查看模式；仅当带 ?force=1 明示进入编辑
    const pages = getCurrentPages();
    const curr = pages[pages.length - 1];
    const force = curr?.options?.force;
    this.setData({ canEdit: !!force });
    // 计算开发特性是否启用
    try {
      const base = getResolvedApiBase();
      const enableByDomain = /dev\.kimochi\.space/i.test(base) || /127\.0\.0\.1:3(000|001)/.test(base);
      const flag = !!wx.getStorageSync('ENABLE_DEV_FEATURES');
      let isDevtools = false; try { isDevtools = (wx.getSystemInfoSync().platform === 'devtools'); } catch {}
      this.setData({ devFeatures: enableByDomain || flag || isDevtools });
    } catch { this.setData({ devFeatures: false }); }
    this.refreshProfile();
  },

  async refreshProfile() {
    try {
      const res = await http('/api/profile');
      if (res.statusCode === 200 && res.data?.user) {
        const u = res.data.user;
        const rawOpenId = u.weappOpenId || u.wechatOpenId || '';
        const mask = (s)=> s ? (s.length > 12 ? (s.slice(0,6) + '****' + s.slice(-4)) : '已绑定') : '';
        const maskEmail = (em)=>{
          if(!em) return '';
          const parts = String(em).split('@');
          if(parts.length!==2) return '***@***';
          const [user, domain] = parts;
          const uMask = user.length<=2 ? user[0] + '*' : user.slice(0,2) + '***';
          const dMask = domain.replace(/^[^\.]+/, (m)=> m.length<=2? m[0]+'*' : m.slice(0,2)+'***');
          return `${uMask}@${dMask}`;
        };
        // 生成用户标签
        const tag = (()=>{
          if (u.isSuperAdmin) return '超级管理员';
          if (u.isAdmin || u.accountType === 'admin') return '管理员';
          if (u.accountType === 'teacher') return '教师';
          if (u.accountType === 'student') return '学生';
          if (u.accountType === 'self') return '个人';
          return '用户';
        })();

        this.setData({
          form: {
            name: u.name || '',
            nickname: u.nickname || '',
            email: u.email || '',
            personalEmail: u.personalEmail || '',
            contactPhone: u.contactPhone || '',
            securityEmail: u.securityEmail || '',
            securityEmailMasked: maskEmail(u.securityEmail||''),
            securityEmailCode: '',
            securityEmailExempt: !!u.securityEmailExempt,
            gender: u.gender || '',
            birthDate: (u.birthDate? String(u.birthDate).slice(0,10) : ''),
            office: u.office || ''
          },
          weapp: {
            bound: !!rawOpenId,
            nickname: u.nickname || u.name || '',
            openid: rawOpenId,
            openidMasked: mask(rawOpenId)
          },
          avatarUrl: u.profileImage || '' ,
          userTag: tag,
          accountType: u.accountType || '',
          isSuperAdmin: !!u.isSuperAdmin,
          pendingNameChangeTo: u.pendingNameChangeTo || '',
          genderIndex: Math.max(0, ['男','女','不方便透露'].indexOf(u.gender||'男')),
          log: '已加载'
        });
      } else {
        this.setData({ log: '拉取失败：' + JSON.stringify(res.data) });
      }
    } catch (e) {
      this.setData({ log: '请求失败：' + JSON.stringify(e) });
    }
  },

  onInputName(e){ this.setData({ 'form.name': e.detail.value }); },
  onInputEmail(e){ this.setData({ 'form.email': e.detail.value }); },
  onInputNickname(e){ this.setData({ 'form.nickname': e.detail.value }); },
  
  onInputPEmail(e){ this.setData({ 'form.personalEmail': e.detail.value }); },
  onInputCPhone(e){ this.setData({ 'form.contactPhone': e.detail.value }); },
  onInputOffice(e){ this.setData({ 'form.office': e.detail.value }); },
  onInputSecurityEmail(e){ this.setData({ 'form.securityEmail': e.detail.value }); },
  onInputSecurityEmailCode(e){ this.setData({ 'form.securityEmailCode': e.detail.value }); },
  onGenderPicker(e){ const idx = Number(e.detail.value||0); const v = this.data.genderOptions[idx]||''; this.setData({ genderIndex: idx, 'form.gender': v }); },
  onBirthDateChange(e){ this.setData({ 'form.birthDate': e.detail.value }); },

  // 开发：变更密保邮箱面板控制与输入
  toggleChangePanel(){ this.setData({ changeSecOpen: !this.data.changeSecOpen }); },
  onInputNewSecurityEmail(e){ this.setData({ 'changeSec.newEmail': e.detail.value }); },
  onInputOldSecurityEmailCode(e){ this.setData({ 'changeSec.oldCode': e.detail.value }); },
  onInputNewSecurityEmailCode(e){ this.setData({ 'changeSec.newCode': e.detail.value }); },

  async sendOldSecurityEmailCode(){
    if (!this.data.form.securityEmail) { showError('当前未设置旧密保邮箱'); return; }
    try{
      this.setData({ 'changeSec.sendingOld': true });
      const r = await http('/api/security-email/change/request-code', { method: 'POST', data: { target: 'old' } });
      if (r.statusCode===200){ showSuccess('旧邮箱验证码已发送'); }
      else { showError(r.data?.error || '发送失败'); }
    }catch{ showError('网络错误'); }
    finally{ this.setData({ 'changeSec.sendingOld': false }); }
  },

  async sendNewSecurityEmailCode(){
    const email = (this.data.changeSec.newEmail||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('请输入有效的新密保邮箱'); return; }
    try{
      this.setData({ 'changeSec.sendingNew': true });
      const r = await http('/api/security-email/change/request-code', { method: 'POST', data: { target: 'new', newEmail: email } });
      if (r.statusCode===200){ showSuccess('新邮箱验证码已发送'); }
      else { showError(r.data?.error || '发送失败'); }
    }catch{ showError('网络错误'); }
    finally{ this.setData({ 'changeSec.sendingNew': false }); }
  },

  async submitSecurityEmailChange(){
    const email = (this.data.changeSec.newEmail||'').trim();
    const oldCode = (this.data.changeSec.oldCode||'').trim();
    const newCode = (this.data.changeSec.newCode||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('请输入有效的新密保邮箱'); return; }
    if(!newCode){ showError('请输入新邮箱验证码'); return; }
    try{
      this.setData({ 'changeSec.submitting': true });
      const payload = { newEmail: email, newCode };
      if (this.data.form.securityEmail) { payload.oldCode = oldCode; }
      const r = await http('/api/security-email/change', { method: 'POST', data: payload });
      if (r.statusCode===200){
        showSuccess(r.data?.message || '已提交');
        this.setData({ changeSecOpen:false, changeSec:{ newEmail:'', oldCode:'', newCode:'', sendingOld:false, sendingNew:false, submitting:false } });
        await this.refreshProfile();
      } else {
        showError(r.data?.error || '提交失败');
      }
    }catch{ showError('网络错误'); }
    finally{ this.setData({ 'changeSec.submitting': false }); }
  },

  // 开发：豁免申请
  onInputExemptReason(e){ this.setData({ exemptReason: e.detail.value }); },
  async applyExempt(){
    if (this.data.form.securityEmailExempt) { showError('您已获得豁免'); return; }
    try{
      this.setData({ 'exempt.applying': true });
      const r = await http('/api/security-email/exempt', { method: 'POST', data: { reason: this.data.exemptReason || null } });
      if (r.statusCode===200){ showSuccess('申请已提交'); this.setData({ exemptReason:'' }); this.loadExemptRequests(); }
      else { showError(r.data?.error || '提交失败'); }
    }catch{ showError('网络错误'); }
    finally{ this.setData({ 'exempt.applying': false }); }
  },
  async loadExemptRequests(){
    try{
      const r = await http('/api/security-email/exempt');
      if (r.statusCode===200 && r.data?.requests){
        // 简要格式化时间字符串
        const list = (r.data.requests||[]).map(x=>({ ...x, createdAt: (new Date(x.createdAt)).toLocaleString() }));
        this.setData({ 'exempt.list': list });
      }
    }catch{}
  },

  async saveProfile() {
    try {
      const res = await http('/api/profile/update', { method: 'POST', data: this.data.form });
      if (res.statusCode === 200) {
        showSuccess('已保存');
        this.refreshProfile();
      } else {
        // 若后端要求走姓名申请流程，提示并引导
        const err = res.data?.error || '保存失败';
        if (/姓名需通过申请变更/.test(err)) {
          const r = await wx.showModal({ title:'姓名变更', content:'姓名一年仅能修改一次，需提交申请并由超级管理员审核。是否现在提交申请？', confirmText:'去申请', cancelText:'取消' });
          if (r.confirm) {
            try {
              const req = await http('/api/profile/name-change', { method: 'POST', data: { newName: this.data.form.name, reason: '个人信息完善：申请更改姓名' } });
              if (req.statusCode===200) { showSuccess('申请已提交'); this.refreshProfile(); }
              else { showError(req.data?.error || '申请失败'); }
            } catch { showError('网络错误'); }
          }
        } else {
          showError(err);
        }
      }
    } catch(e) {
      showError('网络错误');
    }
  },
  async sendSecurityEmailCode(){
    const email = (this.data.form.securityEmail||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('请输入有效密保邮箱'); return; }
    try{
      this.setData({ sendingSecEmail: true });
      const r = await http('/api/auth/email/request-code', { method: 'POST', data: { email, purpose: 'security_email' } });
      if (r.statusCode===200) { showSuccess('验证码已发送'); }
      else { showError(r.data?.error || '发送失败'); }
    }catch{ showError('网络错误'); }
    finally{ this.setData({ sendingSecEmail: false }); }
  },

  async bindWeapp(){
    try {
      // 获取用户信息仅用于昵称与头像同步（无需强制授权窗口，这里尝试使用开放数据接口或回退空）
      let nickname = '';
      let avatarUrl = '';
      try {
        const profile = await new Promise((resolve, reject)=>{
          wx.getUserProfile({ desc: '用于完善资料（同步微信昵称与头像）', success: resolve, fail: reject });
        });
        nickname = profile?.userInfo?.nickName || '';
        avatarUrl = profile?.userInfo?.avatarUrl || '';
      } catch(_) {}

      const codeRes = await new Promise((resolve, reject)=> wx.login({ success: resolve, fail: reject }));
      const code = codeRes.code;
      const bindRes = await http('/api/auth/weapp/bind', { method: 'POST', data: { code, nickname, avatarUrl } });
      if (bindRes.statusCode === 200) {
        showSuccess('绑定成功');
        // 绑定后若当前用户没有头像，服务端已按需补全；这里刷新资料即可
        await this.refreshProfile();
      } else {
        showError(bindRes.data?.error || '绑定失败');
      }
    } catch (e) {
      showError('绑定出错');
    }
  }
  ,
  async rebindWithOTP(){ showError('验证码功能已移除，请直接使用“重新绑定”'); }
  ,
  async confirmUnbindWeapp(){
    const res = await wx.showModal({ title:'确认解绑', content:'解绑后将无法使用当前微信进行一键登录，确定解绑吗？', confirmText:'解绑', cancelText:'取消' });
    if (!res.confirm) return;
    try {
      const r = await http('/api/auth/weapp/unbind', { method: 'POST' });
      if (r.statusCode === 200) {
        showSuccess('已解绑');
        this.refreshProfile();
      } else {
        showError(r.data?.error || '解绑失败');
      }
    } catch (e) {
      showError('解绑失败');
    }
  },
  async rebindWeapp(){
    // 直接走绑定流程
    await this.bindWeapp();
  },
  async chooseAndUploadAvatar(){
    try {
      const choose = await new Promise((resolve, reject)=> wx.chooseMedia({ count:1, mediaType:['image'], success: resolve, fail: reject }));
      const file = choose.tempFiles && choose.tempFiles[0];
      if(!file){ return; }
      const token = wx.getStorageSync('token');
      await new Promise((resolve, reject)=>{
        const base = getResolvedApiBase();
        wx.uploadFile({
          url: base.replace(/\/$/, '') + '/api/upload-avatar',
          filePath: file.tempFilePath,
          name: 'avatar',
          header: { Authorization: `Bearer ${token}` },
          success: (res)=>{
            try{ const data = JSON.parse(res.data||'{}'); if(data.profileImage){ this.setData({ avatarUrl: data.profileImage }); } }catch{}
            resolve(res);
          },
          fail: reject
        });
      });
      showSuccess('头像已更新');
    } catch { showError('头像更新失败'); }
  },
  async onChooseAvatar(e){
    try{
      const filePath = e?.detail?.avatarUrl || '';
      if(!filePath){ showError('未获取到微信头像'); return; }
      const token = wx.getStorageSync('token');
      await new Promise((resolve, reject)=>{
        const base = getResolvedApiBase();
        wx.uploadFile({
          url: base.replace(/\/$/, '') + '/api/upload-avatar',
          filePath,
          name: 'avatar',
          header: { Authorization: `Bearer ${token}` },
          success: (res)=>{
            try{ const data = JSON.parse(res.data||'{}'); if(data.profileImage){ this.setData({ avatarUrl: data.profileImage }); } }catch{}
            resolve(res);
          },
          fail: reject
        });
      });
      showSuccess('头像已更新');
    }catch{ showError('头像更新失败'); }
  },
  async resetAvatar(){
    try{
      const token = wx.getStorageSync('token');
      const res = await new Promise((resolve, reject)=>{
        const base = getResolvedApiBase();
        wx.request({ url: base.replace(/\/$/, '') + '/api/upload-avatar', method:'DELETE', header:{ Authorization:`Bearer ${token}` }, success: resolve, fail: reject });
      });
      if(res.statusCode===200){ this.setData({ avatarUrl: '' }); showSuccess('已重置'); }
      else { showError(res.data?.error || '重置失败'); }
    }catch{ showError('网络错误'); }
  },
  openAvatarEditor(){ wx.showToast({ title: '已移除高级头像功能', icon: 'none' }); },
  async onGetPhoneNumber(e){
    try {
      const detail = e.detail || {};
      if (detail.errMsg && !/ok$/i.test(detail.errMsg)) { showError('未授权手机号'); return; }
      // 仅保留新版：直接提供 code
      if (detail.code) {
        const res = await http('/api/weapp/phone', { method: 'POST', data: { code: detail.code } });
        if (res.statusCode === 200) {
          const phone = (res.data?.phoneNumber||'').trim();
          if (phone) { this.setData({ 'form.contactPhone': phone }); showSuccess('已填入联系电话'); }
          else { showError('未获取到手机号'); }
        } else { showError(res.data?.error || '获取失败'); }
        return;
      }
      showError('未获取到手机号凭证');
    } catch (err) {
      showError('操作失败');
    }
  }
});