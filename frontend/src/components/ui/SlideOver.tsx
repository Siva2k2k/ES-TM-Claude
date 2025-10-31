import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
};

const SlideOver: React.FC<SlideOverProps> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKey);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={onClose}
      />

      {/* Panel: mobile bottom sheet (items-end) -> desktop right slide (justify-end) */}
      <aside
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:w-[560px] h-[75vh] sm:h-full bg-white dark:bg-gray-900 shadow-2xl overflow-auto rounded-t-lg sm:rounded-l-lg sm:rounded-t-none"
      >
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </aside>
    </div>,
    document.body
  );
};

export default SlideOver;
