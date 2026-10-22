import React, { useState, useEffect, useMemo } from 'react';
import { Compass, Flame, Info, Calendar, Filter, Sparkles, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

// GitHub-style contribution color palette (Dark & Light modes)
const DARK_HEAT_COLORS = {
  0: '#161b22', // baseline / inactive
  1: '#0e4429', // low intensity
  2: '#006d32', // medium intensity
  3: '#26a641', // high intensity
  4: '#39d353'  // peak intensity
};

const LIGHT_HEAT_COLORS = {
  0: '#E2E8F0', // baseline / inactive
  1: '#BBF7D0', // low intensity
  2: '#4ADE80', // medium intensity
  3: '#16A34A', // high intensity
  4: '#15803D'  // peak intensity
};

export default function IndiaAirfareHeatmap({
  routes = [],
  selectedRoute,
  onSelectRoute,
  indexSeries = [],
  overviewData,
  theme = 'dark'
}) {
  const isLight = theme === 'light';
  const heatColors = isLight ? LIGHT_HEAT_COLORS : DARK_HEAT_COLORS;
  const [activeTab, setActiveTab] = useState('corridors'); // 'corridors' | 'calendar'
  const [hoveredCell, setHoveredCell] = useState(null);
  const [dynamicHeatmap, setDynamicHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch authentic microdata matrix & calendar from backend
  useEffect(() => {
    let isMounted = true;
    async function loadHeatmap() {
      try {
        const data = await apiService.getHeatmapData();
        if (isMounted && data) {
          setDynamicHeatmap(data);
        }
      } catch (err) {
        console.error('Failed to load dynamic heatmap from backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHeatmap();
    return () => { isMounted = false; };
  }, []);

  // Corridors & cells from backend or fallback to routes
  const corridorsList = useMemo(() => {
    if (dynamicHeatmap?.corridors && dynamicHeatmap.corridors.length > 0) {
      return dynamicHeatmap.corridors;
    }
    if (routes && routes.length > 0) {
      return routes.slice(0, 10).map(r => ({
        ...r,
        cells: []
      }));
    }
    return [];
  }, [dynamicHeatmap, routes]);

  // 35 days header strip
  const corridorDays = useMemo(() => {
    if (dynamicHeatmap?.corridor_days && dynamicHeatmap.corridor_days.length > 0) {
      return dynamicHeatmap.corridor_days;
    }
    const days = [];
    const today = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      days.push({
        dateStr,
        label: `${monthName} ${dayNum}`,
        monthName,
        dayNum,
        dayIndex: 34 - i
      });
    }
    return days;
  }, [dynamicHeatmap]);

  // 52-week Annual Calendar Matrix data from backend
  const calendarWeeks = useMemo(() => {
    if (dynamicHeatmap?.calendar_weeks && dynamicHeatmap.calendar_weeks.length > 0) {
      return dynamicHeatmap.calendar_weeks.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          color: heatColors[d.level] || heatColors[0]
        }))
      }));
    }
    return [];
  }, [dynamicHeatmap, heatColors]);

  const handleSelectRoute = (route) => {
    if (!onSelectRoute) return;
    onSelectRoute(route);
  };

  return (
    <div className="mospi-heatmap-section github-styled-heatmap">
      {/* 1. Header with Title & View Switcher */}
      <div className="mospi-heatmap-header">
        <div className="heatmap-header-left">
          <Compass size={18} className="text-vermillion" />
          <h3 className="heatmap-title">INDIA AIRFARE HEATMAP</h3>
          <span className="corridor-count-tag font-mono">10 DGCA Corridors • Live Quotes</span>
        </div>

        <div className="heatmap-view-toggle">
          <button
            type="button"
            className={`toggle-tab-btn ${activeTab === 'corridors' ? 'active' : ''}`}
            onClick={() => setActiveTab('corridors')}
          >
            All Corridors Matrix
          </button>
          <button
            type="button"
            className={`toggle-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Annual Calendar View
          </button>
        </div>
      </div>

      {/* 2. Interactive Heatmap View */}
      {activeTab === 'corridors' ? (
        /* View 1: All 10 DGCA Corridors × 35 Days Matrix */
        <div className="corridor-matrix-wrapper">
          <div className="corridor-matrix-inner">
            {/* Column Date Headers */}
            <div className="matrix-header-row">
              <div className="matrix-corner-label">CORRIDORS</div>
              <div className="matrix-dates-strip">
                {corridorDays.map((d, i) => {
                  const showLabel = i % 5 === 0 || i === corridorDays.length - 1;
                  return (
                    <div key={d.dateStr} className="matrix-date-col-header">
                      {showLabel ? <span className="date-header-text font-mono">{d.label}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Rows (All 10 Routes) */}
            <div className="matrix-rows-list">
              {corridorsList.map((route, rIdx) => {
                const isSelected = selectedRoute?.route_code === route.route_code;
                const routeCells = route.cells || [];
                return (
                  <div
                    key={route.route_code ? `corridor-${route.route_code}-${rIdx}` : `corridor-${rIdx}`}
                    className={`matrix-route-row ${isSelected ? 'is-selected-row' : ''}`}
                    onClick={() => handleSelectRoute(route)}
                  >
                    {/* Left Corridor Name Label */}
                    <div className="matrix-route-label" title={`${route.origin_city} to ${route.destination_city} • Avg: ₹${Math.round(route.average_fare || 0).toLocaleString()}`}>
                      <span className="route-code-pill font-mono">{route.route_code}</span>
                      <span className="route-cities-short">{route.origin_city} ➔ {route.destination_city}</span>
                      {route.average_fare != null && (
                        <span className="route-avg-fare-tag font-mono" style={{ marginLeft: 'auto', marginRight: '6px', fontSize: '11px', color: '#10B981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                          ₹{Math.round(route.average_fare).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Heat Cells Grid */}
                    <div className="matrix-cells-strip">
                      {corridorDays.map((day, dIdx) => {
                        const cellData = routeCells[dIdx] || {
                          level: 0,
                          fare: '—',
                          pctChange: '0.0%',
                          quotes: 0
                        };
                        const cellColor = heatColors[cellData.level] || heatColors[0];
                        return (
                          <div
                            key={`${route.route_code}-${day.dateStr}`}
                            className="gh-heat-cell"
                            style={{ backgroundColor: cellColor }}
                            onMouseEnter={() => setHoveredCell({
                              route,
                              day,
                              ...cellData,
                              color: cellColor
                            })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRoute(route);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* View 2: GitHub 52-Week Contribution Grid (Sep to Aug, Mon/Wed/Fri) */
        <div className="annual-calendar-wrapper">
          <div className="annual-calendar-inner">
            {/* Month Labels Strip */}
            <div className="calendar-months-header">
              <div className="calendar-day-placeholder"></div>
              <div className="calendar-months-strip">
                {calendarWeeks.map((w) => (
                  <div key={w.weekIndex} className="month-label-col">
                    {w.monthLabel && <span className="month-text">{w.monthLabel}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekday Labels & Grid */}
            <div className="calendar-body-flex">
              <div className="calendar-days-column">
                <span className="day-name-label">Mon</span>
                <span className="day-name-label">Wed</span>
                <span className="day-name-label">Fri</span>
              </div>

              <div className="calendar-weeks-grid">
                {calendarWeeks.map((w) => (
                  <div key={w.weekIndex} className="calendar-week-col">
                    {w.days.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        className="gh-heat-cell"
                        style={{ backgroundColor: d.color }}
                        onMouseEnter={() => setHoveredCell({
                          dateLabel: d.dateLabel,
                          level: d.level,
                          quotes: d.quotes,
                          isCalendar: true
                        })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Floating / Embedded Cell Tooltip */}
      {hoveredCell && (
        <div className="heatmap-hover-tooltip font-mono">
          {hoveredCell.isCalendar ? (
            <span>
              <strong>{hoveredCell.quotes > 0 ? `${hoveredCell.quotes} Price Quotes` : 'No Scrape Anomalies'}</strong> on {hoveredCell.dateLabel}
            </span>
          ) : (
            <span>
              <strong>{hoveredCell.route.route_code}</strong> ({hoveredCell.route.origin_city} → {hoveredCell.route.destination_city}) on {hoveredCell.day.label}:{' '}
              <span className="text-emerald">{hoveredCell.fare}</span> ({hoveredCell.pctChange}) • {hoveredCell.quotes} quotes
            </span>
          )}
        </div>
      )}

      {/* 4. Bottom Footer with Legend: Less [■][■][■][■][■] More */}
      <div className="heatmap-footer-row">
        <div className="footer-meta-note">
          <span>Active microdata tracking across all 10 DGCA corridors • Select any row to filter</span>
        </div>

        <div className="github-legend-group">
          <span className="legend-label">Less</span>
          <div className="legend-squares">
            <span className="legend-cell" style={{ backgroundColor: heatColors[0] }} title="Level 0: Baseline" />
            <span className="legend-cell" style={{ backgroundColor: heatColors[1] }} title="Level 1: Low" />
            <span className="legend-cell" style={{ backgroundColor: heatColors[2] }} title="Level 2: Normal" />
            <span className="legend-cell" style={{ backgroundColor: heatColors[3] }} title="Level 3: High" />
            <span className="legend-cell" style={{ backgroundColor: heatColors[4] }} title="Level 4: Surge" />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  );
}

