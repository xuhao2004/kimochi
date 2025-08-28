// app.js
App({
  onLaunch() {
    // 兜底：在首次启动时创建 miniprogramLog 目录与 log[0-2] 空文件，避免真机调试读取失败
    try {
      const fs = wx.getFileSystemManager()
      const baseDir = `${wx.env.USER_DATA_PATH}/miniprogramLog`
      try {
        fs.mkdirSync(baseDir, true)
      } catch (e) {
        // ignore
      }
      // 开发者工具和部分基座会访问 log0~log9，统一创建
      const names = Array.from({ length: 10 }).map((_, i) => `log${i}`)
      names.forEach((name) => {
        const filePath = `${baseDir}/${name}`
        try {
          fs.accessSync(filePath)
        } catch (e) {
          try {
            fs.writeFileSync(filePath, '', 'utf8')
          } catch (e2) {
            // ignore
          }
        }
      })
    } catch (e) {
      // ignore
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
