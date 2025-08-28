export function showSuccess(msg) {
  wx.showToast({ title: msg, icon: 'success' });
}
export function showError(msg) {
  wx.showToast({ title: msg, icon: 'none' });
}

