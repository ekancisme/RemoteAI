import React from 'react';
import { Sparkles, Bot, Cpu } from 'lucide-react';

interface AgentPickerProps {
  selectedAgent: 'agy' | 'claude';
  onSelectAgent: (agent: 'agy' | 'claude') => void;
}

export const AgentPicker: React.FC<AgentPickerProps> = ({ selectedAgent, onSelectAgent }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Động cơ AI (Autonomous Agent Engine)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* AGY Option */}
        <button
          type="button"
          onClick={() => onSelectAgent('agy')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${
            selectedAgent === 'agy'
              ? 'bg-emerald-500/10 border-emerald-500/60 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AGY (Antigravity)</span>
            </div>
            {selectedAgent === 'agy' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </div>
          <span className="text-[11px] text-slate-300 mt-1">Google Gemini Flash</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Tốc độ cực nhanh • Miễn phí</span>
        </button>

        {/* Claude Code Option */}
        <button
          type="button"
          onClick={() => onSelectAgent('claude')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${
            selectedAgent === 'claude'
              ? 'bg-indigo-500/10 border-indigo-500/60 text-white shadow-lg shadow-indigo-950'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400">
              <Bot className="w-3.5 h-3.5" />
              <span>Claude Code</span>
            </div>
            {selectedAgent === 'claude' && (
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            )}
          </div>
          <span className="text-[11px] text-slate-300 mt-1">Anthropic Sonnet</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Lý luận sâu • Kiến trúc phức tạp</span>
        </button>
      </div>
    </div>
  );
};
