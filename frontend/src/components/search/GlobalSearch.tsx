import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Command, ArrowRight, Clock, User, Folder, CheckSquare, CreditCard, BarChart, Settings, Home } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  url: string;
  icon?: string;
  score?: number;
}

interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quickActions, setQuickActions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    }
  }, []);

  // Handle modal keyboard navigation
  const handleModalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setResults([]);
      return;
    }
    
    if (!isOpen) return;
    
    const totalItems = results.length || quickActions.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const items = results.length > 0 ? results : quickActions;
      if (items[selectedIndex]) {
        handleResultClick(items[selectedIndex]);
      }
    }
  }, [isOpen, results, quickActions, selectedIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [handleGlobalKeyDown, handleModalKeyDown]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Load quick actions when opened
  useEffect(() => {
    if (isOpen && quickActions.length === 0) {
      fetchQuickActions();
    }
  }, [isOpen, quickActions.length]);

  // Search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setSelectedIndex(0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchQuickActions = async () => {
    try {
      const response = await fetch('/api/v1/search/quick-actions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuickActions(data.data.quick_actions || []);
      }
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    }
  };

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=8`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Handle state-based navigation instead of URL routing
    if (result.url.includes('|')) {
      const [section, subsection] = result.url.split('|');
      
      // Dispatch custom events to trigger navigation in App component
      const navigationEvent = new CustomEvent('search-navigate', {
        detail: { section, subsection }
      });
      window.dispatchEvent(navigationEvent);
    } else {
      // Fallback for any remaining URL-based navigation
      window.location.href = result.url;
    }
    
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getIcon = (iconName?: string, category?: string) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (iconName || category) {
      case 'home':
      case 'navigation':
        return <Home {...iconProps} />;
      case 'users':
      case 'user':
        return <User {...iconProps} />;
      case 'folder':
      case 'projects':
        return <Folder {...iconProps} />;
      case 'check-square':
      case 'tasks':
        return <CheckSquare {...iconProps} />;
      case 'clock':
      case 'timesheets':
        return <Clock {...iconProps} />;
      case 'bar-chart':
      case 'reports':
        return <BarChart {...iconProps} />;
      case 'credit-card':
      case 'billing':
        return <CreditCard {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      default:
        return <Search {...iconProps} />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      navigation: 'bg-blue-100 text-blue-800',
      users: 'bg-green-100 text-green-800',
      projects: 'bg-purple-100 text-purple-800',
      tasks: 'bg-orange-100 text-orange-800',
      timesheets: 'bg-indigo-100 text-indigo-800',
      reports: 'bg-pink-100 text-pink-800',
      billing: 'bg-yellow-100 text-yellow-800',
      settings: 'bg-gray-100 text-gray-800'
    };
    
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const renderSearchResults = () => (
    <div className="p-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
        Search Results
      </div>
      {results.map((result, index) => (
        <button
          key={result.id}
          onClick={() => handleResultClick(result)}
          className={`w-full text-left flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
            index === selectedIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
          }`}
          type="button"
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(result.icon, result.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {result.title}
              </p>
              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(result.category)}`}>
                {result.category.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate mt-1">
              {result.description}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
        </button>
      ))}
    </div>
  );

  const renderQuickActions = () => (
    <div className="p-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
        Quick Actions
      </div>
      {quickActions.map((action, index) => (
        <button
          key={action.id}
          onClick={() => handleResultClick(action)}
          className={`w-full text-left flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
            index === selectedIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
          }`}
          type="button"
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(action.icon, action.category)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {action.title}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {action.description}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
        </button>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="p-8 text-center text-gray-500">
      <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
      <p>No results found for "{query}"</p>
      <p className="text-sm mt-1">Try different keywords or browse quick actions above</p>
    </div>
  );

  const renderSearchContent = () => {
    if (results.length > 0) {
      return renderSearchResults();
    }
    
    if (query.length === 0) {
      return renderQuickActions();
    }
    
    if (query.length > 0 && results.length === 0 && !loading) {
      return renderEmptyState();
    }
    
    return null;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors ${className}`}
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <div className="flex items-center space-x-1 ml-auto">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-200 border border-gray-300 rounded">
            ⌘
          </kbd>
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-200 border border-gray-300 rounded">
            K
          </kbd>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <button 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 w-full h-full border-0 p-0"
        onClick={() => setIsOpen(false)}
        aria-label="Close search modal"
        type="button"
      />
      
      {/* Search Modal */}
      <div 
        ref={modalRef}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 z-50"
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything..."
            className="flex-1 ml-3 text-lg bg-transparent border-none outline-none placeholder-gray-500"
          />
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {renderSearchContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-300 rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-300 rounded">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-300 rounded">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Command className="h-3 w-3" />
            <span>Powered by Global Search</span>
          </div>
        </div>
      </div>
    </>
  );
};