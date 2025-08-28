'use client';

import React, { useEffect, useState } from 'react';

type StickerItem = { url: string; name: string };
type StickerCategory = { name: string; items: StickerItem[] };
type StickerPack = { name: string; categories: StickerCategory[] };
type StickerManifest = { packs: StickerPack[] };

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  variant?: 'modal' | 'sheet' | 'inline';
}

export default function StickerPicker({ isOpen, onClose, onSelect, title = '选择表情', variant = 'modal' }: StickerPickerProps) {
  const [manifest, setManifest] = useState<StickerManifest | null>(null);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  // 将任意输入 URL 规范化为 PNG 且优先使用归一化后的路径
  const toPngNormalized = (url: string): string => {
    if (!url) return url;
    let u = url;
    // 1) 强制使用 .png 后缀
    u = u.replace(/\.svg(\?.*)?$/i, '.png');
    // 2) 将 /stickers/ 替换为 /stickers-normalized/ 优先使用规范化资源
    u = u.replace(/^\/stickers\//, '/stickers-normalized/');
    return u;
  };

  // 回退到原始 /stickers/ 下的 PNG（当规范化资源不存在时）
  const toPngOriginal = (url: string): string => {
    if (!url) return url;
    let u = url;
    u = u.replace(/\.svg(\?.*)?$/i, '.png');
    u = u.replace(/^\/stickers-normalized\//, '/stickers/');
    return u;
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // 优先加载归一化后的清单，若不存在则回退到原始清单
        const candidates = ['/stickers-normalized/manifest.json', '/stickers/manifest.json'];
        let loaded: StickerManifest | null = null;
        for (const url of candidates) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            loaded = (await res.json()) as StickerManifest;
            break;
          } catch {}
        }

        if (!loaded) throw new Error('manifest not found');
        if (cancelled) return;
        setManifest(loaded);
        const firstPack = loaded.packs?.[0]?.name || null;
        setActivePack(prev => prev || firstPack);
        const firstCat = loaded.packs?.[0]?.categories?.[0]?.name || null;
        setActiveCategory(prev => prev || firstCat);
      } catch {
        setError('加载表情清单失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const fav = localStorage.getItem('sticker-favorites');
      if (fav) {
        const parsed: string[] = JSON.parse(fav);
        const normalizedList = parsed.map(toPngNormalized).filter((u) => u.toLowerCase().endsWith('.png'));
        setFavorites(normalizedList);
        localStorage.setItem('sticker-favorites', JSON.stringify(normalizedList));
      }
    } catch {}
    try {
      const r = localStorage.getItem('sticker-recents');
      if (r) {
        const parsed: string[] = JSON.parse(r);
        const normalizedList = parsed.map(toPngNormalized).filter((u) => u.toLowerCase().endsWith('.png'));
        setRecents(normalizedList);
        localStorage.setItem('sticker-recents', JSON.stringify(normalizedList));
      }
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activePack) {
      if (recents.length > 0) {
        setActivePack('recent');
        setActiveCategory('all');
      } else if (favorites.length > 0) {
        setActivePack('favorites');
        setActiveCategory('all');
      }
    }
  }, [isOpen, recents, favorites, activePack]);

  const toggleFavorite = (url: string) => {
    url = toPngNormalized(url);
    setFavorites(prev => {
      const exists = prev.includes(url);
      const next = exists ? prev.filter(u => u !== url) : [url, ...prev].slice(0, 200);
      try { localStorage.setItem('sticker-favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const recordRecent = (url: string) => {
    url = toPngNormalized(url);
    setRecents(prev => {
      const next = [url, ...prev.filter(u => u !== url)].slice(0, 200);
      try { localStorage.setItem('sticker-recents', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  if (!isOpen) return null;

  const packs = manifest?.packs || [];
  const toItems = (list: string[]): StickerItem[] =>
    list
      .map(toPngNormalized)
      .filter(u => u.toLowerCase().endsWith('.png'))
      .map(u => ({ url: u, name: (u.split('/').pop() || 'sticker') }));
  const syntheticPacks: StickerPack[] = [
    { name: 'recent', categories: [{ name: 'all', items: toItems(recents) }] },
    { name: 'favorites', categories: [{ name: 'all', items: toItems(favorites) }] },
  ];
  const allPacks: StickerPack[] = [...syntheticPacks, ...packs];
  const currentPack = allPacks.find(p => p.name === activePack) || null;
  const categories = currentPack?.categories || [];
  const currentCategory = categories.find(c => c.name === activeCategory) || null;
  let items = currentCategory?.items || [];
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }

  if (variant === 'sheet') {
    return (
      <div id="chat-bottom-panel" className="absolute inset-x-0 bottom-0 z-[10003] animate-[panelIn_300ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="mx-auto max-w-4xl">
          <div className="bg-white rounded-t-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.08)] border border-black/[0.06]">
            <div className="flex items-center justify-center py-2">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="font-semibold text-gray-800">{title}</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="关闭">
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 pt-1 space-y-3">
              {loading && <div className="p-6 text-center text-gray-500">加载中...</div>}
              {error && <div className="p-6 text-center text-red-500">{error}</div>}
              {!loading && !error && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="搜索文件名..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => { setActivePack('favorites'); setActiveCategory('all'); }}
                      className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'favorites' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      ★ 收藏 {favorites.length > 0 ? `(${favorites.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActivePack('recent'); setActiveCategory('all'); }}
                      className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      ⏱ 最近 {recents.length > 0 ? `(${recents.length})` : ''}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {allPacks.map(pack => (
                      <button
                        key={pack.name}
                        onClick={() => { setActivePack(pack.name); const fc = pack.categories?.[0]?.name || null; setActiveCategory(fc); }}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activePack === pack.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {pack.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map(cat => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap ${activeCategory === cat.name ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-6 gap-3 p-1 max-h-[38vh] sm:max-h-[46vh] overflow-y-auto">
                    {items
                      .filter((i) => typeof i.url === 'string' && i.url.toLowerCase().endsWith('.png'))
                      .map(item => {
                        const primary = toPngNormalized(item.url);
                        const fallback = toPngOriginal(item.url);
                        return (
                          <div key={item.url} className="relative group">
                            <button
                              onClick={() => { const u = toPngNormalized(item.url); onSelect(u); recordRecent(u); onClose(); }}
                              className="w-full aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow flex items-center justify-center p-1.5"
                              title={item.name}
                            >
                              <img
                                src={primary}
                                alt={item.name}
                                onError={(e) => { const img = e.currentTarget as HTMLImageElement; if ((img as any)._triedFallback) return; (img as any)._triedFallback = true; img.src = fallback; }}
                                className="block w-full h-full object-contain object-center select-none pointer-events-none"
                              />
                            </button>
                            <button
                              aria-label={favorites.includes(item.url) ? '取消收藏' : '收藏'}
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(item.url); }}
                              className={`absolute top-1 right-1 w-7 h-7 rounded-full text-xs font-bold shadow-sm flex items-center justify-center ${favorites.includes(item.url) ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                            >
                              {favorites.includes(item.url) ? '★' : '☆'}
                            </button>
                          </div>
                        );
                    })}
                    {items.length === 0 && (
                      <div className="col-span-full text-center text-gray-500 py-8">暂无表情</div>
                    )}
                  </div>
                  <div className="safe-area-bottom h-3" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="w-full">
        <div className="px-1 space-y-3">
          {loading && <div className="p-4 text-center text-gray-500">加载中...</div>}
          {error && <div className="p-4 text-center text-red-500">{error}</div>}
          {!loading && !error && (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="搜索文件名..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => { setActivePack('favorites'); setActiveCategory('all'); }}
                  className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'favorites' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  ★ 收藏 {favorites.length > 0 ? `(${favorites.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePack('recent'); setActiveCategory('all'); }}
                  className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  ⏱ 最近 {recents.length > 0 ? `(${recents.length})` : ''}
                </button>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {allPacks.map(pack => (
                  <button
                    key={pack.name}
                    onClick={() => { setActivePack(pack.name); const fc = pack.categories?.[0]?.name || null; setActiveCategory(fc); }}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activePack === pack.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {pack.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap ${activeCategory === cat.name ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 md:grid-cols-6 gap-3 p-1">
                {items
                  .filter((i) => typeof i.url === 'string' && i.url.toLowerCase().endsWith('.png'))
                  .map(item => {
                    const primary = toPngNormalized(item.url);
                    const fallback = toPngOriginal(item.url);
                    return (
                      <div key={item.url} className="relative group">
                        <button
                          onClick={() => { const u = toPngNormalized(item.url); onSelect(u); recordRecent(u); onClose(); }}
                          className="w-full aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow flex items-center justify-center p-1.5"
                          title={item.name}
                        >
                          <img
                            src={primary}
                            alt={item.name}
                            onError={(e) => { const img = e.currentTarget as HTMLImageElement; if ((img as any)._triedFallback) return; (img as any)._triedFallback = true; img.src = fallback; }}
                            className="block w-full h-full object-contain object-center select-none pointer-events-none"
                          />
                        </button>
                        <button
                          aria-label={favorites.includes(item.url) ? '取消收藏' : '收藏'}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.url); }}
                          className={`absolute top-1 right-1 w-7 h-7 rounded-full text-xs font-bold shadow-sm flex items-center justify-center ${favorites.includes(item.url) ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                        >
                          {favorites.includes(item.url) ? '★' : '☆'}
                        </button>
                      </div>
                    );
                })}
                {items.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">暂无表情</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-black/10" style={{ animation: 'dialogBounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div className="font-semibold text-gray-800">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="关闭">
            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-4 pt-3 space-y-3">
          {loading && (
            <div className="p-6 text-center text-gray-500">加载中...</div>
          )}
          {error && (
            <div className="p-6 text-center text-red-500">{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* 搜索与收藏/最近入口 */}
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="搜索文件名..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => { setActivePack('favorites'); setActiveCategory('all'); }}
                  className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'favorites' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  ★ 收藏 {favorites.length > 0 ? `(${favorites.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePack('recent'); setActiveCategory('all'); }}
                  className={`px-3 py-1.5 rounded-full text-sm ${activePack === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  ⏱ 最近 {recents.length > 0 ? `(${recents.length})` : ''}
                </button>
              </div>

              {/* 包选择 */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {allPacks.map(pack => (
                  <button
                    key={pack.name}
                    onClick={() => {
                      setActivePack(pack.name);
                      const fc = pack.categories?.[0]?.name || null;
                      setActiveCategory(fc);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activePack === pack.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {pack.name}
                  </button>
                ))}
              </div>

              {/* 类别选择 */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap ${activeCategory === cat.name ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* 网格 */}
              <div className="grid grid-cols-5 md:grid-cols-6 gap-3 p-1 max-h-[50vh] overflow-y-auto">
                {items
                  .filter((i) => typeof i.url === 'string' && i.url.toLowerCase().endsWith('.png'))
                  .map(item => {
                    const primary = toPngNormalized(item.url);
                    const fallback = toPngOriginal(item.url);
                    return (
                      <div key={item.url} className="relative group">
                        <button
                          onClick={() => { const u = toPngNormalized(item.url); onSelect(u); recordRecent(u); onClose(); }}
                          className="w-full aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow flex items-center justify-center p-1.5"
                          title={item.name}
                        >
                          <img
                            src={primary}
                            alt={item.name}
                            onError={(e) => { const img = e.currentTarget as HTMLImageElement; if ((img as any)._triedFallback) return; (img as any)._triedFallback = true; img.src = fallback; }}
                            className="block w-full h-full object-contain object-center select-none pointer-events-none"
                          />
                        </button>
                        <button
                          aria-label={favorites.includes(item.url) ? '取消收藏' : '收藏'}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.url); }}
                          className={`absolute top-1 right-1 w-7 h-7 rounded-full text-xs font-bold shadow-sm flex items-center justify-center ${favorites.includes(item.url) ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                        >
                          {favorites.includes(item.url) ? '★' : '☆'}
                        </button>
                      </div>
                    );
                })}
                {items.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">暂无表情</div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="h-3" />
      </div>
    </div>
  );
}


