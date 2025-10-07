/**
 * Global Search Component
 * System-wide search with keyboard shortcuts (Cmd+K)
 * Cognitive Complexity: 8
 * File Size: ~210 LOC
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Command,
  ArrowRight,
  Clock,
  User,
  Folder,
  CheckSquare,
  CreditCard,
  BarChart,
  Settings,
  Home,
} from 'lucide-react';
import { cn } from '../../../../shared/utils/cn';
import { useGlobalSearch } from '../../hooks';
import type { SearchCategory } from '../../types/search.types';

interface GlobalSearchProps {
  className?: string;
  onNavigate?: (url: string) => void;
}

const categoryIcons: Record<SearchCategory, React.ElementType> = {
  navigation: Home,
  users: User,
  projects: Folder,
  tasks: CheckSquare,
  timesheets: Clock,
  reports: BarChart,
  billing: CreditCard,
  settings: Settings,
};

const categoryColors: Record<SearchCategory, string> = {
  navigation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  users: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  projects: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  tasks: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  timesheets: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  reports: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  billing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  settings: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className, onNavigate }) => {
  const {
    query,
    setQuery,
    results,
    quickActions,
    isLoading,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    handleResultSelect,
  } = useGlobalSearch(onNavigate);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }

      if (!isOpen) return;

      const items = results.length > 0 ? results : quickActions;
      const totalItems = items.length;

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        e.preventDefault();
        handleResultSelect(items[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, quickActions, selectedIndex, setIsOpen, setQuery, setSelectedIndex, handleResultSelect]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const getIcon = (category: SearchCategory, iconName?: string) => {
    const Icon = iconName ? categoryIcons[category] || Search : categoryIcons[category] || Search;
    return <Icon className="h-4 w-4" />;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400',
          'bg-gray-100 dark:bg-gray-800 rounded-lg',
          'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <div className="flex items-center gap-1 ml-auto">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
            ⌘
          </kbd>
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
            K
          </kbd>
        </div>
      </button>
    );
  }

  const displayItems = results.length > 0 ? results : quickActions;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything..."
            className="flex-1 ml-3 text-lg bg-transparent border-none outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100"
          />
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.length === 0 && quickActions.length > 0 && (
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 py-2">
              Quick Actions
            </div>
          )}
          {query.length > 0 && results.length > 0 && (
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 py-2">
              Search Results
            </div>
          )}

          {displayItems.length === 0 && query.length > 0 && !isLoading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          )}

          {displayItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleResultSelect(item)}
              className={cn(
                'w-full text-left flex items-center px-3 py-3 rounded-lg transition-colors',
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex-shrink-0 mr-3">
                {getIcon(item.category, item.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.title}
                  </p>
                  <span className={cn('text-xs px-2 py-1 rounded-full ml-2', categoryColors[item.category])}>
                    {item.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                ↵
              </kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Powered by Global Search</span>
          </div>
        </div>
      </div>
    </>
  );
};
