import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StudioSectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export const StudioSectionCard: React.FC<StudioSectionCardProps> = ({
  title,
  subtitle,
  icon,
  isOpen = true,
  onToggle,
  children,
}) => {
  return (
    <div className="rounded-xl bg-[#131722] border border-slate-800/90 overflow-hidden shadow-lg">
      <div
        onClick={onToggle}
        className={`px-3.5 py-2.5 bg-[#0D1017]/80 border-b border-slate-800/80 flex items-center justify-between gap-2 ${
          onToggle ? 'cursor-pointer hover:bg-slate-800/40 transition-colors' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-sky-400 shrink-0">{icon}</span>}
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-wide uppercase text-slate-100 truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[10px] text-slate-400 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        {onToggle && (
          <span className="p-1 rounded bg-slate-800/70 text-orange-400 shrink-0">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </div>
      {isOpen && <div className="p-3.5 flex flex-col gap-3 text-xs">{children}</div>}
    </div>
  );
};