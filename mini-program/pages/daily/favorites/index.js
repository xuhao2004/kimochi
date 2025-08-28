import { http } from '../../../utils/http';
import { showError, showSuccess } from '../../../utils/toast';

Page({
  data: { items: [] },
  async onShow(){
    try{
      const r = await http('/api/daily/favorites');
      if(r.statusCode===200){
        const list = (r.data?.favorites||[]).map(x=>({ ...x, _createdAt: x.createdAt? new Date(x.createdAt).toLocaleString(): '' }));
        this.setData({ items: list });
      }
    }catch{ showError('加载失败'); }
  },
  async remove(e){
    const id = e.currentTarget.dataset.id;
    try{ await http(`/api/daily/favorites?id=${encodeURIComponent(id)}`, { method:'DELETE' }); showSuccess('已移除'); this.onShow(); }catch{ showError('失败'); }
  }
});


