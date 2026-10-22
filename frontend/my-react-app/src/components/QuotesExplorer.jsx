import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  AlertCircle,
  Plane,
  Clock,
  Eye,
  Download,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { apiService } from '../services/api';
import ProofOfSourceModal from './ProofOfSourceModal';
import AnimatedNumber from './AnimatedNumber';

/**
 * Formats duration in minutes into hrs and mins format (e.g. 2h 30m, 1h 06m)
 */
export function formatFlightDuration(durationMins, depTime, arrTime) {
  let mins = null;
  if (typeof durationMins === 'number' && !isNaN(durationMins) && durationMins > 0) {
    mins = durationMins;
  } else if (typeof durationMins === 'string' && !isNaN(parseInt(durationMins, 10)) && parseInt(durationMins, 10) > 0) {
    mins = parseInt(durationMins, 10);
  } else if (depTime && arrTime) {
    const [dh, dm] = String(depTime).split(':').map(Number);
    const [ah, am] = String(arrTime).split(':').map(Number);
    if (!isNaN(dh) && !isNaN(dm) && !isNaN(ah) && !isNaN(am)) {
      let diff = (ah * 60 + am) - (dh * 60 + dm);
      if (diff < 0) diff += 24 * 60;
      if (diff > 0) mins = diff;
    }
  }

  if (!mins || mins <= 0) return '--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function QuotesExplorer({ initialQuotes = [], refreshTrigger }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [totalCount, setTotalCount] = useState(initialQuotes.length || 0);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('');
  const [outlierOnly, setOutlierOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadAllUnfiltered, setLoadAllUnfiltered] = useState(false);

  // Sorting state for columns: Flight, Carrier, Window, Departure, Arrival, Duration, Base Fare, Taxes & Fees, Total Normalised
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination state (default: 300 rows per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(300);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const tableTopRef = useRef(null);

  // Proof Modal state
  const [auditQuote, setAuditQuote] = useState(null);

  const hasSpecificFilters = Boolean(selectedRoute || selectedAirline || selectedWindow || outlierOnly);
  const isUnlimited = hasSpecificFilters || loadAllUnfiltered;

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoute, selectedAirline, selectedWindow, outlierOnly, searchTerm, pageSize]);

  useEffect(() => {
    fetchFilteredQuotes();
  }, [selectedRoute, selectedAirline, selectedWindow, outlierOnly, loadAllUnfiltered, refreshTrigger]);

  const fetchFilteredQuotes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedRoute) params.route_code = selectedRoute;
      if (selectedAirline) params.airline_code = selectedAirline;
      if (selectedWindow) params.advance_window = selectedWindow;
      if (outlierOnly) params.is_outlier = true;

      // When ANY filter (corridor, airline, window, outlier) is selected, request ALL data with NO limit
      if (hasSpecificFilters || loadAllUnfiltered) {
        params.all_data = true;
      } else {
        // Unfiltered initial preview for instant performance
        params.limit = 100;
      }

      const res = await apiService.getQuotes(params);
      if (res && res.quotes) {
        setQuotes(res.quotes);
        if (res.total_count) setTotalCount(res.total_count);
      }
    } catch (e) {
      console.error("Failed to fetch live quotes:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const flightNum = (q.flight_number || '').toLowerCase();
    const rCode = (q.route_code || q.route || '').toLowerCase();
    const aName = (q.airline_name || q.airline || '').toLowerCase();
    const oName = (q.ota_name || '').toLowerCase();
    const sPlatform = (q.source_platform || '').toLowerCase();
    const sSource = (q.source || '').toLowerCase();
    return (
      flightNum.includes(term) ||
      rCode.includes(term) ||
      aName.includes(term) ||
      oName.includes(term) ||
      sPlatform.includes(term) ||
      sSource.includes(term)
    );
  });

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return {
        key,
        direction: 'asc'
      };
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedRoute('');
    setSelectedAirline('');
    setSelectedWindow('');
    setOutlierOnly(false);
    setSearchTerm('');
    setLoadAllUnfiltered(false);
    setSortConfig({ key: null, direction: 'asc' });
    setCurrentPage(1);
  };

  const getSortLabel = (key) => {
    const map = {
      flight: 'Flight',
      carrier: 'Carrier',
      window: 'Window',
      departure: 'Departure',
      arrival: 'Arrival',
      duration: 'Duration',
      base_fare: 'Base Fare',
      taxes_and_fees: 'Taxes & Fees',
      total_fare: 'Total Normalised'
    };
    return map[key] || key;
  };

  // Memoized sorted quotes across the 9 requested categories
  const sortedQuotes = useMemo(() => {
    if (!sortConfig.key) return filteredQuotes;

    const getWindowDay = (w) => {
      if (!w) return 999;
      const match = String(w).match(/\d+/);
      return match ? parseInt(match[0], 10) : 999;
    };

    const getDurationMins = (q) => {
      if (typeof q?.duration_mins === 'number' && !isNaN(q.duration_mins) && q.duration_mins > 0) {
        return q.duration_mins;
      }
      if (typeof q?.duration_mins === 'string' && !isNaN(parseInt(q.duration_mins, 10)) && parseInt(q.duration_mins, 10) > 0) {
        return parseInt(q.duration_mins, 10);
      }
      if (q?.departure_time && q?.arrival_time) {
        const [dh, dm] = String(q.departure_time).split(':').map(Number);
        const [ah, am] = String(q.arrival_time).split(':').map(Number);
        if (!isNaN(dh) && !isNaN(dm) && !isNaN(ah) && !isNaN(am)) {
          let diff = (ah * 60 + am) - (dh * 60 + dm);
          if (diff < 0) diff += 24 * 60;
          return diff;
        }
      }
      return 0;
    };

    return [...filteredQuotes].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'flight': {
          const fa = a.flight_number || '';
          const fb = b.flight_number || '';
          comparison = fa.localeCompare(fb, undefined, { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'carrier': {
          const ca = a.airline_name || a.airline || a.airline_code || '';
          const cb = b.airline_name || b.airline || b.airline_code || '';
          comparison = ca.localeCompare(cb, undefined, { sensitivity: 'base' });
          break;
        }
        case 'window': {
          const wa = getWindowDay(a.advance_window);
          const wb = getWindowDay(b.advance_window);
          comparison = wa - wb;
          break;
        }
        case 'departure': {
          const da = a.departure_time || '';
          const db = b.departure_time || '';
          comparison = da.localeCompare(db);
          break;
        }
        case 'arrival': {
          const aa = a.arrival_time || '';
          const ab = b.arrival_time || '';
          comparison = aa.localeCompare(ab);
          break;
        }
        case 'duration': {
          const dura = getDurationMins(a);
          const durb = getDurationMins(b);
          comparison = dura - durb;
          break;
        }
        case 'base_fare': {
          const ba = Number(a.base_fare || 0);
          const bb = Number(b.base_fare || 0);
          comparison = ba - bb;
          break;
        }
        case 'taxes_and_fees': {
          const ta = Number(a.taxes_and_fees || 0);
          const tb = Number(b.taxes_and_fees || 0);
          comparison = ta - tb;
          break;
        }
        case 'total_fare': {
          const fa = Number(a.total_fare || 0);
          const fb = Number(b.total_fare || 0);
          comparison = fa - fb;
          break;
        }
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredQuotes, sortConfig]);

  // Slicing and page calculations
  const totalRows = sortedQuotes.length;
  const isPageSizeAll = pageSize === 'all';
  const numericPageSize = isPageSizeAll ? (totalRows || 1) : Number(pageSize);
  const totalPages = isPageSizeAll ? 1 : Math.max(1, Math.ceil(totalRows / numericPageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalRows === 0 ? 0 : (isPageSizeAll ? 0 : (safeCurrentPage - 1) * numericPageSize);
  const endIndex = isPageSizeAll ? totalRows : Math.min(startIndex + numericPageSize, totalRows);
  const paginatedQuotes = isPageSizeAll ? sortedQuotes : sortedQuotes.slice(startIndex, endIndex);

  const handlePageChange = (newPage, scroll = false) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    if (scroll && tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const renderPaginationControls = (position = 'top') => {
    if (totalRows === 0) return null;
    const isBottom = position === 'bottom';

    return (
      <div className={`quotes-pagination-bar ${isBottom ? 'pagination-bar-bottom' : 'pagination-bar-top'}`}>
        {/* Left: Range and Total Count (e.g. 1-300 / 3,998) */}
        <div className="pagination-range-info">
          <span className="pagination-range-pill">
            ROWS <strong>{totalRows === 0 ? '0' : `${(startIndex + 1).toLocaleString()}–${endIndex.toLocaleString()}`}</strong> / {totalRows.toLocaleString()}
          </span>
          <span className="pagination-page-indicator">
            Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
          </span>
        </div>

        {/* Center: Navigation Buttons & Page Pills */}
        <div className="pagination-nav-group">
          <button
            type="button"
            className="pagination-btn pagination-btn-nav"
            onClick={() => handlePageChange(1, isBottom)}
            disabled={safeCurrentPage === 1}
            title="First Page"
          >
            <ChevronsLeft size={14} />
            <span className="pagination-btn-text">First</span>
          </button>

          <button
            type="button"
            className="pagination-btn pagination-btn-nav"
            onClick={() => handlePageChange(safeCurrentPage - 1, isBottom)}
            disabled={safeCurrentPage === 1}
            title="Previous Page"
          >
            <ChevronLeft size={14} />
            <span className="pagination-btn-text">Prev</span>
          </button>

          <div className="pagination-page-pills">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${position}-${idx}`} className="pagination-ellipsis">
                    …
                  </span>
                );
              }
              const isActive = p === safeCurrentPage;
              return (
                <button
                  key={`page-${position}-${p}`}
                  type="button"
                  className={`pagination-page-pill ${isActive ? 'active-page-pill' : ''}`}
                  onClick={() => handlePageChange(p, isBottom)}
                  title={`Go to page ${p}`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="pagination-btn pagination-btn-nav"
            onClick={() => handlePageChange(safeCurrentPage + 1, isBottom)}
            disabled={safeCurrentPage === totalPages}
            title="Next Page"
          >
            <span className="pagination-btn-text">Next</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="pagination-btn pagination-btn-nav"
            onClick={() => handlePageChange(totalPages, isBottom)}
            disabled={safeCurrentPage === totalPages}
            title="Last Page"
          >
            <span className="pagination-btn-text">Last</span>
            <ChevronsRight size={14} />
          </button>
        </div>

        {/* Right: Quick Page Jumper & Page Size Selector */}
        <div className="pagination-options-group">
          <div className="pagination-jump-wrap">
            <span className="pagination-jump-label">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              placeholder={String(safeCurrentPage)}
              onChange={(e) => setJumpPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(jumpPageInput, 10);
                  if (!isNaN(val)) {
                    handlePageChange(val, isBottom);
                    setJumpPageInput('');
                  }
                }
              }}
              className="pagination-jump-input"
              aria-label="Direct page number jump"
            />
            <button
              type="button"
              className="btn-select-route-sm pagination-jump-btn"
              onClick={() => {
                const val = parseInt(jumpPageInput, 10);
                if (!isNaN(val)) {
                  handlePageChange(val, isBottom);
                  setJumpPageInput('');
                }
              }}
            >
              Go
            </button>
          </div>

          <div className="pagination-size-wrap">
            <span className="pagination-size-label">Rows / Page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === 'all' ? 'all' : Number(val));
              }}
              className="pagination-size-select"
            >
              <option value={100}>100 rows</option>
              <option value={300}>300 rows (Default)</option>
              <option value={500}>500 rows</option>
              <option value={1000}>1,000 rows</option>
              <option value="all">All ({totalRows.toLocaleString()})</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const exportToCsv = () => {
    if (!sortedQuotes || sortedQuotes.length === 0) return;
    const headers = [
      'Flight Number',
      'Corridor',
      'Airline Code',
      'Airline Name',
      'Booking Platform',
      'Channel',
      'Window',
      'Departure Time',
      'Arrival Time',
      'Duration (Formatted)',
      'Duration (Mins)',
      'Base Fare (INR)',
      'Taxes & Fees (INR)',
      'Total Fare (INR)',
      'Outlier Status',
      'Flight Date',
      'Proof Hash (SHA-256)'
    ];

    const rows = sortedQuotes.map(q => [
      q.flight_number || '',
      q.route_code || q.route || '',
      q.airline_code || '',
      q.airline_name || q.airline || '',
      q.ota_name ? q.ota_name : (q.source_platform || 'Direct Scraper'),
      q.channel || (q.ota_name ? 'OTA' : 'DIRECT'),
      q.advance_window || '',
      q.departure_time || '',
      q.arrival_time || '',
      formatFlightDuration(q.duration_mins, q.departure_time, q.arrival_time),
      q.duration_mins || '',
      q.base_fare || '',
      q.taxes_and_fees || '',
      q.total_fare || '',
      q.is_outlier ? 'OUTLIER' : 'CLEAN',
      q.flight_date || '',
      q.snapshot_hash || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sortSuffix = sortConfig.key ? `_sorted_${sortConfig.key}_${sortConfig.direction}` : '';
    const fileName = `apix_quotes_${selectedRoute || 'all'}_${selectedAirline || 'all'}_${selectedWindow || 'all'}${sortSuffix}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortableHeader = (key, label) => {
    const isSorted = sortConfig.key === key;
    const isAsc = isSorted && sortConfig.direction === 'asc';

    return (
      <th
        key={key}
        className={`sortable-th ${isSorted ? 'th-sorted' : ''}`}
        onClick={() => handleSort(key)}
        title={`Sort by ${label} (${isSorted ? (isAsc ? 'Ascending • Click for Descending' : 'Descending • Click for Ascending') : 'Click to Sort'})`}
      >
        <div className="th-sort-wrapper">
          <span className="th-label">{label}</span>
          <button
            type="button"
            className={`btn-col-sort ${isSorted ? 'btn-col-sort-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSort(key);
            }}
            aria-label={`Sort by ${label} in ${isSorted ? (isAsc ? 'descending' : 'ascending') : 'ascending'} order`}
            title={`Sort ${label} (${isSorted ? (isAsc ? 'Ascending' : 'Descending') : 'Unsorted'})`}
          >
            {isSorted ? (
              isAsc ? (
                <ArrowUp size={12} strokeWidth={2.5} />
              ) : (
                <ArrowDown size={12} strokeWidth={2.5} />
              )
            ) : (
              <ArrowUpDown size={12} className="sort-icon-idle" />
            )}
          </button>
        </div>
      </th>
    );
  };

  return (
    <div className="quotes-explorer-view">
      <div className="section-header-row">
        <div>
          <div className="badge-pill">
            <ShieldCheck size={13} />
            <span>REAL-TIME SCRAPED FARES & AUDIT TRAIL</span>
          </div>
          <h2 className="section-title">Live Price Quotes Explorer</h2>
          <p className="section-subtitle">
            Searchable repository of <AnimatedNumber value={totalCount} /> individual flight ticket price quotes collected across 10 DGCA corridors and 6 booking horizons (T+0 to T+45).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="explorer-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search flight number, route or carrier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Route Corridor Select */}
        <select
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="filter-select"
        >
          <option value="">All 10 DGCA Corridors</option>
          <option value="DEL-BOM">DEL-BOM (22.35%)</option>
          <option value="DEL-BLR">DEL-BLR (14.91%)</option>
          <option value="BOM-BLR">BOM-BLR (11.08%)</option>
          <option value="DEL-CCU">DEL-CCU (9.49%)</option>
          <option value="BLR-HYD">BLR-HYD (8.49%)</option>
          <option value="MAA-DEL">MAA-DEL (7.95%)</option>
          <option value="DEL-HYD">DEL-HYD (7.56%)</option>
          <option value="BOM-GOI">BOM-GOI (6.63%)</option>
          <option value="BOM-MAA">BOM-MAA (5.96%)</option>
          <option value="CCU-BLR">CCU-BLR (5.57%)</option>
        </select>

        {/* Airline Select */}
        <select
          value={selectedAirline}
          onChange={(e) => setSelectedAirline(e.target.value)}
          className="filter-select"
        >
          <option value="">All Carriers &amp; OTAs</option>
          <option value="6E">IndiGo (6E)</option>
          <option value="AI">Air India (AI)</option>
          <option value="IX">Air India Express (IX)</option>
          <option value="QP">Akasa Air (QP)</option>
          <option value="SG">SpiceJet (SG)</option>
          <option value="MMT">MakeMyTrip (MMT)</option>
          <option value="EMT">EaseMyTrip (EMT)</option>
          <option value="YTR">Yatra (YTR)</option>
          <option value="CT">Cleartrip (CT)</option>
          <option value="IXG">ixigo (IXG)</option>
          <option value="GIB">Goibibo (GIB)</option>
          <option value="SKY">Skyscanner (SKY)</option>
        </select>

        {/* Advance Window Select */}
        <select
          value={selectedWindow}
          onChange={(e) => setSelectedWindow(e.target.value)}
          className="filter-select"
        >
          <option value="">All Windows (T+0 .. T+45)</option>
          <option value="T+0">T+0 Day (Same-Day / Distress)</option>
          <option value="T+1">T+1 Day (Spot / Corporate)</option>
          <option value="T+7">T+7 Days (Weekly Anchor)</option>
          <option value="T+15">T+15 Days (Mid-term)</option>
          <option value="T+30">T+30 Days (Monthly Leisure)</option>
          <option value="T+45">T+45 Days (Early Floor)</option>
        </select>

        {/* Outlier Filter Button */}
        <button
          className={`filter-btn-toggle ${outlierOnly ? 'active-toggle' : ''}`}
          onClick={() => setOutlierOnly(!outlierOnly)}
        >
          <AlertCircle size={14} />
          <span>{outlierOnly ? 'Showing Outliers' : 'Filter Outliers'}</span>
        </button>
      </div>

      {/* Live Unlimited Status & Scope Banner */}
      <div className="quotes-status-bar">
        <div className="quotes-status-left">
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
              <span className="calc-spinner" style={{ width: '12px', height: '12px' }} />
              FETCHING COMPLETE DATASET...
            </span>
          ) : (
            <>
              <CheckCircle2 size={15} style={{ color: '#10b981' }} />
              <span>
                <strong><AnimatedNumber value={totalRows} /> QUOTES MATCHED</strong>
              </span>
              <span className="pagination-summary-badge">
                ROWS {totalRows === 0 ? '0' : `${(startIndex + 1).toLocaleString()}–${endIndex.toLocaleString()}`} / {totalRows.toLocaleString()}
              </span>
              {!isUnlimited && (
                <span style={{ color: 'var(--muted-fg)' }}>
                  (Showing latest 100 preview across <AnimatedNumber value={totalCount} /> stored records)
                </span>
              )}
              {sortConfig.key && (
                <span className="quotes-filter-chip sort-active-chip">
                  <span>Sorted by: <strong>{getSortLabel(sortConfig.key)}</strong> ({sortConfig.direction === 'asc' ? '▲ ASC' : '▼ DESC'})</span>
                  <button
                    type="button"
                    className="btn-clear-chip"
                    onClick={() => setSortConfig({ key: null, direction: 'asc' })}
                    title="Reset to default order"
                  >
                    ✕
                  </button>
                </span>
              )}
            </>
          )}

          {selectedRoute && <span className="quotes-filter-chip">Corridor: {selectedRoute}</span>}
          {selectedAirline && <span className="quotes-filter-chip">Carrier: {selectedAirline}</span>}
          {selectedWindow && <span className="quotes-filter-chip">Window: {selectedWindow}</span>}
          {outlierOnly && <span className="quotes-filter-chip" style={{ color: '#f87171' }}>Outliers Only</span>}
        </div>

        <div className="quotes-status-right">
          {!hasSpecificFilters && !loadAllUnfiltered && (
            <button
              type="button"
              className="btn-select-route-sm"
              onClick={() => setLoadAllUnfiltered(true)}
              title="Load all quotes in the entire database with no limit"
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            >
              Load All ({totalCount.toLocaleString()} Quotes)
            </button>
          )}

          {hasSpecificFilters && (
            <button
              type="button"
              className="btn-select-route-sm"
              onClick={handleClearFilters}
              title="Reset all search filters"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.72rem' }}
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}

          <button
            type="button"
            className="btn-csv-export"
            onClick={exportToCsv}
            disabled={sortedQuotes.length === 0}
            title="Download currently displayed quotes as CSV"
          >
            <Download size={13} />
            Export CSV ({sortedQuotes.length})
          </button>
        </div>
      </div>

      {/* Scroll anchor for smooth page navigation */}
      <div ref={tableTopRef} />

      {/* Top Pagination Bar */}
      {renderPaginationControls('top')}

      {/* Quotes Table */}
      <div className="table-responsive-wrapper">
        <table className="quotes-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              {renderSortableHeader('flight', 'Flight')}
              <th>Sector</th>
              {renderSortableHeader('carrier', 'Carrier')}
              {renderSortableHeader('window', 'Window')}
              {renderSortableHeader('departure', 'Departure')}
              {renderSortableHeader('arrival', 'Arrival')}
              {renderSortableHeader('duration', 'Duration')}
              {renderSortableHeader('base_fare', 'Base Fare')}
              {renderSortableHeader('taxes_and_fees', 'Taxes & Fees')}
              {renderSortableHeader('total_fare', 'Total Normalised')}
              <th>Status</th>
              <th>Proof of Source</th>
            </tr>
          </thead>
          <tbody>
            {paginatedQuotes.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-fg)' }}>
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="calc-spinner" style={{ width: '14px', height: '14px' }} />
                      Retrieving all quotes from database...
                    </span>
                  ) : (
                    <div>
                      <p style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--fg)' }}>
                        No flight price quotes match your current filter combination.
                      </p>
                      <button
                        type="button"
                        className="btn-select-route-sm"
                        onClick={handleClearFilters}
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedQuotes.map((q, idx) => {
                const globalRowNumber = startIndex + idx + 1;
                return (
                  <tr key={q.id || `${startIndex}-${idx}`} className={q.is_outlier ? 'outlier-row' : ''}>
                    <td className="font-mono text-muted" style={{ fontSize: '0.74rem', color: 'var(--muted-fg)' }}>
                      {globalRowNumber}
                    </td>
                    <td className="font-mono font-bold">{q.flight_number}</td>
                    <td>
                      <span className="route-badge-sm">{q.route_code || q.route}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                        <span
                          className="carrier-tag-pill"
                          style={{ borderColor: q.airline_color || '#E5B54F' }}
                        >
                          {q.airline_name || q.airline}
                        </span>
                        {q.ota_name ? (
                          <span
                            className="ota-source-pill"
                            style={{
                              fontSize: '0.68rem',
                              color: q.ota_color || '#0084FF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600'
                            }}
                            title={`Booked via Aggregator / OTA: ${q.ota_name}`}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: q.ota_color || '#0084FF', display: 'inline-block' }} />
                            via {q.ota_name}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.64rem',
                              color: 'var(--muted-fg)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Direct airline official booking channel"
                          >
                            Direct Scraper
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`window-badge-sm ${q.advance_window === 'T+1' ? 't1-badge' : ''}`}>
                        {q.advance_window}
                      </span>
                    </td>
                    <td className="font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                      {q.departure_time || '--'}
                    </td>
                    <td className="font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                      {q.arrival_time || '--'}
                    </td>
                    <td>
                      <div className="duration-cell-wrap">
                        <span className="duration-primary">
                          {formatFlightDuration(q.duration_mins, q.departure_time, q.arrival_time)}
                        </span>
                        <span className="duration-secondary">
                          {q.stops === 0 ? 'Non-stop' : (q.stops ? `${q.stops} stop${q.stops > 1 ? 's' : ''}` : 'Direct')}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono">₹{Math.round(q.base_fare || 0).toLocaleString()}</td>
                    <td className="font-mono">₹{Math.round(q.taxes_and_fees || 0).toLocaleString()}</td>
                    <td className="font-bold font-mono val-gold">₹{Math.round(q.total_fare || 0).toLocaleString()}</td>
                    <td>
                      {q.is_outlier ? (
                        <span className="tag-outlier">IQR Spiked</span>
                      ) : (
                        <span className="tag-clean">Cleaned</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-proof-inspect"
                        onClick={() => setAuditQuote(q)}
                        title="Inspect SHA-256 Government Proof of Source"
                      >
                        <ShieldCheck size={14} />
                        <span>SHA-256</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination Bar */}
      {renderPaginationControls('bottom')}

      {/* Proof of Source Inspection Modal */}
      <ProofOfSourceModal
        isOpen={!!auditQuote}
        onClose={() => setAuditQuote(null)}
        quote={auditQuote}
      />
    </div>
  );
}
