import React from 'react';
import { Search } from 'lucide-react';

export default function SearchNavButton({
  onClick,
  size = 'normal',
  fullWidth = false,
  placeholder = 'Search'
}) {
  const isCompact = size === 'compact';
  const isSidebar = size === 'sidebar' || fullWidth;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <button
      type="button"
      className={`search-nav-bar ${isCompact ? 'compact-search-bar' : ''} ${isSidebar ? 'sidebar-search-bar' : ''}`}
      onClick={onClick}
      aria-label="Search sections, pages, corridors (Ctrl + K)"
      title="Search (Ctrl + K)"
    >
      <div className="search-bar-left">
        <Search size={isCompact ? 13 : 14} strokeWidth={2} className="search-bar-icon" />
        <span className="search-bar-placeholder">{placeholder}</span>
      </div>

      {!isCompact && (
        <span className="search-bar-kbd" aria-hidden="true">
          <span className="kbd-symbol">{isMac ? '⌘' : 'Ctrl'}</span>
          <span className="kbd-key">K</span>
        </span>
      )}
    </button>
  );
}
