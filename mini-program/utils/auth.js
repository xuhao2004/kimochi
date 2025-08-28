// utils/auth.js
import { http } from './http';
export function loginWeapp(nickname, avatarUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const doLogin = (profile = {}) => {
      wx.login({
        success: ({ code }) => {
          const payload = {
            code,
            nickname: nickname || profile.nickName || '小程序用户',
            avatarUrl: avatarUrl || profile.avatarUrl || ''
          };
          http('/api/auth/weapp/login', { method: 'POST', data: payload })
            .then(res => {
              if (res.statusCode === 200 && res.data?.token) {
                wx.setStorageSync('token', res.data.token);
                resolve(res.data); // { token, user }
              } else reject(res.data);
            })
            .catch(reject);
        },
        fail: reject
      });
    };

    // 可选：当 options.promptProfile=true 时尝试拉取用户资料用于昵称/头像同步
    if (options.promptProfile) {
      wx.getUserProfile({
        desc: '用于完善资料（同步微信昵称与头像）',
        success: (res) => doLogin(res.userInfo || {}),
        fail: () => doLogin({})
      });
    } else {
      doLogin({});
    }
  });
}