import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { CITY_COORDS, MAP_VIEWBOX, INDIA_SVG_PATH, INDIA_STATES_PATH } from './indiaMapData';

export default function IndiaRouteMap({ routes = [], onSelectRoute, selectedRouteCode }) {
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);

  const activeRoute = routes.find(r => r.route_code === (hoveredRoute || selectedRouteCode)) || routes[0];

  return (
    <div className="india-map-container">
      <div className="map-panel-header">
        <div>
          <div className="map-badge-pill">
            <Compass size={13} className="spin-slow" />
            <span>DGCA AIR CORRIDORS RADAR</span>
          </div>
          <h3 className="map-title">Indian Domestic Route Basket</h3>
          <p className="map-subtitle">Official Survey of India Boundaries • Top 10 High-Density MoSPI Corridors</p>
        </div>

        {activeRoute && (
          <div className="map-active-corridor-card">
            <div className="corridor-top-row">
              <span className="corridor-code">{activeRoute.route_code}</span>
              <span className="corridor-weight">{activeRoute.weight_pct_str || `${((activeRoute.weight || 0.1) * 100).toFixed(2)}%`} Weight</span>
            </div>
            <div className="corridor-names">
              {activeRoute.origin_city} ➔ {activeRoute.destination_city}
            </div>
            <div className="corridor-metrics">
              <span><strong>{activeRoute.distance_km} km</strong> Great-Circle</span>
              <span>•</span>
              <span><strong>{(activeRoute.annual_passengers || 0).toLocaleString()}</strong> Pax/yr</span>
            </div>
          </div>
        )}
      </div>

      <div className="svg-map-wrapper">
        <svg
          viewBox={MAP_VIEWBOX}
          className="india-air-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Radial glow for airport beacons */}
            <radialGradient id="beaconGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4d00" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff4d00" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
            </linearGradient>

            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d00" stopOpacity="1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
            </linearGradient>

            {/* Clean subtle shadow on the map outline */}
            <filter id="mapShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Airspace grid & radar rings */}
          <circle cx="320" cy="360" r="300" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 4" className="radar-ring-circle" />
          <circle cx="320" cy="360" r="200" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 4" className="radar-ring-circle" />
          <circle cx="320" cy="360" r="100" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 4" className="radar-ring-circle" />

          <line x1="320" y1="20" x2="320" y2="700" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" className="radar-axis-line" />
          <line x1="20" y1="360" x2="620" y2="360" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" className="radar-axis-line" />

          {/* Official Survey of India (SOI) Geographic Landmass Layer */}
          <g className="india-landmass-layer" filter="url(#mapShadow)">
            <path
              d={INDIA_SVG_PATH}
              className="india-landmass-path"
              fill="#181a1e"
              stroke="#ff4d00"
              strokeWidth="1.2"
              strokeOpacity="0.55"
              strokeLinejoin="round"
              fillRule="evenodd"
            />
          </g>

          {/* State-Level Administrative Borders */}
          <g className="india-states-layer">
            <path
              d={INDIA_STATES_PATH}
              className="india-states-path"
              fill="none"
              stroke="rgba(248, 113, 113, 0.30)"
              strokeWidth="0.9"
              strokeLinejoin="round"
              strokeDasharray="4 2.5"
            />
          </g>

          {/* Flight Trajectory Great-Circle Arcs across India */}
          {routes.map((r) => {
            const orig = CITY_COORDS[r.origin_code];
            const dest = CITY_COORDS[r.destination_code];
            if (!orig || !dest) return null;

            // Subtle curved control point for great circle arc
            const dx = dest.x - orig.x;
            const dy = dest.y - orig.y;
            const cx = (orig.x + dest.x) / 2 - dy * 0.18;
            const cy = (orig.y + dest.y) / 2 + dx * 0.18;

            const isSelected = (r.route_code === selectedRouteCode);
            const isHovered = (r.route_code === hoveredRoute);
            const strokeWidth = isSelected || isHovered ? 3.5 : Math.max(1.8, (r.weight || 0.1) * 10);

            return (
              <g
                key={r.route_code}
                className="route-path-group"
                onMouseEnter={() => setHoveredRoute(r.route_code)}
                onMouseLeave={() => setHoveredRoute(null)}
                onClick={() => onSelectRoute && onSelectRoute(r)}
                style={{ cursor: 'pointer' }}
              >
                {/* Wider invisible stroke for easy hit testing */}
                <path
                  d={`M ${orig.x} ${orig.y} Q ${cx} ${cy} ${dest.x} ${dest.y}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="24"
                />

                {/* Visible corridor arc */}
                <path
                  d={`M ${orig.x} ${orig.y} Q ${cx} ${cy} ${dest.x} ${dest.y}`}
                  fill="none"
                  stroke={isSelected || isHovered ? "url(#activeGrad)" : "url(#corridorGrad)"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isSelected || isHovered ? "none" : "5 4"}
                  className={`corridor-arc-path route-arc ${isSelected ? 'selected-arc' : ''}`}
                />

                {/* Animated flight beacon dot */}
                {(isSelected || isHovered) && (
                  <circle
                    r="4.5"
                    fill="#ff4d00"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 0 6px #ff4d00)"
                  >
                    <animateMotion
                      path={`M ${orig.x} ${orig.y} Q ${cx} ${cy} ${dest.x} ${dest.y}`}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Airport City Nodes on Indian Map */}
          {Object.entries(CITY_COORDS).map(([code, city]) => {
            const isCityHovered = hoveredCity === code;
            const badgeDx = city.badgeDx ?? 12;
            const badgeDy = city.badgeDy ?? -10;

            return (
              <g
                key={code}
                className="airport-node-group"
                onMouseEnter={() => setHoveredCity(code)}
                onMouseLeave={() => setHoveredCity(null)}
                transform={`translate(${city.x}, ${city.y})`}
                style={{ cursor: 'pointer' }}
              >
                {/* Radar beacon pulse ring */}
                <circle cx="0" cy="0" r="14" fill="url(#beaconGlow)" className="radar-beacon-anim" />
                <circle
                  cx="0"
                  cy="0"
                  r="4"
                  fill={isCityHovered ? "#ff4d00" : "#38bdf8"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 0 6px rgba(0,0,0,0.4))"
                />

                {/* Airport Code Badge */}
                <g transform={`translate(${badgeDx}, ${badgeDy})`}>
                  <rect
                    x="0"
                    y="0"
                    width="38"
                    height="18"
                    rx="3"
                    className="airport-badge-rect"
                    fill="#141619"
                    stroke={isCityHovered ? "#ff4d00" : "#27272a"}
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                  />
                  <text
                    x="19"
                    y="13"
                    textAnchor="middle"
                    className={`airport-badge-text ${isCityHovered ? 'hovered' : ''}`}
                    fill={isCityHovered ? "#ff4d00" : "#f1f5f9"}
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="monospace"
                    letterSpacing="0.5"
                  >
                    {code}
                  </text>
                </g>

                {/* City Name Caption */}
                <text
                  x={badgeDx + 19}
                  y={badgeDy + 28}
                  textAnchor="middle"
                  className="airport-city-caption"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="map-legend-row">
        <div className="legend-item">
          <span className="legend-line line-solid"></span>
          <span>Selected Corridor ({activeRoute?.route_code || 'DEL-BOM'} {activeRoute?.weight_pct_str || '22.35%'})</span>
        </div>
        <div className="legend-item">
          <span className="legend-line line-dashed"></span>
          <span>Official DGCA Basket Corridors</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-pulse"></span>
          <span>Monitored Indian Airport Node</span>
        </div>
      </div>
    </div>
  );
}
