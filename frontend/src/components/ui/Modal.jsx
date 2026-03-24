import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const Modal = React.forwardRef(
  ({ isOpen, onClose, title, description, children, size = 'md', className, ...props }, ref) => {
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
    };

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          role="presentation"
        />

        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'bg-white rounded-lg shadow-lg w-full',
              sizeClasses[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || onClose) && (
              <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
                <div>
                  {title && <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>}
                  {description && <p className="text-sm text-neutral-600 mt-1">{description}</p>}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
