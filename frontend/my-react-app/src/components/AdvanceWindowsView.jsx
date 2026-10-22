import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Filter,
  BarChart3,
  Layers,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api';
import AnimatedNumber from './AnimatedNumber';

const DGCA_CORRIDORS = [
  { code: '', label: 'All 10 DGCA Corridors (Weighted Basket)' },
  { code: 'DEL-BOM', label: 'DEL-BOM (Delhi ➔ Mumbai • 22.35%)' },
  { code: 'DEL-BLR', label: 'DEL-BLR (Delhi ➔ Bengaluru • 14.91%)' },
  { code: 'BOM-BLR', label: 'BOM-BLR (Mumbai ➔ Bengaluru • 11.08%)' },
  { code: 'DEL-CCU', label: 'DEL-CCU (Delhi ➔ Kolkata • 9.49%)' },
  { code: 'BLR-HYD', label: 'BLR-HYD (Bengaluru ➔ Hyderabad • 8.49%)' },
  { code: 'MAA-DEL', label: 'MAA-DEL (Chennai ➔ Delhi • 7.95%)' },
  { code: 'DEL-HYD', label: 'DEL-HYD (Delhi ➔ Hyderabad • 7.56%)' },
  { code: 'BOM-GOI', label: 'BOM-GOI (Mumbai ➔ Goa • 6.63%)' },
  { code: 'BOM-MAA', label: 'BOM-MAA (Mumbai ➔ Chennai • 5.96%)' },
  { code: 'CCU-BLR', label: 'CCU-BLR (Kolkata ➔ Bengaluru • 5.57%)' }
];

