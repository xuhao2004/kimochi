import { http } from '../../utils/http';
import { showError, showSuccess } from '../../utils/toast';

Page({
  data: { sentence: '', log: '' },
  async onShow(){
    try{
      const r = await http('/api/daily');
      if(r.statusCode===200){ this.setData({ sentence: r.data?.sentence || '' }); }
    }catch(e){ this.setData({ log: JSON.stringify(e) }); }
  },
  async onPullDownRefresh(){
    try{
      const r = await http('/api/daily');
      if(r.statusCode===200){ this.setData({ sentence: r.data?.sentence || '' }); }
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  async generate(){
    try{
      const r = await http('/api/daily', { method:'POST' });
      if(r.statusCode===200){ this.setData({ sentence: r.data?.sentence || '' }); showSuccess('已生成'); }
      else { showError(r.data?.error || '生成失败'); }
    }catch{ showError('网络错误'); }
  },
  async favorite(){
    if(!this.data.sentence) return;
    try{ await http('/api/daily/favorites', { method:'POST', data:{ sentence: this.data.sentence } }); showSuccess('已收藏'); }catch{ showError('失败'); }
  },
  goFavorites(){ wx.navigateTo({ url: '/pages/daily/favorites/index' }); },
  async sharePoster(){
    if(!this.data.sentence) return;
    try{
      const query = wx.createSelectorQuery();
      query.select('#poster').fields({ node: true, size: true }).exec(async (res)=>{
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = 600 * dpr / 2;
        canvas.height = 900 * dpr / 2;
        ctx.scale(dpr/2, dpr/2);
        // 背景
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,600,900);
        // 标题
        ctx.fillStyle = '#111'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('今日 · 心语', 32, 64);
        // 内容自动换行
        ctx.fillStyle = '#333'; ctx.font = '20px sans-serif';
        const text = this.data.sentence;
        const maxWidth = 536; let x=32, y=110, lineHeight=30; let line='';
        for (const ch of text){
          const test = line + ch; const w = ctx.measureText(test).width;
          if (w > maxWidth){ ctx.fillText(line, x, y); line=ch; y+=lineHeight; }
          else { line = test; }
        }
        if(line) ctx.fillText(line, x, y);
        // 署名
        ctx.fillStyle = '#888'; ctx.font = '16px sans-serif'; ctx.fillText('kimochi心晴', 32, 860);
        const temp = canvas.toDataURL('image/png');
        const fspath = `${wx.env.USER_DATA_PATH}/poster_${Date.now()}.png`;
        const fs = wx.getFileSystemManager();
        const data = temp.split(',')[1];
        fs.writeFile({ filePath: fspath, data, encoding:'base64', success:()=>{
          wx.saveImageToPhotosAlbum({ filePath: fspath, success:()=>showSuccess('已保存到相册'), fail:()=>showError('保存失败') });
        }, fail:()=> showError('生成失败') });
      });
    }catch{ showError('生成失败'); }
  }
});


