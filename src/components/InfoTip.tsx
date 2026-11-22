import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTipProps {
  title?: string;
  text: string;
  align?: 'left' | 'right';
}

export const InfoTip: React.FC<InfoTipProps> = ({ title, text, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={title || '도움말 보기'}
        aria-expanded={open}
        className="min-h-[40px] min-w-[40px] -m-2 flex items-center justify-center text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-full transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title || '안내'}
          className={`absolute top-full mt-2 z-50 w-64 sm:w-72 rounded-xl bg-slate-900 text-white p-3.5 shadow-xl border border-slate-800 text-xs leading-relaxed ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            {title && <span className="font-semibold text-white">{title}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              aria-label="닫기"
              className="text-slate-400 hover:text-white p-0.5 ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-200 whitespace-pre-line">{text}</p>
        </div>
      )}
    </div>
  );
};
