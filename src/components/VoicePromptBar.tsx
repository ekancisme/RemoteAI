import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoicePromptBarProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  'Fix bug và kiểm tra lại toàn bộ logic xử lý',
  'Viết unit test cho các hàm quan trọng',
  'Tối ưu hiệu năng và dọn dẹp mã nguồn thừa',
  'Thêm xử lý lỗi try/catch và ghi log chuẩn',
];

export const VoicePromptBar: React.FC<VoicePromptBarProps> = ({
  onSubmit,
  isSubmitting,
  disabled = false,
}) => {
  const [promptText, setPromptText] = useState('');

  const {
    isListening,
    transcript,
    interimText,
    error: speechError,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    silenceTimeoutMs: 1600,
    lang: 'vi-VN',
    onSilenceComplete: (finalTranscript) => {
      if (finalTranscript.trim()) {
        setPromptText(finalTranscript.trim());
        // Trigger auto submit
        onSubmit(finalTranscript.trim());
      }
    },
  });

  // Keep prompt input synced with voice recognition
  useEffect(() => {
    if (transcript || interimText) {
      setPromptText((transcript + ' ' + interimText).trim());
    }
  }, [transcript, interimText]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptText.trim() || isSubmitting || disabled) return;
    if (isListening) stopListening();
    onSubmit(promptText.trim());
  };

  const handleChipClick = (chipText: string) => {
    setPromptText(chipText);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-3 shadow-xl">
      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-500 shrink-0 text-[11px] font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Gợi ý:
        </span>
        {QUICK_PROMPTS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="shrink-0 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg transition active:scale-95"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Speech Error Notice */}
      {speechError && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Voice Status Alert when listening */}
      {isListening && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 animate-pulse">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Đang lắng nghe... (Dừng nói 1.6s để tự động gửi)</span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded-md border border-red-500/40 font-medium"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Main Textarea + Action Deck */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Mô tả công việc cần làm... hoặc bấm nút Micro bên dưới để nói"
          rows={3}
          disabled={disabled || isSubmitting}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-sans transition"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-2">
          {/* 1-Tap Mic Button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled || isSubmitting}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs transition active:scale-95 ${
                isListening
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/40 animate-pulse-ring'
                  : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Nhấn 1 chạm để bật nói, ngắt nghỉ 1.6s tự động gửi"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Dừng Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Nói Lệnh (1-Tap)</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Hỗ trợ tiếng Việt tự động ngắt nghỉ
            </span>
          </div>

          {/* Dispatch Button */}
          <button
            type="submit"
            disabled={!promptText.trim() || isSubmitting || disabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 disabled:shadow-none transition active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi Runner...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi Tác Vụ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
