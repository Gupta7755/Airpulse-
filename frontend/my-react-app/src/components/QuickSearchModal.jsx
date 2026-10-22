import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  Compass,
  TrendingUp,
  Clock,
  Plane,
  FileSearch,
  Cpu,
  Download,
  Home,
  Sparkles,
  MapPin,
  Flame,
  Snowflake,
  Volume2,
  ArrowRight,
  Calculator,
  Grid,
  Activity
} from 'lucide-react';

export default function QuickSearchModal({
  isOpen,
  onClose,
  onNavigate,
  onSelectRoute,
  onOpenIndexModal,
  onToggleSpeech,
  routes = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Searchable items corpus
  const allItems = useMemo(() => {
    return [
      // 1. Pages & Dashboards
      {
        id: 'page-deck',
        title: 'Executive Flight Deck',
        subtitle: 'Official MoSPI CPI Macro Architecture & Basket KPIs',
        category: 'Pages & Dashboards',
        icon: LayoutDashboard,
        targetTab: 'deck',
        keywords: ['deck', 'dashboard', 'macro', 'cpi', 'kpi', 'home', 'laspeyres', 'basket', 'mospi']
      },
      {
        id: 'page-spikes',
        title: 'Air Intel & Disruption Radar',
        subtitle: 'Real-Time News Disruptions, Scraper Spikes, ML Forecasts & AI Assistant',
        category: 'Pages & Dashboards',
        icon: Activity,
        targetTab: 'spikes',
        keywords: ['intel', 'air intel', 'spike', 'spikes', 'anomaly', 'chat', 'kerala', 'flood', 'predict', 'forecast', 'ai', 'radar', 'unusual', 'surge', 'news', 'disruption', 'accident', 'safety', 'dgca']
      },
      {
        id: 'page-routes',
        title: 'Route Pricing Matrix',
        subtitle: '10 High-Density DGCA Corridors & India Interactive Map',
        category: 'Pages & Dashboards',
        icon: Compass,
        targetTab: 'routes',
        keywords: ['routes', 'corridors', 'map', 'india', 'pricing', 'matrix', 'airports', 'dgca']
      },
      {
        id: 'page-trajectory',
        title: 'Index Trend & History',
        subtitle: 'Laspeyres Base Period Relatives & Historical Inflation Trend',
        category: 'Pages & Dashboards',
        icon: TrendingUp,
        targetTab: 'trajectory',
        keywords: ['trajectory', 'trend', 'history', 'inflation', 'chart', 'historical', 'base period']
      },
      {
        id: 'page-windows',
        title: 'Advance Purchase Curves',
        subtitle: 'T+0 to T+45 Horizon Analysis & Departure Time Premiums',
        category: 'Pages & Dashboards',
        icon: Clock,
        targetTab: 'windows',
        keywords: ['advance', 'windows', 'curve', 't+0', 't+7', 't+15', 't+30', 'horizon', 'departure']
      },
      {
        id: 'page-airlines',
        title: 'Airlines & OTAs',
        subtitle: 'IndiGo, Air India, Akasa, SpiceJet & OTA Relatives',
        category: 'Pages & Dashboards',
        icon: Plane,
        targetTab: 'airlines',
        keywords: ['airlines', 'carrier', 'indigo', 'air india', 'akasa', 'spicejet', 'otas', 'makemytrip', 'easemytrip']
      },
      {
        id: 'page-quotes',
        title: 'Live Quotes Corpus',
        subtitle: 'High-Frequency Filterable Web-Scraped Microdata Quotes',
        category: 'Pages & Dashboards',
        icon: FileSearch,
        targetTab: 'quotes',
        keywords: ['quotes', 'microdata', 'corpus', 'raw data', 'search', 'live prices']
      },
      {
        id: 'page-scraper',
        title: 'Crawler Health & Telemetry',
        subtitle: 'Scraper Pipeline Latency, Carrier Endpoints & System Status',
        category: 'Pages & Dashboards',
        icon: Cpu,
        targetTab: 'scraper',
        keywords: ['scraper', 'crawler', 'health', 'pipeline', 'telemetry', 'playwright', 'bot', 'status']
      },
      {
        id: 'page-export',
        title: 'NSO Macro Release & Export',
        subtitle: 'Official DGCA Basket Schemas, CSV & JSON Downloads',
        category: 'Pages & Dashboards',
        icon: Download,
        targetTab: 'export',
        keywords: ['export', 'nso', 'download', 'csv', 'json', 'data release', 'schema', 'api']
      },
      {
        id: 'page-home',
        title: 'Home Poster Spread',
        subtitle: 'Editorial Typography Overview & DGCA Corridor Summary',
        category: 'Pages & Dashboards',
        icon: Home,
        targetTab: 'home',
        keywords: ['home', 'poster', 'welcome', 'start', 'landing', 'editorial']
      },

      // 2. Flight Corridors
      {
        id: 'route-del-bom',
        title: 'Delhi (DEL) → Mumbai (BOM)',
        subtitle: '22.35% Basket Weight · Golden Corridor · ₹6,840 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'DEL-BOM',
        targetTab: 'routes',
        keywords: ['delhi', 'mumbai', 'del', 'bom', 'golden corridor']
      },
      {
        id: 'route-bom-blr',
        title: 'Mumbai (BOM) → Bengaluru (BLR)',
        subtitle: '14.12% Basket Weight · Commerce Tech Route · ₹5,054 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'BOM-BLR',
        targetTab: 'routes',
        keywords: ['mumbai', 'bengaluru', 'bangalore', 'bom', 'blr']
      },
      {
        id: 'route-del-blr',
        title: 'Delhi (DEL) → Bengaluru (BLR)',
        subtitle: '16.48% Basket Weight · Capital Tech Trunk · ₹7,120 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'DEL-BLR',
        targetTab: 'routes',
        keywords: ['delhi', 'bengaluru', 'bangalore', 'del', 'blr']
      },
      {
        id: 'route-del-ccu',
        title: 'Delhi (DEL) → Kolkata (CCU)',
        subtitle: '8.90% Basket Weight · Eastern Metro Corridor · ₹8,465 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'DEL-CCU',
        targetTab: 'routes',
        keywords: ['delhi', 'kolkata', 'calcutta', 'del', 'ccu']
      },
      {
        id: 'route-blr-hyd',
        title: 'Bengaluru (BLR) → Hyderabad (HYD)',
        subtitle: '7.85% Basket Weight · Southern Tech Hub Corridor · ₹5,305 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'BLR-HYD',
        targetTab: 'routes',
        keywords: ['bengaluru', 'hyderabad', 'blr', 'hyd', 'south']
      },
      {
        id: 'route-maa-del',
        title: 'Chennai (MAA) → Delhi (DEL)',
        subtitle: '7.15% Basket Weight · Southern Capital Trunk · ₹7,650 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'MAA-DEL',
        targetTab: 'routes',
        keywords: ['chennai', 'madras', 'delhi', 'maa', 'del']
      },
      {
        id: 'route-del-hyd',
        title: 'Delhi (DEL) → Hyderabad (HYD)',
        subtitle: '6.95% Basket Weight · Central Deccan Corridor · ₹7,795 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'DEL-HYD',
        targetTab: 'routes',
        keywords: ['delhi', 'hyderabad', 'del', 'hyd']
      },
      {
        id: 'route-bom-goi',
        title: 'Mumbai (BOM) → Goa (GOI)',
        subtitle: '5.45% Basket Weight · High-Leisure Coastal Corridor · ₹4,434 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'BOM-GOI',
        targetTab: 'routes',
        keywords: ['mumbai', 'goa', 'bom', 'goi', 'leisure']
      },
      {
        id: 'route-bom-maa',
        title: 'Mumbai (BOM) → Chennai (MAA)',
        subtitle: '5.85% Basket Weight · Industrial Metro Trunk · ₹5,980 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'BOM-MAA',
        targetTab: 'routes',
        keywords: ['mumbai', 'chennai', 'bom', 'maa']
      },
      {
        id: 'route-ccu-blr',
        title: 'Kolkata (CCU) → Bengaluru (BLR)',
        subtitle: '4.90% Basket Weight · East-South Trunk · ₹7,820 avg',
        category: 'High-Density Corridors',
        icon: MapPin,
        routeCode: 'CCU-BLR',
        targetTab: 'routes',
        keywords: ['kolkata', 'bengaluru', 'ccu', 'blr']
      },

      // 3. Deep Features & Tools
      {
        id: 'tool-inspect-apix',
        title: 'Inspect APIx Calculation',
        subtitle: 'Interactive Laspeyres Fixed-Base Formula & Basket Breakdown',
        category: 'Analytical Tools',
        icon: Calculator,
        action: 'open_modal',
        keywords: ['inspect', 'laspeyres', 'formula', 'calculation', 'math', 'equation', 'modal', 'weights']
      },
      {
        id: 'tool-heatmap',
        title: 'India Airfare Heatmap Matrix',
        subtitle: 'Corridor Matrix & Annual Calendar Heatmap View',
        category: 'Analytical Tools',
        icon: Grid,
        targetTab: 'deck',
        targetElement: '.heatmap-unified-card',
        keywords: ['heatmap', 'matrix', 'calendar', 'hotspots', 'density', 'color map']
      },
      {
        id: 'tool-rising-routes',
        title: 'Top Inflation Corridors',
        subtitle: 'Routes experiencing fastest price increases (+27.8%)',
        category: 'Analytical Tools',
        icon: Flame,
        targetTab: 'deck',
        targetElement: '.deck-middle-row',
        keywords: ['rising', 'inflation', 'surge', 'expensive', 'high fares', 'increase']
      },
      {
        id: 'tool-falling-routes',
        title: 'Top Deflation Corridors',
        subtitle: 'Routes cooling down with discounted fares (-10.4%)',
        category: 'Analytical Tools',
        icon: Snowflake,
        targetTab: 'deck',
        targetElement: '.deck-middle-row',
        keywords: ['falling', 'deflation', 'cooling', 'cheap', 'deals', 'discounts']
      },
      {
        id: 'tool-screen-reader',
        title: 'Read Current Page Aloud',
        subtitle: 'Text-to-speech audio reader with word highlighting',
        category: 'Analytical Tools',
        icon: Volume2,
        action: 'toggle_speech',
        keywords: ['volume', 'speaker', 'listen', 'audio', 'voice', 'speech', 'accessibility', 'reader']
      }
    ];
  }, []);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default: Return key pages and top tools
      return allItems.filter(item =>
        ['page-deck', 'page-routes', 'tool-inspect-apix', 'route-del-bom', 'page-windows', 'page-scraper', 'page-export'].includes(item.id)
      );
    }

    return allItems.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords && item.keywords.some(k => k.includes(q));
      const matchRoute = item.routeCode && item.routeCode.toLowerCase().replace('-', '').includes(q.replace('-', ''));
      return matchTitle || matchSubtitle || matchCategory || matchKeywords || matchRoute;
    });
  }, [allItems, query]);

  // Focus input on open & handle outside click
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard Navigation inside search
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Execute selection
  const handleSelect = (item) => {
    onClose();

    if (item.action === 'open_modal') {
      if (onOpenIndexModal) onOpenIndexModal();
      return;
    }

    if (item.action === 'toggle_speech') {
      if (onToggleSpeech) onToggleSpeech();
      return;
    }

    if (item.routeCode) {
      if (onSelectRoute) {
        const found = routes.find(r => r.route_code === item.routeCode);
        if (found) {
          onSelectRoute(found);
        } else {
          onSelectRoute({
            route_code: item.routeCode,
            name: item.title,
            code: item.title
          });
        }
      }
      if (onNavigate) onNavigate(item.targetTab || 'routes');
      return;
    }

    if (item.targetTab) {
      if (onNavigate) onNavigate(item.targetTab);
      if (item.targetElement) {
        setTimeout(() => {
          const el = document.querySelector(item.targetElement);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  };

  if (!isOpen) return null;

  // Group filtered items by category
  const grouped = filteredItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div
      className="quick-search-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Search and Command Navigation"
    >
      <div
        className="quick-search-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="quick-search-header">
          <Search size={18} strokeWidth={2.2} className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="quick-search-input"
            placeholder="Search pages, corridors, heatmap, Laspeyres formula..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search navigation items"
          />
          {query ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={15} strokeWidth={2} />
            </button>
          ) : (
            <span className="search-esc-tag">ESC</span>
          )}
        </div>

        {/* Results Container */}
        <div className="quick-search-results" ref={resultsRef}>
          {filteredItems.length === 0 ? (
            <div className="search-empty-state">
              <p className="empty-title">No matching sections or routes found</p>
              <p className="empty-sub">Try searching for "Deck", "Heatmap", "DEL-BOM", or "Formula"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="search-category-group">
                <div className="search-category-header">{category}</div>
                <div className="search-category-items">
                  {items.map((item) => {
                    const itemGlobalIndex = filteredItems.indexOf(item);
                    const isSelected = itemGlobalIndex === selectedIndex;
                    const IconComponent = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`search-result-item ${isSelected ? 'selected-item' : ''}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                        aria-selected={isSelected}
                      >
                        <div className="result-icon-box">
                          <IconComponent size={16} strokeWidth={2} />
                        </div>

                        <div className="result-content-col">
                          <div className="result-title-row">
                            <span className="result-title-text">{item.title}</span>
                            {item.routeCode && (
                              <span className="result-route-pill font-mono">{item.routeCode}</span>
                            )}
                          </div>
                          <span className="result-sub-text">{item.subtitle}</span>
                        </div>

                        <div className="result-action-hint">
                          <ArrowRight size={13} strokeWidth={2.4} className="result-arrow-icon" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Search Modal Footer */}
        <div className="quick-search-footer">
          <div className="footer-shortcuts">
            <span className="shortcut-item"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span className="shortcut-item"><kbd>↵</kbd> to select</span>
            <span className="shortcut-item"><kbd>esc</kbd> to close</span>
          </div>
          <span className="footer-brand font-mono">Airpulse MoSPI Airpulse</span>
        </div>
      </div>
    </div>
  );
}

