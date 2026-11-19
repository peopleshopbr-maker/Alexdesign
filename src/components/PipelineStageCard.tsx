import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface PipelineStageCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badgeText?: string;
  hidden?: boolean;
  standalone?: boolean;
  children: React.ReactNode;
}

export const PipelineStageCard: React.FC<PipelineStageCardProps> = ({
  title,
  description,
  icon,
  expanded,
  onToggle,
  badgeText,
  hidden = false,
  standalone = false,
  children,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const wasExpandedRef = useRef(expanded);

  useEffect(() => {
    if (expanded && !wasExpandedRef.current && !hidden) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    wasExpandedRef.current = expanded;
  }, [expanded, hidden]);

  if (hidden) return null;

  return (
    <section
      ref={sectionRef}
      className={`rounded-xl transition-all duration-200 shrink-0 ${
        expanded
          ? 'bg-[#121622]/95 border border-orange-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(249,115,22,0.06)] ring-1 ring-orange-500/20'
          : 'bg-[#10141e]/90 border border-slate-800/80 hover:border-slate-700/90 hover:bg-[#131824]'
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full min-h-[52px] px-3 py-2.5 flex items-center justify-between gap-2.5 rounded-xl hover:bg-slate-800/30 active:bg-slate-800/50 transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
              expanded
                ? 'bg-orange-500/10 border border-orange-500/40 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                : 'bg-[#0D1017] border border-slate-800 text-slate-300'
            }`}
          >
            {icon}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span
                className={`text-[11px] font-bold tracking-wide uppercase leading-tight shrink-0 transition-colors ${
                  expanded ? 'text-orange-400' : 'text-slate-200'
                }`}
              >
                {title}
              </span>
              {badgeText && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono tracking-tight bg-orange-500/10 border border-orange-500/25 text-orange-300 min-w-0 truncate tabular-nums">
                  {badgeText}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-0.5 font-normal">
              {description}
            </div>
          </div>
        </div>
        {!standalone && (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 sm:w-6 sm:h-6 rounded-lg transition-colors shrink-0 ${
              expanded
                ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
                : 'bg-[#0D1017] border border-slate-800 text-slate-400'
            }`}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-180 text-orange-400' : ''
              }`}
            />
          </span>
        )}
      </button>

      {expanded && (
        <div
          className={`${
            standalone ? '' : 'max-h-[min(56dvh,400px)] overflow-y-auto'
          } px-3 pb-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-2.5 text-xs sm:text-[11px]`}
        >
          {children}
        </div>
      )}
    </section>
  );
};
