import React, { useState } from 'react';
import { X, Sparkles, Search, Layers, Image, Check, Plus, Flame, Snowflake, Ghost } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const HolidayAssetLibraryModal: React.FC = () => {
  const { isHolidayAssetModalOpen, setIsHolidayAssetModalOpen } = useProjectionStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Halloween' | 'Christmas' | 'Shaders' | 'Decals'>('All');
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  if (!isHolidayAssetModalOpen) return null;

  const ASSETS = [
    { id: 'ast-1', name: 'Crawling Black Spiders (Looping WebM)', category: 'Halloween', icon: Ghost, color: '#f97316' },
    { id: 'ast-2', name: 'Pine Needle Garland & Fairy Lights', category: 'Christmas', icon: Snowflake, color: '#22c55e' },
    { id: 'ast-3', name: 'Gothic Stained Glass Window Overlay', category: 'Decals', icon: Layers, color: '#a855f7' },
    { id: 'ast-4', name: 'Roaring Fireplace Window Inferno', category: 'Shaders', icon: Flame, color: '#ef4444' },
    { id: 'ast-5', name: 'Singing Jack-o-Lantern Carved SVG', category: 'Halloween', icon: Ghost, color: '#f97316' },
    { id: 'ast-6', name: 'Falling Icicle Drips (Alpha WebM)', category: 'Christmas', icon: Snowflake, color: '#38bdf8' },
    { id: 'ast-7', name: 'Tesla Lightning Arc Bolt', category: 'Shaders', icon: Sparkles, color: '#06b6d4' },
    { id: 'ast-8', name: 'Boarded Window Wood Planks Decal', category: 'Halloween', icon: Layers, color: '#eab308' },
  ];

  const filtered = ASSETS.filter((a) => {
    const matchCat = selectedCategory === 'All' || a.category === selectedCategory;
    const matchQuery = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const handleAdd = (name: string) => {
    setAddedItemName(name);
    setTimeout(() => setAddedItemName(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Architectural Decal, Stencil & Holiday Asset Browser
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                100+ Vector Cutouts, Transparent WebM Stickers & Shaders
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsHolidayAssetModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-[#1b2638] bg-[#0d1422] flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search decals, stencils, effects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121a28] border border-[#233248] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <div className="flex gap-1">
            {(['All', 'Halloween', 'Christmas', 'Shaders', 'Decals'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#121b2a] text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        <div className="p-6 grid grid-cols-4 gap-3 overflow-y-auto max-h-[60vh] text-xs">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="p-3 rounded-xl bg-[#0e1624] border border-[#1b2638] hover:border-amber-500/50 flex flex-col justify-between group transition-all"
            >
              <div>
                <div
                  className="w-full h-20 rounded-lg bg-[#080d16] border border-[#172030] flex items-center justify-center mb-2"
                  style={{ color: asset.color }}
                >
                  <asset.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-bold text-slate-200 truncate">{asset.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">{asset.category}</div>
              </div>

              <button
                type="button"
                onClick={() => handleAdd(asset.name)}
                className="w-full mt-2.5 py-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-amber-300 font-bold text-[10px] uppercase flex items-center justify-center gap-1"
              >
                {addedItemName === asset.name ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Pinned!
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Pin to Facade
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsHolidayAssetModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase"
          >
            Done Browsing
          </button>
        </div>
      </div>
    </div>
  );
};
