import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, RefreshCw, Clock, Check, Layers } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const BatchRenderQueueModal: React.FC = () => {
  const {
    isBatchRenderModalOpen,
    setIsBatchRenderModalOpen,
    renderQueue,
    addRenderJob,
    cancelRenderJob,
    retryRenderJob,
  } = useProjectionStore();

  const [newTitle, setNewTitle] = useState<string>('Cyberpunk Neon Grid 4K');
  const [newPrompt, setNewPrompt] = useState<string>(
    'Glowing cyan and magenta circuit grid racing across house siding with laser roofline'
  );
  const [newCategory, setNewCategory] = useState<string>('Cyberpunk');

  if (!isBatchRenderModalOpen) return null;

  const handleAddNewJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addRenderJob({
      title: newTitle,
      prompt: newPrompt,
      category: newCategory,
      status: 'queued',
      progress: 0,
      estimatedSec: 45,
    });
    setNewTitle('');
    setNewPrompt('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Overnight Batch AI Video Render Queue Manager
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Multi-Prompt Queue & Automatic Playlist Ingestion
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBatchRenderModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Add Job Form */}
          <form onSubmit={handleAddNewJob} className="p-4 rounded-xl bg-[#080d16] border border-[#1f2d42] space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" /> Enqueue Prompt Variation
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Job Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Frozen Ice Palace Loop"
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Category / Theme</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase">AI Video Prompt</label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                rows={2}
                className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2.5 py-1.5 text-slate-200 resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Enqueue Overnight Render
            </button>
          </form>

          {/* Active Queue List */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pending & Active Renders ({renderQueue.length})
            </div>
            {renderQueue.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-xl bg-[#0e1624] border border-[#1b2638] flex items-center justify-between"
              >
                <div className="truncate mr-3">
                  <div className="font-bold text-slate-200 truncate">{job.title}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{job.prompt}</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    {job.category} • {job.status.toUpperCase()} ({job.progress}%) • {job.timestamp}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {job.status === 'completed' && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Completed
                    </span>
                  )}
                  {job.status === 'rendering' && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {job.progress}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => cancelRenderJob(job.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsBatchRenderModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase"
          >
            Close Queue
          </button>
        </div>
      </div>
    </div>
  );
};
