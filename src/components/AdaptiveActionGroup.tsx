import React from 'react';
import { useAdaptiveUI, type AdaptiveActionItem } from '../hooks/useAdaptiveUI';

interface AdaptiveActionGroupProps {
  actions: AdaptiveActionItem[];
  dynamicOrder?: boolean;
  className?: string;
}

export const AdaptiveActionGroup: React.FC<AdaptiveActionGroupProps> = ({
  actions,
  dynamicOrder = true,
  className = '',
}) => {
  const { device, orderedActions, mostUsedId, trackAction } = useAdaptiveUI(
    actions,
    dynamicOrder
  );

  // Organizacao pre-definida por tipo de tela (Adaptativa + Fluida + Wrap)
  const containerLayout =
    device === 'mobile'
      ? 'grid grid-cols-1 gap-2 w-full'
      : device === 'tablet'
        ? 'grid grid-cols-2 gap-2.5 w-full'
        : 'flex flex-wrap items-stretch gap-2 w-full';

  return (
    <div className={`${containerLayout} ${className}`}>
      {orderedActions.map((action) => {
        const isMostUsed = action.id === mostUsedId;

        const baseClasses =
          'relative flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ' +
          'whitespace-normal break-words text-center leading-snug transition-all duration-150 ' +
          'min-w-[130px] flex-1 basis-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

        const variantClasses =
          action.variant === 'primary'
            ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
            : action.variant === 'accent'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700';

        const highlightClasses = isMostUsed
          ? 'ring-2 ring-amber-400/80 shadow-md'
          : '';

        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={() => {
              trackAction(action.id);
              action.onClick();
            }}
            className={`${baseClasses} ${variantClasses} ${highlightClasses}`}
          >
            {action.icon && <span className="shrink-0">{action.icon}</span>}
            <span>
              {device === 'mobile' && action.shortLabel
                ? action.shortLabel
                : action.label}
            </span>
            {isMostUsed && (
              <span
                title="Função mais utilizada"
                className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
