import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

const StatusPipeline = React.forwardRef(
  ({ status = 'draft', onStatusChange, interactive = false, ...props }, ref) => {
    const stages = [
      { id: 'draft', label: 'Draft', icon: Clock },
      { id: 'sent', label: 'Sent', icon: AlertCircle },
      { id: 'paid', label: 'Paid', icon: CheckCircle2 },
    ];

    const getStageIndex = (stageId) => stages.findIndex((s) => s.id === stageId);
    const currentIndex = getStageIndex(status);

    return (
      <div ref={ref} className="flex items-center justify-between" {...props}>
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isNext = index === currentIndex + 1;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage */}
              <button
                onClick={() => interactive && onStatusChange?.(stage.id)}
                disabled={!interactive}
                className={cn(
                  'flex flex-col items-center gap-2 transition-all',
                  interactive && 'cursor-pointer hover:scale-110',
                  !interactive && 'cursor-default'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    isCompleted && 'bg-green-100 text-green-600',
                    isCurrent && 'bg-mahogany-100 text-mahogany-700 ring-2 ring-mahogany-700',
                    !isCompleted && !isCurrent && 'bg-neutral-100 text-neutral-400'
                  )}
                >
                  <Icon size={24} />
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold transition-colors',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-mahogany-700',
                    !isCompleted && !isCurrent && 'text-neutral-400'
                  )}
                >
                  {stage.label}
                </span>
              </button>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 transition-colors',
                    index < currentIndex
                      ? 'bg-green-600'
                      : index === currentIndex
                      ? 'bg-mahogany-700'
                      : 'bg-neutral-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

StatusPipeline.displayName = 'StatusPipeline';

export default StatusPipeline;