export default function AdvanceWindowsView({ windowsData: initialWindows = [] }) {
  const [windows, setWindows] = useState(initialWindows);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('T+1');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Fetch real-time advance windows data directly from database
  const fetchWindowsData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const params = {};
      if (selectedRoute) params.route_code = selectedRoute;
      const res = await apiService.getAdvanceWindows(params);
      if (res && Array.isArray(res) && res.length > 0) {
        setWindows(res);
        setLastRefreshedAt(Date.now());
      }
    } catch (e) {
      console.error('Failed to fetch dynamic advance windows:', e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedRoute]);

  // Initial load and whenever corridor filter changes
  useEffect(() => {
    fetchWindowsData(true);
  }, [fetchWindowsData]);

  // Live Auto-Refresh Polling every 4 seconds when streaming is active
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      fetchWindowsData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isStreaming, fetchWindowsData]);

  // Relative seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  const currentWindow = windows.find(w => (w.window || w.advance_window) === selectedWindow) || windows[0];
  const t45Window = windows.find(w => (w.window || w.advance_window) === 'T+45' || (w.window || w.advance_window) === 'T+30') || windows[windows.length - 1];
  const baselineFare = (t45Window && typeof t45Window.average_fare === 'number') ? Math.round(t45Window.average_fare) : null;
  const baselineLabel = t45Window ? (t45Window.window || t45Window.advance_window) : 'T+45';

  // Dynamic calculations across all windows
  const totalWindowQuotes = useMemo(() => {
    return windows.reduce((sum, w) => sum + (w.quotes_count || w.quote_count || 0), 0);
  }, [windows]);

  const totalOutliers = useMemo(() => {
    return windows.reduce((sum, w) => sum + (w.outliers_detected || 0), 0);
  }, [windows]);

  const peakSurge = useMemo(() => {
    if (!windows.length) return 1.0;
    const surges = windows.map(w => Number(w.surge_ratio || w.surge_multiplier || 1.0));
    return Math.max(...surges);
  }, [windows]);

  const maxAvgFareInBasket = useMemo(() => {
    if (!windows.length) return 10000;
    const fares = windows.map(w => Number(w.average_fare || 0));
    return Math.max(...fares, 8000);
  }, [windows]);

  // SVG Chart Geometry and Coordinate Calculations
  const chartPoints = useMemo(() => {
    if (!windows || windows.length === 0) return [];
    const width = 800;
    const height = 220;
    const paddingX = 60;
    const paddingY = 30;

    const fares = windows.map(w => Number(w.average_fare || 0));
    const minVal = Math.min(...fares) * 0.85;
    const maxVal = Math.max(...fares) * 1.15;
    const range = maxVal - minVal || 1;

    return windows.map((w, idx) => {
      const x = paddingX + (idx / (windows.length - 1)) * (width - paddingX * 2);
      const fare = Number(w.average_fare || 0);
      const y = height - paddingY - ((fare - minVal) / range) * (height - paddingY * 2);
      return {
        x,
        y,
        fare,
        window: w.window || w.advance_window,
        label: w.label || w.window,
        quotes: w.quotes_count || w.quote_count || 0,
        surge: w.surge_ratio || w.surge_multiplier || 1.0,
        outliers: w.outliers_detected || 0,
        minFare: w.min_fare,
        maxFare: w.max_fare
      };
    });
  }, [windows]);

  const pathData = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [chartPoints]);

  const areaPathData = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const bottomY = 190;
    return `${pathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [chartPoints, pathData]);

  return (
    <div className="advance-windows-view">
      {/* Header Row */}
      <div className="section-header-row">
        <div>
          <div className="badge-pill">
            <Clock size={13} />
            <span>REAL-TIME ADVANCE PURCHASE VOLATILITY CURVE</span>
          </div>
          <h2 className="section-title">Advance Purchase Windows Yield Curve</h2>
          <p className="section-subtitle">
            Dynamic algorithmic decay analysis across 6 booking horizons (T+0 to T+45). Isolates emergency distress surge pricing from underlying core transport inflation.
          </p>
        </div>
      </div>

      {/* Real-time Stream & Corridor Control Toolbar */}
      <div className="crawler-stream-bar" style={{ marginBottom: '20px' }}>
        <div className="crawler-stream-status">
          <span className={`live-pulse-dot ${isStreaming ? '' : 'dot-paused'}`} />
          <span className="live-stream-pill">
            {isStreaming ? '● LIVE DATABASE YIELD CURVE STREAM ACTIVE' : '○ YIELD STREAM PAUSED'}
          </span>
          <span className="crawler-live-time">
            {secondsAgo <= 3 ? 'Just now' : `${secondsAgo}s ago`}
          </span>
        </div>

        <div className="crawler-stream-actions">
          {/* Corridor Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: 'var(--accent)' }} />
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="filter-select-xs"
              title="Filter advance curve by DGCA corridor"
              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
            >
              {DGCA_CORRIDORS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Stream Pause / Resume Toggle */}
          <button
            type="button"
            className="btn-stream-toggle"
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? 'Pause auto-polling stream' : 'Resume live 4s auto-polling stream'}
          >
            {isStreaming ? <Pause size={12} /> : <Play size={12} />}
            <span>{isStreaming ? 'Streaming (4s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            className="btn-stream-toggle"
            onClick={() => fetchWindowsData(true)}
            disabled={loading}
            title="Force immediate query from database"
          >
            <RefreshCw size={12} className={loading ? 'calc-spinner' : ''} />
            <span>Sync Curve</span>
          </button>
        </div>
      </div>

      {/* Dynamic Advance Curve KPI Summary Cards */}
      <div className="overview-kpi-grid" style={{ marginBottom: '22px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Peak Surge Volatility</span>
            <ArrowUpRight size={16} className="text-accent" />
          </div>
          <div className="kpi-value val-gold"><AnimatedNumber value={peakSurge} suffix="x" decimals={2} /></div>
          <div className="kpi-caption">
            T+0 Same-Day Distress vs {baselineLabel} Leisure Floor
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{baselineLabel} Baseline Anchor</span>
            <Clock size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value font-mono">
            {baselineFare != null ? <AnimatedNumber value={baselineFare} prefix="₹" /> : '—'}
          </div>
          <div className="kpi-caption">
            Long-horizon non-surge planning floor
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Horizon Database Sample</span>
            <Layers size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div className="kpi-value font-mono"><AnimatedNumber value={totalWindowQuotes} /></div>
          <div className="kpi-caption">
            Verified price observations across 6 horizons
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">IQR Cleaned Outliers</span>
            <AlertTriangle size={16} style={{ color: '#f87171' }} />
          </div>
          <div className="kpi-value font-mono" style={{ color: totalOutliers > 0 ? '#f87171' : 'var(--fg)' }}>
            <AnimatedNumber value={totalOutliers} />
          </div>
          <div className="kpi-caption">
            Statistical spikes isolated by 1.5× IQR filter
          </div>
        </div>
      </div>

      {/* Interactive Visual Advance Yield Curve (SVG Chart) */}
      <div className="yield-curve-panel" style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={15} style={{ color: 'var(--accent)' }} />
              Dynamic Price Decay & Surge Trajectory ({selectedRoute || 'All Corridors Basket'})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-fg)', marginTop: '2px' }}>
              Plots average ticket price (₹) against booking lead time. Click any point to inspect detailed horizon economics.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--muted-fg)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              Real-time Average Fare
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#10b981' }} />
              {baselineLabel} Floor
            </span>
          </div>
        </div>

        {/* SVG Curve Graphic */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox="0 0 800 220"
            style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}
          >
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E5B54F" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#E5B54F" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            {[50, 95, 140, 185].map((gy, gidx) => (
              <line
                key={`grid-${gidx}`}
                x1="50"
                y1={gy}
                x2="750"
                y2={gy}
                stroke="var(--chart-grid, rgba(255, 255, 255, 0.05))"
                strokeDasharray="4 4"
                className="advance-chart-grid-line"
              />
            ))}

            {/* Shaded Area Under Yield Curve */}
            {areaPathData && (
              <path d={areaPathData} fill="url(#curveGradient)" />
            )}

            {/* Yield Curve Line */}
            {pathData && (
              <path
                d={pathData}
                fill="none"
                stroke="#E5B54F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Points */}
            {chartPoints.map((pt) => {
              const isSelected = selectedWindow === pt.window;
              const isHovered = hoveredPoint?.window === pt.window;

              return (
                <g
                  key={`pt-${pt.window}`}
                  onClick={() => setSelectedWindow(pt.window)}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer Glow Ring for Selected / Hovered */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="none"
                      stroke="#E5B54F"
                      strokeWidth="1.5"
                      opacity="0.6"
                    />
                  )}

                  {/* Core Point Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 4}
                    fill={isSelected ? '#E5B54F' : 'var(--card)'}
                    stroke="#E5B54F"
                    strokeWidth="2"
                  />

                  {/* X-Axis Horizon Tag */}
                  <text
                    x={pt.x}
                    y="208"
                    textAnchor="middle"
                    fill={isSelected ? '#E5B54F' : 'var(--muted-fg)'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="advance-chart-horizon-label"
                  >
                    {pt.window}
                  </text>

                  {/* Top Price Value Label */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fill="var(--fg)"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="advance-chart-price-label"
                  >
                    ₹{Math.round(pt.fare).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            background: 'var(--chart-tooltip-bg, #0A0A0A)',
            color: 'var(--chart-tooltip-text, #FAFAFA)',
            border: '1px solid var(--border)',
            padding: '8px 14px',
            borderRadius: '4px',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            pointerEvents: 'none'
          }}>
            <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '2px' }}>
              {hoveredPoint.label} ({hoveredPoint.window})
            </div>
            <div>Avg Fare: <strong>₹{Math.round(hoveredPoint.fare).toLocaleString()}</strong></div>
            <div>Surge Ratio: <strong>{hoveredPoint.surge}x</strong> ({baselineLabel} floor)</div>
            <div>Range: ₹{Math.round(hoveredPoint.minFare || 0).toLocaleString()} – ₹{Math.round(hoveredPoint.maxFare || 0).toLocaleString()}</div>
            <div style={{ color: 'var(--muted-fg)' }}>Quotes Monitored: {hoveredPoint.quotes.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Advance Window Cards Grid */}
      <div className="windows-cards-grid">
        {windows.map((w) => {
          const winKey = w.window || w.advance_window;
          const isSelected = selectedWindow === winKey;
          const isT1 = winKey === 'T+1';
          const isT0 = winKey === 'T+0';
          const surgeVal = Number(w.surge_ratio || w.surge_multiplier || 1.0);
          const quoteCnt = w.quotes_count !== undefined ? w.quotes_count : (w.quote_count || 0);

          return (
            <div
              key={winKey}
              className={`window-card ${isSelected ? 'active-card' : ''} ${isT1 || isT0 ? 't1-surge-card' : ''}`}
              onClick={() => setSelectedWindow(winKey)}
              role="button"
              tabIndex={0}
            >
              <div className="window-card-top">
                <span className="window-tag">{winKey}</span>
                {w.outliers_detected > 0 && (
                  <span className="outlier-alert-pill">
                    <AlertTriangle size={11} /> {w.outliers_detected} Outliers
                  </span>
                )}
                {surgeVal > 1 && (
                  <span className="surge-tag">
                    {surgeVal.toFixed(2)}x Surge
                  </span>
                )}
              </div>

              <div className="window-fare-val">
                <AnimatedNumber value={Math.round(w.average_fare || 0)} prefix="₹" />
                <span className="fare-sub">avg fare</span>
              </div>

              <p className="window-desc">{w.description}</p>

              <div className="window-meta-stats">
                <div className="meta-stat">
                  <span>Min</span>
                  <strong><AnimatedNumber value={Math.round(w.min_fare || 0)} prefix="₹" /></strong>
                </div>
                <div className="meta-stat">
                  <span>Max</span>
                  <strong><AnimatedNumber value={Math.round(w.max_fare || 0)} prefix="₹" /></strong>
                </div>
                <div className="meta-stat">
                  <span>Quotes</span>
                  <strong><AnimatedNumber value={quoteCnt} /></strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-dive into Selected Horizon */}
      {currentWindow && (
        <div className="window-detail-card">
          <div className="detail-card-header">
            <div>
              <h3>Window Horizon: {currentWindow.window || currentWindow.advance_window} • Statistical Insights</h3>
              <p>{currentWindow.description}</p>
            </div>
            <div className="surge-multiplier-badge">
              <span>Dynamic Surge Ratio:</span>
              <strong>{Number(currentWindow.surge_ratio || currentWindow.surge_multiplier || 1.0).toFixed(2)}x Baseline ({baselineLabel})</strong>
            </div>
          </div>

          <div className="horizon-comparison-bar-wrap">
            <div className="horizon-bar-label">
              <span>Fare relative to {baselineLabel} leisure floor (₹{baselineFare.toLocaleString()})</span>
              <span><strong>₹{Math.round(currentWindow.average_fare || 0).toLocaleString()}</strong></span>
            </div>
            <div className="horizon-bar-track">
              <div
                className="horizon-bar-fill"
                style={{ width: `${Math.min(100, Math.max(10, (currentWindow.average_fare / maxAvgFareInBasket) * 100))}%` }}
              ></div>
            </div>
          </div>

          <div className="horizon-insights-grid">
            <div className="insight-card">
              <TrendingUp size={18} className="insight-icon icon-gold" />
              <div>
                <h4>Consumer Profile & Booking Behavior</h4>
                <p>
                  {currentWindow.window === 'T+0'
                    ? 'Emergency distress travellers, medical emergencies, missed connecting flights with peak inelastic price tolerance.'
                    : currentWindow.window === 'T+1'
                    ? 'Corporate emergencies, last-minute business distress travellers with high price inelasticity.'
                    : currentWindow.window === 'T+7'
                    ? 'Short-term personal travel and scheduled domestic business meetings.'
                    : currentWindow.window === 'T+15'
                    ? 'Anchor planning horizon for domestic travel; balanced airline seat yield curves.'
                    : currentWindow.window === 'T+30'
                    ? 'Monthly planned family vacations and personal leisure bookings.'
                    : 'Leisure family holidays, planned festival bookings, holiday vacations.'}
                </p>
              </div>
            </div>

            <div className="insight-card">
              <ShieldAlert size={18} className="insight-icon icon-pink" />
              <div>
                <h4>MoSPI CPI Statistical Cleaning</h4>
                <p>
                  {currentWindow.outliers_detected > 0
                    ? `IQR filter (1.5x) stripped ${currentWindow.outliers_detected} abnormal price spikes ${currentWindow.max_outlier_fare ? `(peak spike: ₹${Math.round(currentWindow.max_outlier_fare).toLocaleString()})` : ''} to prevent skewing headline retail inflation.`
                    : 'Clean price distribution within normal IQR bounds; full quote weight factored into Laspeyres formula.'}
                </p>
              </div>
            </div>

            <div className="insight-card">
              <CheckCircle2 size={18} className="insight-icon icon-green" />
              <div>
                <h4>Weight in Aggregate Index</h4>
                <p>
                  Integrated across all 10 DGCA corridors via weighted geometric average, ensuring headline APIx represents actual consumer expenditure proportions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
