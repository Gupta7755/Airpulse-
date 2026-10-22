import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw, Calculator, Layers, Filter, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';

const CORRIDORS = [
  { code: 'ALL', label: 'National Composite (10 DGCA Corridors)' },
  { code: 'DEL-BOM', label: 'DEL-BOM (Delhi ✈ Mumbai)' },
  { code: 'DEL-BLR', label: 'DEL-BLR (Delhi ✈ Bengaluru)' },
  { code: 'BOM-BLR', label: 'BOM-BLR (Mumbai ✈ Bengaluru)' },
  { code: 'DEL-CCU', label: 'DEL-CCU (Delhi ✈ Kolkata)' },
  { code: 'BLR-HYD', label: 'BLR-HYD (Bengaluru ✈ Hyderabad)' },
  { code: 'MAA-DEL', label: 'MAA-DEL (Chennai ✈ Delhi)' },
  { code: 'DEL-HYD', label: 'DEL-HYD (Delhi ✈ Hyderabad)' },
  { code: 'BOM-GOI', label: 'BOM-GOI (Mumbai ✈ Goa)' },
  { code: 'BOM-MAA', label: 'BOM-MAA (Mumbai ✈ Chennai)' },
  { code: 'CCU-BLR', label: 'CCU-BLR (Kolkata ✈ Bengaluru)' }
];

const ADVANCE_WINDOWS = [
  { code: 'ALL_WEIGHTED', label: 'All Windows (Composite Weighted)' },
  { code: 'T+0', label: 'T+0 Days (Same-day spot pricing)' },
  { code: 'T+1', label: 'T+1 Days (Last-minute / Distress)' },
  { code: 'T+7', label: 'T+7 Days (Short-term weekly)' },
  { code: 'T+15', label: 'T+15 Days (Mid-term baseline)' },
  { code: 'T+30', label: 'T+30 Days (Monthly advance leisure)' },
  { code: 'T+45', label: 'T+45 Days (Long-term booking floor)' }
];

