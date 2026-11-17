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
      className="rounded-xl bg-[#141923] border border-slate-800/90 shrink-0"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full min-h-[52px] px-3 py-2.5 flex items-center justify-between gap-2.5 rounded-xl hover:bg-slate-800/45 active:bg-slate-800/65 transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#0D1017] border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
            {icon}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
              <span className="text-[11px] font-bold tracking-wide uppercase text-orange-500 leading-tight shrink-0">
                {title}
              </span>
              {badgeText && (
                <span className="text-[10px] font-mono text-slate-400 min-w-0 truncate tabular-nums">
                  {badgeText}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-300/90 leading-snug line-clamp-2 mt-0.5">
              {description}
            </div>
          </div>
        </div>
        {!standalone && (
          <span className="inline-flex items-center justify-center w-7 h-7 sm:w-6 sm:h-6 rounded-md bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
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