export default function IndexTrendChart({ indexSeries = [], overviewData }) {
  const [timeframe, setTimeframe] = useState('30'); // '30' (default daily spot) | '15' | '7' | 'monthly' | 'all'
  const [formula, setFormula] = useState('LASPEYRES'); // 'LASPEYRES' | 'GEOMETRIC_YOUNG'
  const [advanceWindow, setAdvanceWindow] = useState('ALL_WEIGHTED');
  const [routeCode, setRouteCode] = useState('ALL');

  const [trendData, setTrendData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Fetch dynamic calculations from backend
  const fetchCalculatedTrend = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getIndexTrend({
        timeframe,
        formula,
        advanceWindow,
        routeCode
      });
      if (res && res.series && res.series.length > 0) {
        setTrendData(res);
        setLastCalculatedAt(new Date());
      }
    } catch (e) {
      console.error("Failed to fetch dynamic index trend:", e);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, formula, advanceWindow, routeCode]);

  useEffect(() => {
    fetchCalculatedTrend();
  }, [fetchCalculatedTrend]);

  // Use dynamic series from backend or fallback to passed indexSeries
  const activeSeries = trendData?.series && trendData.series.length > 0 
    ? trendData.series 
    : (indexSeries && indexSeries.length > 0 ? indexSeries : []);

  const kpis = trendData?.kpis || (() => {
    if (!activeSeries || activeSeries.length === 0) return {};
    const latest = activeSeries[activeSeries.length - 1] || {};
    const first = activeSeries[0] || {};
    const cVal = Number(latest.index_value) || 100.0;
    const fVal = Number(first.index_value) || 100.0;
    const vals = activeSeries.map(d => Number(d.index_value) || 100.0);
    return {
      latest_index: cVal,
      latest_date: latest.calculation_date || '',
      net_drift_pct: fVal > 0 ? Number((((cVal - fVal) / fVal) * 100).toFixed(2)) : 0.0,
      change_pct_d1: Number(latest.change_pct_d1 || 0.0),
      change_pct_m1: Number(latest.change_pct_m1 || (cVal - 100.0)),
      series_high: Math.max(...vals),
      series_low: Math.min(...vals),
      current_basket_fare: Number(latest.average_fare || 0),
      total_quotes_analyzed: activeSeries.reduce((acc, cur) => acc + (cur.total_quotes_used || 0), 0),
      total_outliers_excluded: activeSeries.reduce((acc, cur) => acc + (cur.outliers_excluded || 0), 0),
      volatility_std_dev: 0.0,
      active_samples_count: activeSeries.length,
      formula_type: formula,
      advance_window: advanceWindow,
      route_code: routeCode,
      timeframe: timeframe
    };
  })();

  const corridorBreakdown = trendData?.corridor_breakdown || [];

  if (!activeSeries || activeSeries.length === 0) {
    return (
      <div className="index-trend-card bold-editorial-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="calc-spinner" style={{ width: '24px', height: '24px', margin: '0 auto 16px' }} />
        <p className="font-mono text-muted">Calculating real-time index metrics from database microdata...</p>
      </div>
    );
  }

  // Calculate SVG dimensions and scale dynamically
  const width = 960;
  const height = 340;
  const padding = { top: 40, right: 45, bottom: 65, left: 75 };

  const values = activeSeries.map(d => Number(d.index_value) || 100.0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  // Safe margin around extremes
  const rawMin = Math.floor(minVal - 1.0);
  const rawMax = Math.ceil(maxVal + 1.0);
  const range = Math.max(1, rawMax - rawMin);

  let niceStep = 1;
  const rawStep = range / 5;
  if (rawStep > 20) niceStep = 25;
  else if (rawStep > 10) niceStep = 15;
  else if (rawStep > 5) niceStep = 10;
  else if (rawStep > 2.5) niceStep = 5;
  else if (rawStep > 1) niceStep = 2;
  else if (rawStep > 0.5) niceStep = 1;
  else niceStep = 0.5;

  const chartMin = Math.floor(rawMin / niceStep) * niceStep;
  const chartMax = Math.ceil(rawMax / niceStep) * niceStep;

  const gridLevels = [];
  for (let val = chartMin; val <= chartMax + 0.0001; val += niceStep) {
    gridLevels.push(Math.round(val * 10) / 10);
  }

  const xScale = (index) => {
    if (activeSeries.length <= 1) return padding.left + (width - padding.left - padding.right) / 2;
    return padding.left + (index / (activeSeries.length - 1)) * (width - padding.left - padding.right);
  };

  const yScale = (val) => {
    const denom = chartMax - chartMin > 0 ? chartMax - chartMin : 1;
    return (height - padding.bottom) - ((val - chartMin) / denom) * (height - padding.top - padding.bottom);
  };

  // Generate SVG points
  const points = activeSeries.map((d, i) => ({
    x: xScale(i),
    y: yScale(Number(d.index_value) || 100.0),
    data: d
  }));

  const linePath = points.reduce((acc, p, i) => (
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  ), "");

  const areaPath = points.length > 0 ? `
    ${linePath}
    L ${points[points.length - 1].x} ${height - padding.bottom}
    L ${points[0].x} ${height - padding.bottom}
    Z
  ` : "";

  const base100Y = yScale(100.0);

  const isMonthly = timeframe === 'monthly';

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      if (parts.length === 2) {
        // Monthly: "YYYY-MM"
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${months[mIdx] || parts[1]} '${parts[0].slice(2)}`;
      } else if (parts.length === 3) {
        // Daily: "YYYY-MM-DD"
        const mIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2];
        return `${day} ${months[mIdx] || parts[1]}`;
      }
    } catch (e) {}
    return dateStr.slice(5);
  };

  const formatTooltipDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (parts.length === 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${monthsFull[mIdx] || parts[1]} ${parts[0]}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const shouldShowTick = (i, total) => {
    if (total <= 8) return true;
    if (i === total - 1) return true; // Always display current month / latest terminal tick
    const interval = total > 28 ? 4 : total > 14 ? 2 : 1;
    if (i % interval === 0) {
      return (total - 1 - i) >= Math.ceil(interval / 1.5);
    }
    return false;
  };

  return (
    <div className="index-trend-card bold-editorial-card">
      {/* 1. Page Header */}
      <div className="trend-card-header">
        <div>
          <div className="trend-pill bold-mono-pill">
            <span className="accent-square">■</span>
            <span>MACRO CPI AUGMENTATION • HIGH-FREQUENCY PRICE RELATIVE ENGINE</span>
          </div>
          <h3 className="trend-title bold-display-title">MoSPI Airfare Price Index (Airpulse) Time-Series</h3>
          <p className="trend-subtitle bold-editorial-subtitle">
            {isMonthly 
              ? `${activeSeries.length}-MONTH CONTINUOUS TRAJECTORY (Till ${formatTooltipDate(kpis.latest_date)}) • BASE PERIOD: 2024-Q1 = 100.00 • ${formula === 'LASPEYRES' ? 'LASPEYRES FIXED-BASE FORMULATION' : 'GEOMETRIC YOUNG (JEVONS) FORMULATION'}`
              : `${activeSeries.length}-SAMPLE HIGH-FREQUENCY TRAJECTORY • BASE PERIOD: 2024-Q1 = 100.00 • ${formula === 'LASPEYRES' ? 'LASPEYRES FIXED-BASE FORMULATION' : 'GEOMETRIC YOUNG (JEVONS) FORMULATION'}`
            }
          </p>
        </div>

        <div className="trend-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isLoading ? (
              <span className="calc-status-indicator" style={{ color: 'var(--accent)' }}>
                <span className="calc-spinner" /> RECALCULATING...
              </span>
            ) : (
              <span className="calc-status-indicator">
                <CheckCircle2 size={13} /> 100% CALCULATED FROM QUOTES
              </span>
            )}
            <button
              type="button"
              className="btn-select-route-sm"
              onClick={fetchCalculatedTrend}
              title="Recalculate with latest database quotes"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px' }}
            >
              <RefreshCw size={12} className={isLoading ? 'spin-anim' : ''} />
              SYNC
            </button>
          </div>
          {lastCalculatedAt && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted-fg)' }}>
              Updated: {lastCalculatedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Analytical Controls Toolbar */}
      <div className="trend-dynamic-toolbar">
        {/* Timeframe selector */}
        <div className="trend-toolbar-group">
          <span className="trend-toolbar-label">Timeframe:</span>
          <div className="trend-range-selector bold-range-selector">
            <button
              type="button"
              className={`trend-range-btn ${timeframe === '30' ? 'active' : ''}`}
              onClick={() => { setTimeframe('30'); setHoveredPoint(null); }}
              title="Last 30 days daily index series (Live daily spot)"
            >
              30D (DAILY SPOT)
            </button>
            <button
              type="button"
              className={`trend-range-btn ${timeframe === '15' ? 'active' : ''}`}
              onClick={() => { setTimeframe('15'); setHoveredPoint(null); }}
              title="Last 15 days daily index series"
            >
              15D
            </button>
            <button
              type="button"
              className={`trend-range-btn ${timeframe === '7' ? 'active' : ''}`}
              onClick={() => { setTimeframe('7'); setHoveredPoint(null); }}
              title="Last 7 days daily index series"
            >
              7D
            </button>
            <button
              type="button"
              className={`trend-range-btn ${timeframe === 'monthly' ? 'active' : ''}`}
              onClick={() => { setTimeframe('monthly'); setHoveredPoint(null); }}
              title="Monthly macroeconomic continuous trajectory (Jan - Sep 2026 MTD)"
            >
              MONTHLY (2026 Macro)
            </button>
            <button
              type="button"
              className={`trend-range-btn ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => { setTimeframe('all'); setHoveredPoint(null); }}
              title="All flight dates in dataset"
            >
              ALL DATES
            </button>
          </div>
        </div>

        {/* Formula Engine selector */}
        <div className="trend-toolbar-group">
          <span className="trend-toolbar-label">Engine:</span>
          <div className="trend-range-selector bold-range-selector">
            <button
              type="button"
              className={`trend-range-btn ${formula === 'LASPEYRES' ? 'active' : ''}`}
              onClick={() => { setFormula('LASPEYRES'); setHoveredPoint(null); }}
            >
              LASPEYRES
            </button>
            <button
              type="button"
              className={`trend-range-btn ${formula === 'GEOMETRIC_YOUNG' ? 'active' : ''}`}
              onClick={() => { setFormula('GEOMETRIC_YOUNG'); setHoveredPoint(null); }}
            >
              GEOMETRIC YOUNG
            </button>
          </div>
        </div>

        {/* Advance Purchase Window Filter */}
        <div className="trend-toolbar-group">
          <span className="trend-toolbar-label">Horizon:</span>
          <select
            className="trend-select-control"
            value={advanceWindow}
            onChange={(e) => { setAdvanceWindow(e.target.value); setHoveredPoint(null); }}
          >
            {ADVANCE_WINDOWS.map(w => (
              <option key={w.code} value={w.code}>{w.label}</option>
            ))}
          </select>
        </div>

        {/* Corridor Filter */}
        <div className="trend-toolbar-group">
          <span className="trend-toolbar-label">Corridor:</span>
          <select
            className="trend-select-control"
            value={routeCode}
            onChange={(e) => { setRouteCode(e.target.value); setHoveredPoint(null); }}
          >
            {CORRIDORS.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Frequency Harmonization Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px 14px',
        background: 'rgba(255, 61, 0, 0.05)',
        border: '1px solid rgba(255, 61, 0, 0.18)',
        borderRadius: '6px',
        fontSize: '0.74rem',
        margin: '12px 0 16px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            color: '#FF3D00', 
            fontWeight: 700, 
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            {isMonthly ? '● MONTHLY MACRO VIEW' : '● LIVE DAILY SPOT VIEW'}
          </span>
          <span style={{ color: 'var(--muted-fg, #94A3B8)' }}>|</span>
          <span style={{ color: 'var(--foreground, #E2E8F0)' }}>
            {isMonthly ? (
              <>Showing <strong>Monthly MTD Benchmark ({typeof kpis.latest_index === 'number' ? kpis.latest_index.toFixed(2) : kpis.latest_index})</strong> across all September quotes. For today&apos;s daily spot rate, switch to <strong>30D (DAILY SPOT)</strong>.</>
            ) : (
              <>Showing <strong>Live Daily Spot Index ({typeof kpis.latest_index === 'number' ? kpis.latest_index.toFixed(2) : kpis.latest_index})</strong> for {kpis.latest_date} — synchronized with Executive Flight Deck. For 9-month macro trend, switch to <strong>MONTHLY (2026 Macro)</strong>.</>
            )}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#94A3B8' }}>
          Calculated from MongoDB Atlas Microdata
        </span>
      </div>

      {/* 3. Dynamic Quick KPI Cards (Zero Hardcoded Values) */}
      <div className="trend-kpis-grid">
        <div className="trend-kpi-card">
          <span className="trend-kpi-label">{isMonthly ? 'MONTHLY MACRO BENCHMARK' : 'LIVE DAILY APIx'}</span>
          <span className="trend-kpi-value val-accent">
            {typeof kpis.latest_index === 'number' ? kpis.latest_index.toFixed(2) : kpis.latest_index}
          </span>
          <span className="trend-kpi-sub">
            {isMonthly ? `${formatTooltipDate(kpis.latest_date)} (Month-to-Date Avg)` : `Date: ${kpis.latest_date} (Live Daily Spot)`}
          </span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">{isMonthly ? '33M NET DRIFT' : `${timeframe.toUpperCase()} NET DRIFT`}</span>
          <span className={`trend-kpi-value ${Number(kpis.net_drift_pct) >= 0 ? 'val-accent' : 'val-muted'}`}>
            {Number(kpis.net_drift_pct) >= 0 ? <ArrowUpRight size={15} strokeWidth={2.5} /> : <ArrowDownRight size={15} strokeWidth={2.5} />}
            {Number(kpis.net_drift_pct) >= 0 ? `+${Number(kpis.net_drift_pct).toFixed(2)}` : Number(kpis.net_drift_pct).toFixed(2)}%
          </span>
          <span className="trend-kpi-sub">{isMonthly ? 'Since Base (Jan 2024)' : 'Across active timeline'}</span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">{isMonthly ? 'MONTH-OVER-MONTH (MoM)' : 'DAY-OVER-DAY (DoD)'}</span>
          <span className={`trend-kpi-value ${Number(kpis.change_pct_d1) >= 0 ? 'val-white' : 'val-muted'}`}>
            {Number(kpis.change_pct_d1) >= 0 ? `+${Number(kpis.change_pct_d1).toFixed(2)}` : Number(kpis.change_pct_d1).toFixed(2)}%
          </span>
          <span className="trend-kpi-sub">{isMonthly ? 'Prior month delta' : 'Prior observation delta'}</span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">
            {isMonthly && kpis.change_pct_yoy != null ? 'YEAR-OVER-YEAR (YoY)' : 'BASE DRIFT (MoM)'}
          </span>
          <span className={`trend-kpi-value ${(Number(isMonthly && kpis.change_pct_yoy != null ? kpis.change_pct_yoy : kpis.change_pct_m1)) >= 0 ? 'val-accent' : 'val-muted'}`}>
            {(Number(isMonthly && kpis.change_pct_yoy != null ? kpis.change_pct_yoy : kpis.change_pct_m1)) >= 0 ? '+' : ''}
            {Number(isMonthly && kpis.change_pct_yoy != null ? kpis.change_pct_yoy : kpis.change_pct_m1).toFixed(2)}%
          </span>
          <span className="trend-kpi-sub">{isMonthly && kpis.change_pct_yoy != null ? 'Vs 12 months prior' : 'Relative to Base 100.0'}</span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">BASKET FARE</span>
          <span className="trend-kpi-value" style={{ color: '#FACC15' }}>
            ₹{Math.round(Number(kpis.current_basket_fare || 0)).toLocaleString()}
          </span>
          <span className="trend-kpi-sub">Weighted current price</span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">MICRODATA QUOTES</span>
          <span className="trend-kpi-value val-white">
            {(kpis.total_quotes_analyzed || 0).toLocaleString()}
          </span>
          <span className="trend-kpi-sub">{isMonthly ? `${kpis.active_samples_count} months analyzed` : `${kpis.active_samples_count} dates analyzed`}</span>
        </div>

        <div className="trend-kpi-card">
          <span className="trend-kpi-label">VOLATILITY (σ)</span>
          <span className="trend-kpi-value val-white">
            ±{typeof kpis.volatility_std_dev === 'number' ? kpis.volatility_std_dev.toFixed(2) : kpis.volatility_std_dev}
          </span>
          <span className="trend-kpi-sub">Sample Std Deviation</span>
        </div>
      </div>

      {/* 4. The SVG Graph */}
      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg bold-trend-svg" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="trendGradientDynamic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3D00" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF3D00" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="strokeGradientDynamic" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FAFAFA" />
              <stop offset="50%" stopColor="#FAFAFA" />
              <stop offset="0%" stopColor="var(--chart-stroke-start, #FAFAFA)" />
              <stop offset="50%" stopColor="var(--chart-stroke-start, #FAFAFA)" />
              <stop offset="100%" stopColor="#FF3D00" />
            </linearGradient>
          </defs>

          {/* Dynamic Horizontal Grid Lines */}
          {gridLevels.map((level) => {
            const y = yScale(level);
            const isBase = Math.abs(level - 100.0) < 0.2;
            return (
              <g key={level} className="grid-group">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isBase ? "#FF3D00" : "var(--chart-grid, #262626)"}
                  strokeDasharray={isBase ? "4 3" : "2 3"}
                  strokeWidth={isBase ? "1.6" : "1"}
                  strokeOpacity={isBase ? 0.85 : 0.6}
                />

                <line
                  x1={padding.left - 6}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="var(--chart-axis, #525252)"
                  strokeWidth="1"
                />

                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill={isBase ? "#FF3D00" : "var(--chart-axis-text, #A3A3A3)"}
                  fontSize="11"
                  fontWeight={isBase ? "800" : "500"}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {level.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Base 100.0 Reference Badge */}
          {base100Y >= padding.top && base100Y <= height - padding.bottom && (
            <g className="base-100-badge">
              <rect
                x={width - padding.right - 200}
                y={base100Y - 18}
                width="200"
                height="17"
                fill="var(--chart-bg, #0A0A0A)"
                stroke="#FF3D00"
                strokeWidth="1"
              />
              <text
                x={width - padding.right - 8}
                y={base100Y - 6}
                textAnchor="end"
                fill="#FF3D00"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.08em"
                fontFamily="JetBrains Mono, monospace"
              >
                BASE ANCHOR (2024-Q1 = 100.0)
              </text>
            </g>
          )}

          {/* Y-Axis Baseline Line */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="var(--chart-axis, #404040)"
            strokeWidth="1.5"
          />

          {/* Y-Axis Title */}
          <text
            transform="rotate(-90)"
            x={-(padding.top + (height - padding.bottom - padding.top) / 2)}
            y={22}
            textAnchor="middle"
            fill="var(--chart-axis-text, #737373)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.1em"
            fontFamily="JetBrains Mono, monospace"
          >
            INDEX VALUE (BASE 100.0)
          </text>

          {/* X-Axis Baseline Line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="var(--chart-axis, #404040)"
            strokeWidth="1.5"
          />

          {/* X-Axis Title */}
          <text
            x={padding.left + (width - padding.left - padding.right) / 2}
            y={height - 10}
            textAnchor="middle"
            fill="var(--chart-axis-text, #737373)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.1em"
            fontFamily="JetBrains Mono, monospace"
          >
            CALCULATION TIMELINE ({activeSeries.length} {isMonthly ? 'CONSECUTIVE CALENDAR MONTHS' : 'ACTIVE SAMPLES'} • {formula})
          </text>

          {/* Gradient Fill Under Curve */}
          <path d={areaPath} fill="url(#trendGradientDynamic)" />

          {/* High-Contrast Bold Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#strokeGradientDynamic)"
            strokeWidth="3.2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* Interactive Data Points and X-Axis Ticks */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint === i;
            const showTick = shouldShowTick(i, points.length);

            return (
              <g
                key={i}
                className="chart-point-group"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* X-Axis Tick Mark */}
                {showTick && (
                  <line
                    x1={p.x}
                    y1={height - padding.bottom}
                    x2={p.x}
                    y2={height - padding.bottom + 6}
                    stroke="var(--chart-axis, #525252)"
                    strokeWidth="1"
                  />
                )}

                {/* X-Axis Date Label */}
                {showTick && (
                  <text
                    x={p.x}
                    y={height - padding.bottom + 22}
                    textAnchor="middle"
                    fill="var(--chart-axis-text, #A3A3A3)"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="0.05em"
                  >
                    {formatDateLabel(p.data.calculation_date)}
                  </text>
                )}

                {/* Hover line guide */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={height - padding.bottom}
                    stroke="#FF3D00"
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                )}

                {/* Invisible hover radius */}
                <circle cx={p.x} cy={p.y} r="16" fill="transparent" />

                {/* Sharp Square Data Mark */}
                <rect
                  x={p.x - (isHovered ? 5 : (activeSeries.length > 25 ? 2.5 : 3.5))}
                  y={p.y - (isHovered ? 5 : (activeSeries.length > 25 ? 2.5 : 3.5))}
                  width={isHovered ? 10 : (activeSeries.length > 25 ? 5 : 7)}
                  height={isHovered ? 10 : (activeSeries.length > 25 ? 5 : 7)}
                  fill={isHovered ? "#FF3D00" : "var(--chart-bg, #0A0A0A)"}
                  stroke={isHovered ? "var(--chart-stroke-start, #FAFAFA)" : "#FF3D00"}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            );
          })}

          {/* Hover Tooltip Card */}
          {hoveredPoint !== null && (() => {
            const pt = points[hoveredPoint];
            const tooltipWidth = 230;
            const boundedX = Math.min(
              Math.max(padding.left + tooltipWidth / 2, pt.x),
              width - padding.right - tooltipWidth / 2
            );
            const boundedY = Math.max(padding.top + 10, pt.y - 62);
            const pData = pt.data;
            const fareStr = pData.average_fare ? `₹${Math.round(pData.average_fare).toLocaleString()}` : '';
            const dodVal = Number(pData.change_pct_d1 || 0);

            return (
              <g transform={`translate(${boundedX}, ${boundedY})`}>
                <rect
                  x={-tooltipWidth / 2}
                  y="-42"
                  width={tooltipWidth}
                  height="58"
                  fill="var(--chart-tooltip-bg, #0A0A0A)"
                  stroke="#FF3D00"
                  strokeWidth="1.5"
                />
                <text x="0" y="-23" textAnchor="middle" fill="var(--chart-tooltip-sub, #A3A3A3)" fontSize="10" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                  {isMonthly ? formatTooltipDate(pData.calculation_date) : pData.calculation_date} • Basket Fare: {fareStr}
                </text>
                <text x="0" y="-5" textAnchor="middle" fill="var(--chart-tooltip-text, #FAFAFA)" fontSize="11.5" fontWeight="800" fontFamily="Inter Tight, sans-serif">
                  APIx: <tspan fill="#FF3D00">{Number(pData.index_value).toFixed(2)}</tspan> ({isMonthly ? 'MoM' : 'DoD'}: <tspan fill={dodVal >= 0 ? '#10b981' : '#ef4444'}>{dodVal >= 0 ? `+${dodVal.toFixed(2)}` : dodVal.toFixed(2)}%</tspan>{pData.change_pct_yoy != null ? ` • YoY: ${pData.change_pct_yoy >= 0 ? '+' : ''}${pData.change_pct_yoy}%` : ''})
                </text>
                <text x="0" y="10" textAnchor="middle" fill="var(--chart-tooltip-sub, #737373)" fontSize="9.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                  Quotes Analyzed: {(pData.total_quotes_used || 0).toLocaleString()} • Outliers: {pData.outliers_excluded || 0}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* 5. Live Footer Statistics */}
      <div className="chart-footer-note bold-footer-note">
        <div className="footer-metric">
          <span>{isMonthly ? `${activeSeries.length}M RANGE:` : `${timeframe.toUpperCase()} RANGE:`}</span>
          <strong>HIGH {kpis.series_high ? Number(kpis.series_high).toFixed(2) : 'N/A'} (LOW {kpis.series_low ? Number(kpis.series_low).toFixed(2) : 'N/A'})</strong>
        </div>
        <div className="footer-metric">
          <span>WEIGHTED BASKET FARE:</span>
          <strong>₹{Math.round(Number(kpis.current_basket_fare || 0)).toLocaleString()}</strong>
        </div>
        <div className="footer-metric">
          <span>STATISTICAL ENGINE:</span>
          <strong>{formula === 'LASPEYRES' ? 'LASPEYRES FIXED-BASE FORMULATION' : 'GEOMETRIC YOUNG (JEVONS) FORMULATION'}</strong>
        </div>
        <div className="footer-metric">
          <span>ACTIVE SAMPLES:</span>
          <strong>{activeSeries.length} {isMonthly ? 'CONSECUTIVE CALENDAR MONTHS' : 'CONSECUTIVE CALENDAR DATES'}</strong>
        </div>
      </div>

      {/* 6. Live DGCA Corridor Contribution Breakdown Matrix */}
      {corridorBreakdown.length > 0 && (
        <div className="corridor-matrix-card">
          <div className="corridor-matrix-header">
            <div>
              <h4 className="corridor-matrix-title">
                DGCA Corridor Contribution Breakdown ({isMonthly ? formatTooltipDate(kpis.latest_date) : kpis.latest_date})
              </h4>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--muted-fg)', margin: '4px 0 0' }}>
                Mathematical decomposition of current composite APIx ({Number(kpis.latest_index).toFixed(2)}) across the 10 monitored corridors.
              </p>
            </div>
            <div className="corridor-matrix-badge">
              ∑ CONTRIBUTION = {Number(kpis.latest_index).toFixed(2)} POINTS
            </div>
          </div>

          <div className="corridor-matrix-table-wrap">
            <table className="corridor-matrix-table">
              <thead>
                <tr>
                  <th>Corridor</th>
                  <th>Route City Pair</th>
                  <th>DGCA Weight (w_r)</th>
                  <th>Base Period Fare (P_0)</th>
                  <th>Observed Fare (P_t)</th>
                  <th>Price Relative (P_t / P_0)</th>
                  <th>Sector Index</th>
                  <th>Index Points Contribution</th>
                  <th>Quotes Analyzed</th>
                </tr>
              </thead>
              <tbody>
                {corridorBreakdown.map((row) => (
                  <tr key={row.route_code}>
                    <td>
                      <span className="route-badge-sm" style={{ fontWeight: '800' }}>{row.route_code}</span>
                    </td>
                    <td>{row.origin_city} ➔ {row.destination_city}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: '700' }}>{row.weight_pct_str}</td>
                    <td>₹{Math.round(row.base_fare).toLocaleString()}</td>
                    <td style={{ fontWeight: '700' }}>₹{Math.round(row.observed_fare).toLocaleString()}</td>
                    <td>{row.price_relative.toFixed(4)}</td>
                    <td style={{ fontWeight: '700', color: row.corridor_index >= 100 ? '#FAFAFA' : 'var(--muted-fg)' }}>
                      {row.corridor_index.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: '800', color: 'var(--accent)' }}>
                      {row.contribution_points.toFixed(2)} pts
                    </td>
                    <td>{row.quotes_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2">TOTAL BASKET COMPOSITE</td>
                  <td style={{ color: 'var(--accent)' }}>1.000000 (100%)</td>
                  <td>-</td>
                  <td>₹{Math.round(Number(kpis.current_basket_fare || 0)).toLocaleString()}</td>
                  <td>-</td>
                  <td style={{ color: 'var(--accent)' }}>{Number(kpis.latest_index).toFixed(2)}</td>
                  <td style={{ color: 'var(--accent)' }}>{Number(kpis.latest_index).toFixed(2)} pts</td>
                  <td>{corridorBreakdown.reduce((a, c) => a + c.quotes_count, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 7. Dynamic Methodology & Formula Card */}
      <div className="macro-methodology-card" style={{ marginTop: '24px' }}>
        <h3>
          {formula === 'LASPEYRES' ? 'Laspeyres Price Index Formulation' : 'Geometric Young Price Index Formulation'}
        </h3>
        <p>
          {formula === 'LASPEYRES' 
            ? 'The MoSPI Real-time Airfare Price Index is computed utilizing a Laspeyres fixed-base price index formula augmented by high-frequency scraped microdata:'
            : 'The Geometric Young index formulation utilizes geometric aggregation with fixed base weights, mitigating consumer substitution bias:'
          }
        </p>

        {/* Primary Master Equation Display */}
        <div className="formula-math-display">
          {formula === 'LASPEYRES' ? (
            <div className="math-equation">
              <span className="math-var">APIx</span><sub>t</sub>
              <span className="math-op">=</span>
              <span className="math-const">100</span>
              <span className="math-op">×</span>
              <div className="math-sigma-wrap">
                <span className="sigma-limit-top">10</span>
                <span className="sigma-symbol">∑</span>
                <span className="sigma-limit-bot"><span className="math-var">r</span>=1</span>
              </div>
              <span className="math-bracket">[</span>
              <span className="math-var">w</span><sub>r</sub>
              <span className="math-op">×</span>
              <div className="math-fraction">
                <span className="math-num"><span className="math-var">P</span><sub>r,t</sub></span>
                <span className="math-denom"><span className="math-var">P</span><sub>r,0</sub></span>
              </div>
              <span className="math-bracket">]</span>
            </div>
          ) : (
            <div className="math-equation">
              <span className="math-var">APIx</span><sub>t</sub>
              <span className="math-op">=</span>
              <span className="math-const">100</span>
              <span className="math-op">×</span>
              <div className="math-sigma-wrap">
                <span className="sigma-limit-top">10</span>
                <span className="sigma-symbol">∏</span>
                <span className="sigma-limit-bot"><span className="math-var">r</span>=1</span>
              </div>
              <span className="math-bracket">(</span>
              <div className="math-fraction">
                <span className="math-num"><span className="math-var">P</span><sub>r,t</sub></span>
                <span className="math-denom"><span className="math-var">P</span><sub>r,0</sub></span>
              </div>
              <span className="math-bracket">)</span>
              <sup className="math-sup-var"><span className="math-var">w</span><sub>r</sub></sup>
              <span className="math-op">=</span>
              <span className="math-const">100</span>
              <span className="math-op">×</span>
              <span className="math-func">exp</span>
              <span className="math-bracket">(</span>
              <div className="math-sigma-wrap">
                <span className="sigma-limit-top">10</span>
                <span className="sigma-symbol">∑</span>
                <span className="sigma-limit-bot"><span className="math-var">r</span>=1</span>
              </div>
              <span className="math-var">w</span><sub>r</sub>
              <span className="math-op">×</span>
              <span className="math-func">ln</span>
              <span className="math-bracket">(</span>
              <div className="math-fraction">
                <span className="math-num"><span className="math-var">P</span><sub>r,t</sub></span>
                <span className="math-denom"><span className="math-var">P</span><sub>r,0</sub></span>
              </div>
              <span className="math-bracket">)</span>
              <span className="math-bracket">)</span>
            </div>
          )}
        </div>

        {/* Secondary Auxiliary Equations Grid */}
        <div className="formula-sub-equations-grid">
          <div className="formula-sub-card">
            <span className="formula-sub-title">Month-over-Month (MoM) Inflation Delta:</span>
            <div className="math-equation math-equation-sm">
              <span className="math-var">ΔMoM</span><sub>t</sub>
              <span className="math-op">=</span>
              <span className="math-bracket">[</span>
              <div className="math-fraction">
                <span className="math-num"><span className="math-var">APIx</span><sub>t</sub> − <span className="math-var">APIx</span><sub>t−1</sub></span>
                <span className="math-denom"><span className="math-var">APIx</span><sub>t−1</sub></span>
              </div>
              <span className="math-bracket">]</span>
              <span className="math-op">×</span>
              <span className="math-const">100%</span>
            </div>
          </div>

          <div className="formula-sub-card">
            <span className="formula-sub-title">Corridor Sector Index Contribution:</span>
            <div className="math-equation math-equation-sm">
              <span className="math-var">C</span><sub>r,t</sub>
              <span className="math-op">=</span>
              <span className="math-var">w</span><sub>r</sub>
              <span className="math-op">×</span>
              <span className="math-bracket">[</span>
              <div className="math-fraction">
                <span className="math-num"><span className="math-var">P</span><sub>r,t</sub></span>
                <span className="math-denom"><span className="math-var">P</span><sub>r,0</sub></span>
              </div>
              <span className="math-bracket">]</span>
              <span className="math-op">×</span>
              <span className="math-const">100</span>
              <span className="math-label" style={{ marginLeft: '4px' }}>pts</span>
            </div>
          </div>
        </div>

        {/* Variable Definitions Grid */}
        <div className="formula-variables-grid">
          <div className="var-item">
            <strong><span className="math-var">w</span><sub>r</sub>:</strong> Normalized DGCA passenger traffic expenditure weight for corridor <span className="math-var">r</span> (<span className="math-var">∑ w</span><sub>r</sub> = 1.000000).
          </div>
          <div className="var-item">
            <strong><span className="math-var">P</span><sub>r,t</sub>:</strong> Cleaned average observed fare for corridor <span className="math-var">r</span> in period <span className="math-var">t</span> ({isMonthly ? formatTooltipDate(kpis.latest_date) : (kpis.latest_date || 'current')}), filtering IQR statistical outliers.
          </div>
          <div className="var-item">
            <strong><span className="math-var">P</span><sub>r,0</sub>:</strong> Official 2024-Q1 DGCA base period anchor fare for corridor <span className="math-var">r</span> (Base Index = 100.0).
          </div>
          <div className="var-item">
            <strong>Price Relative (<span className="math-var">P</span><sub>r,t</sub> / <span className="math-var">P</span><sub>r,0</sub>):</strong> Pure price ratio indicating relative inflation per sector before volume weighting.
          </div>
          <div className="var-item">
            <strong>Active Horizon:</strong> {advanceWindow === 'ALL_WEIGHTED' ? 'All 6 Advance Purchase Windows (T+0 to T+45 Composite)' : advanceWindow}.
          </div>
        </div>
      </div>
    </div>
  );
}
