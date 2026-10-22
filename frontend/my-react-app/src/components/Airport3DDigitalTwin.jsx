import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plane,
  Compass,
  Wind,
  Thermometer,
  Gauge,
  DollarSign,
  TrendingUp,
  Users,
  Activity,
  Sparkles,
  Clock,
  Building2,
  Navigation,
  Radar,
  Radio,
  Layers,
  ShieldCheck,
  Search,
  ChevronRight,
  X,
  RefreshCw,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { getApiUrl, fetchWithAuth } from '../services/api';

// ============================================================================
// MASTER METADATA FOR 20 MAJOR DGCA AIRPORTS (HUBS, RUNWAYS, OPERATORS)
// ============================================================================
const AIRPORTS = [
  { code: 'DEL', icao: 'VIDP', name: 'Indira Gandhi International Airport', city: 'New Delhi', operator: 'DIAL (GMR Group / AAI)', lat: 28.5562, lon: 77.1000, zoom: 11, elevation: '777 ft', color: '#38BDF8' },
  { code: 'BOM', icao: 'VABB', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', operator: 'MIAL (Adani / AAI)', lat: 19.0896, lon: 72.8656, zoom: 11, elevation: '39 ft', color: '#F59E0B' },
  { code: 'BLR', icao: 'VOBL', name: 'Kempegowda International Airport', city: 'Bengaluru', operator: 'BIAL (Fairfax / Siemens / AAI)', lat: 13.1986, lon: 77.7066, zoom: 11, elevation: '3,000 ft', color: '#10B981' },
  { code: 'HYD', icao: 'VOHS', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', operator: 'GHIAL (GMR Group / AAI)', lat: 17.2403, lon: 78.4294, zoom: 11, elevation: '2,024 ft', color: '#8B5CF6' },
  { code: 'CCU', icao: 'VECC', name: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata', operator: 'Airports Authority of India (AAI)', lat: 22.6547, lon: 88.4467, zoom: 11, elevation: '16 ft', color: '#EC4899' },
  { code: 'MAA', icao: 'VOMM', name: 'Chennai International Airport', city: 'Chennai', operator: 'Airports Authority of India (AAI)', lat: 12.9941, lon: 80.1709, zoom: 11, elevation: '52 ft', color: '#06B6D4' },
  { code: 'GOI', icao: 'VOGO', name: 'Goa Dabolim & Mopa (GOX) Gateway', city: 'Goa', operator: 'AAI & GMR Goa', lat: 15.3808, lon: 73.8314, zoom: 11, elevation: '184 ft', color: '#14B8A6' },
  { code: 'PNQ', icao: 'VAPO', name: 'Pune International Airport', city: 'Pune', operator: 'Airports Authority of India (Civil Enclave)', lat: 18.5822, lon: 73.9197, zoom: 11, elevation: '1,942 ft', color: '#6366F1' },
  { code: 'IXC', icao: 'VICG', name: 'Shaheed Bhagat Singh International Airport', city: 'Chandigarh', operator: 'CHIAL (AAI / Punjab / Haryana)', lat: 30.6735, lon: 76.7885, zoom: 11, elevation: '1,012 ft', color: '#0284C7' },
  { code: 'AMD', icao: 'VAAH', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', operator: 'Adani Airport Holdings Ltd (AAHL)', lat: 23.0772, lon: 72.6347, zoom: 11, elevation: '189 ft', color: '#F97316' },
  { code: 'COK', icao: 'VOCI', name: 'Cochin International Airport', city: 'Kochi', operator: 'CIAL (World 1st 100% Solar Airport)', lat: 10.1556, lon: 76.3917, zoom: 11, elevation: '30 ft', color: '#22C55E' },
  { code: 'JAI', icao: 'VIJP', name: 'Jaipur International Airport', city: 'Jaipur', operator: 'Adani Airport Holdings Ltd (AAHL)', lat: 26.8242, lon: 75.8122, zoom: 11, elevation: '1,263 ft', color: '#E11D48' },
  { code: 'LKO', icao: 'VILK', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', operator: 'Adani Airport Holdings Ltd (AAHL)', lat: 26.7606, lon: 80.8893, zoom: 11, elevation: '405 ft', color: '#D97706' },
  { code: 'GAU', icao: 'VEGT', name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', operator: 'Adani Airport Holdings Ltd (AAHL)', lat: 26.1061, lon: 91.5859, zoom: 11, elevation: '162 ft', color: '#059669' },
  { code: 'TRV', icao: 'VOTV', name: 'Thiruvananthapuram International Airport', city: 'Trivandrum', operator: 'Adani Airport Holdings Ltd (AAHL)', lat: 8.4821, lon: 76.9200, zoom: 11, elevation: '15 ft', color: '#0D9488' },
  { code: 'BBI', icao: 'VEBS', name: 'Biju Patnaik International Airport', city: 'Bhubaneswar', operator: 'Airports Authority of India (AAI)', lat: 20.2444, lon: 85.8178, zoom: 11, elevation: '140 ft', color: '#7C3AED' },
  { code: 'VNS', icao: 'VEBN', name: 'Lal Bahadur Shastri International Airport', city: 'Varanasi', operator: 'Airports Authority of India (AAI)', lat: 25.4524, lon: 82.8593, zoom: 11, elevation: '266 ft', color: '#B45309' },
  { code: 'SXR', icao: 'VISR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar', operator: 'AAI / Indian Air Force', lat: 33.9871, lon: 74.7741, zoom: 11, elevation: '5,458 ft', color: '#4F46E5' },
  { code: 'PAT', icao: 'VEPT', name: 'Jay Prakash Narayan Airport', city: 'Patna', operator: 'Airports Authority of India (AAI)', lat: 25.5913, lon: 85.0880, zoom: 11, elevation: '170 ft', color: '#EA580C' },
  { code: 'ATQ', icao: 'VIAR', name: 'Sri Guru Ram Dass Jee International Airport', city: 'Amritsar', operator: 'Airports Authority of India (AAI)', lat: 31.7096, lon: 74.7973, zoom: 11, elevation: '756 ft', color: '#CA8A04' }
];

// Helper: Animated counter
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let start = display;
    let end = typeof value === 'number' ? value : 0;
    if (start === end) return;
    let startTime = null;
    const duration = 600;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1.0);
      const current = start + (end - start) * (1 - Math.pow(1 - progress, 3));
      setDisplay(current);
      if (progress < 1.0) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}
      {Number(display).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}

export default function Airport3DDigitalTwin({ theme = 'dark' }) {
  const [selectedAirport, setSelectedAirport] = useState('DEL');
  const [airportSearch, setAirportSearch] = useState('');
  const [activeTab, setActiveTab] = useState('financials'); // 'financials', 'passengers', 'fids', 'radar_list'
  const [fidsType, setFidsType] = useState('departures');
  const [twinData, setTwinData] = useState(null);
  const [allIndianFlights, setAllIndianFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [fidsFilterAirline, setFidsFilterAirline] = useState('ALL');
  const [fidsSearchQuery, setFidsSearchQuery] = useState('');
  const [airspaceSearchQuery, setAirspaceSearchQuery] = useState('');
  const [airspaceFilterAirline, setAirspaceFilterAirline] = useState('ALL');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeLinesRef = useRef({ flown: null, remaining: null, originPin: null, destPin: null });
  const rangeRingsRef = useRef([]);
  const aircraftKinematicsRef = useRef(new Map());
  const animFrameIdRef = useRef(null);
  const selectedFlightRef = useRef(null);

  useEffect(() => {
    selectedFlightRef.current = selectedFlight;
  }, [selectedFlight]);

  const apConfig = useMemo(() => {
    return AIRPORTS.find(a => a.code === selectedAirport) || AIRPORTS[0];
  }, [selectedAirport]);

  const filteredAirports = useMemo(() => {
    if (!airportSearch.trim()) return AIRPORTS;
    const q = airportSearch.toLowerCase();
    return AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    );
  }, [airportSearch]);

  // Flights currently within this airport's terminal control area
  const tmaFlights = useMemo(() => {
    return allIndianFlights.filter(f => f.dist_km !== undefined ? f.dist_km <= 260 : true);
  }, [allIndianFlights]);

  // ============================================================================
  // 1. DATA FETCHING (OpenSky All Indian Flights + Airport Digital Twin)
  // ============================================================================
  const fetchAirportData = async (code, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Fetch both airport operational twin and all live flights in Indian airspace
      const [twinRes, nationalRes] = await Promise.all([
        fetchWithAuth(getApiUrl(`/airports/${code}/digital-twin`)).then(r => r.json()),
        fetchWithAuth(getApiUrl(`/airports/${code}/live-flights?radius_deg=50`)).then(r => r.json()).catch(() => ({ flights: [] }))
      ]);

      setTwinData(twinRes);
      const flightsList = nationalRes?.flights || twinRes?.live_radar || [];
      setAllIndianFlights(flightsList);
      setLastUpdated(new Date().toLocaleTimeString());

      // Update kinematics ref for smooth 60fps dead-reckoning motion
      const nowMs = performance.now();
      flightsList.forEach(fl => {
        const key = fl.icao24 || fl.commercial_flight_number || fl.callsign;
        const existing = aircraftKinematicsRef.current.get(key);
        aircraftKinematicsRef.current.set(key, {
          ...fl,
          lastUpdateTime: nowMs,
          initialLat: fl.lat,
          initialLon: fl.lon,
          currentLat: existing ? existing.currentLat : fl.lat,
          currentLon: existing ? existing.currentLon : fl.lon
        });
      });
    } catch (err) {
      console.error('[Radar] Failed to load live telemetry:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirportData(selectedAirport, false);
  }, [selectedAirport]);

  // Periodic automatic updates (Every 8 seconds from OpenSky backend cache)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAirportData(selectedAirport, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedAirport]);

  // ============================================================================
  // 2. LEAFLET GOOGLE MAPS SATELLITE HYBRID RADAR INITIALIZATION
  // ============================================================================
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!mapInstanceRef.current) {
      const map = L.map(container, {
        center: [apConfig.lat, apConfig.lon],
        zoom: apConfig.zoom,
        minZoom: 4,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // DEFAULT 2D VECTOR ROADMAP (Google Maps Standard 2D Clean Cartography)
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map imagery &copy; Google Maps'
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.flyTo([apConfig.lat, apConfig.lon], apConfig.zoom, { duration: 1.2 });
    }

    const map = mapInstanceRef.current;

    // Draw Range Rings (25 NM, 50 NM, 100 NM centered on airport beacon)
    rangeRingsRef.current.forEach(r => map.removeLayer(r));
    rangeRingsRef.current = [];

    const rings = [
      { radius: 46300, label: '25 NM TMA' },
      { radius: 92600, label: '50 NM TMA' },
      { radius: 185200, label: '100 NM FIR' }
    ];

    rings.forEach(({ radius }, idx) => {
      const circle = L.circle([apConfig.lat, apConfig.lon], {
        radius: radius,
        color: '#FACC15',
        weight: 1,
        dashArray: '4, 8',
        opacity: 0.35 - idx * 0.08,
        fillColor: '#000000',
        fillOpacity: 0.0
      }).addTo(map);
      rangeRingsRef.current.push(circle);
    });

    // Airport Location Pin Icon Generator (Clean Teardrop Location Icon + Rounded Pill, No Square Boxes)
    const createAirportLocationIcon = (ap, isSelected) => {
      const pinColor = isSelected ? '#FACC15' : (ap.color || '#0284C7');
      const pulseHtml = isSelected ? `
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #FACC15; opacity: 0.85; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none; bottom: 0;"></div>
      ` : '';

      return L.divIcon({
        className: 'clean-airport-location-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
            ${pulseHtml}
            <!-- Rounded Pill Airport Badge (No square box) -->
            <div style="background: rgba(15, 23, 42, 0.94); border: 1.5px solid ${pinColor}; border-radius: 14px; padding: 2px 7px; font-family: monospace; font-size: 10px; font-weight: 800; color: #FFFFFF; white-space: nowrap; margin-bottom: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 3px;">
              <span style="color: ${pinColor}; font-size: 9px;">✈</span>
              <span>${ap.code}</span>
            </div>
            <!-- Clean Teardrop Location Pin SVG -->
            <div style="position: relative; width: 22px; height: 28px; display: flex; justify-content: center;">
              <svg width="22" height="28" viewBox="0 0 24 30" fill="${pinColor}">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12zm0 16.5c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5z" stroke="#0F172A" stroke-width="1.2"/>
              </svg>
              ${isSelected ? `<div style="position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF;"></div>` : ''}
            </div>
          </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 48]
      });
    };

    // Render Location Pin Markers for all 20 DGCA Airports
    AIRPORTS.forEach(ap => {
      const isSelected = ap.code === selectedAirport;
      const pinIcon = createAirportLocationIcon(ap, isSelected);
      const apMarker = L.marker([ap.lat, ap.lon], { icon: pinIcon, zIndexOffset: isSelected ? 1200 : 800 }).addTo(map);
      
      apMarker.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 2px 6px; background: #0F172A; border: 1px solid ${ap.color}; border-radius: 4px; color: #FFFFFF;">
          <strong>${ap.code}</strong> — ${ap.name} (${ap.city})
        </div>
      `, { direction: 'top', offset: [0, -32] });

      apMarker.on('click', () => {
        setSelectedAirport(ap.code);
      });

      rangeRingsRef.current.push(apMarker);
    });

  }, [selectedAirport]);

  // ============================================================================
  // 3. FLIGHTRADAR24 AIRLINE-LIVERY AIRCRAFT MARKERS & DOTTED ROUTE LINE
  // ============================================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Authentic Flightradar24 Marker: Airline-colored airplane icon (Bigger & High Focus, No Square Box)
    const createAircraftIcon = (fl, isSelected) => {
      const heading = fl.heading || 0;
      const isGround = fl.on_ground || (fl.altitude_ft < 100);
      const airlineColor = fl.airline_color || '#FACC15';
      const size = isSelected ? 52 : 40;

      return L.divIcon({
        className: 'fr24-clean-aircraft-marker',
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Selection Glow Ring -->
            ${isSelected ? `
              <div style="position: absolute; width: ${size + 18}px; height: ${size + 18}px; border-radius: 50%; border: 2.5px solid ${airlineColor}; box-shadow: 0 0 16px ${airlineColor}; animation: ping 1.8s infinite; pointer-events: none;"></div>
            ` : ''}

            <!-- Rotating Aircraft Silhouette (Airliner Top Profile - High Focus) -->
            <div style="transform: rotate(${heading}deg); transform-origin: center; transition: transform 0.2s ease-out; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.85));">
              <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${isSelected ? '#FFFFFF' : airlineColor}" stroke="#0F172A" stroke-width="${isSelected ? 1.4 : 1.0}">
                <!-- High-detail commercial airliner SVG path -->
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </div>

            <!-- Callsign badge displayed ONLY when flight is clicked/selected (Clean Rounded Capsule, No Square Box) -->
            ${isSelected ? `
              <div style="position: absolute; top: -26px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.96); border: 1.5px solid ${airlineColor}; border-radius: 20px; padding: 2px 9px; font-family: monospace; font-size: 11px; font-weight: 800; color: #FFFFFF; white-space: nowrap; pointer-events: none; display: flex; align-items: center; gap: 5px; box-shadow: 0 3px 10px rgba(0,0,0,0.85);">
                <span style="color: ${airlineColor};">●</span>
                <span>${fl.commercial_flight_number || fl.callsign}</span>
                ${!isGround ? `<span style="color: #94A3B8; font-weight: 500;">${fl.flight_level || 'FL' + Math.round(fl.altitude_ft / 100)}</span>` : '<span style="color: #10B981; font-size: 9px;">GND</span>'}
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
    };

    const currentKeys = new Set();

    allIndianFlights.forEach(fl => {
      const key = fl.icao24 || fl.commercial_flight_number || fl.callsign;
      currentKeys.add(key);
      const isSelected = selectedFlight && (selectedFlight.icao24 === fl.icao24 || selectedFlight.commercial_flight_number === fl.commercial_flight_number);

      const tooltipContent = `
        <div style="font-family: monospace; font-size: 11px; padding: 4px 8px; background: #0F172A; border: 1px solid ${fl.airline_color || '#FACC15'}; border-radius: 6px; color: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.9);">
          <div style="font-weight: 800; color: ${fl.airline_color || '#FACC15'}; display: flex; align-items: center; gap: 5px;">
            <span>${fl.commercial_flight_number || fl.callsign}</span>
            <span style="color: #94A3B8; font-weight: normal; font-size: 10px;">(${fl.airline})</span>
          </div>
          <div style="color: #CBD5E1; font-size: 10px; margin-top: 2px;">
            ${fl.origin ? `${fl.origin.code || fl.origin} → ${fl.destination?.code || fl.destination || '—'}` : 'En route'} • ${fl.on_ground ? 'GND' : `${(fl.altitude_ft || 0).toLocaleString()} ft`} • ${fl.velocity_kts || 0} kts
          </div>
        </div>
      `;

      if (markersRef.current.has(key)) {
        const marker = markersRef.current.get(key);
        marker.setIcon(createAircraftIcon(fl, isSelected));
        marker.setZIndexOffset(isSelected ? 999 : 500);
        marker.unbindTooltip();
        marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -14], opacity: 0.95, className: 'fr24-marker-tooltip' });
      } else {
        const icon = createAircraftIcon(fl, isSelected);
        const marker = L.marker([fl.lat, fl.lon], { icon, zIndexOffset: isSelected ? 999 : 500 }).addTo(map);

        marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -14], opacity: 0.95, className: 'fr24-marker-tooltip' });

        marker.on('click', () => {
          setSelectedFlight(fl);
        });

        markersRef.current.set(key, marker);
      }
    });

    // Cleanup expired markers
    markersRef.current.forEach((marker, key) => {
      if (!currentKeys.has(key)) {
        map.removeLayer(marker);
        markersRef.current.delete(key);
      }
    });

    // =========================================================================
    // DOTTED ROUTE LINE: SOURCE AIRPORT -> CURRENT PLANE -> DESTINATION AIRPORT
    // =========================================================================
    if (routeLinesRef.current.flown) {
      map.removeLayer(routeLinesRef.current.flown);
      routeLinesRef.current.flown = null;
    }
    if (routeLinesRef.current.remaining) {
      map.removeLayer(routeLinesRef.current.remaining);
      routeLinesRef.current.remaining = null;
    }
    if (routeLinesRef.current.originPin) {
      map.removeLayer(routeLinesRef.current.originPin);
      routeLinesRef.current.originPin = null;
    }
    if (routeLinesRef.current.destPin) {
      map.removeLayer(routeLinesRef.current.destPin);
      routeLinesRef.current.destPin = null;
    }

    if (selectedFlight && selectedFlight.origin && selectedFlight.destination) {
      // Resolve lat/lon coordinates whether origin is object or airport code string
      const resolveApCoords = (apRef) => {
        if (!apRef) return null;
        if (typeof apRef === 'object' && apRef.lat && apRef.lon) return apRef;
        const code = typeof apRef === 'string' ? apRef : apRef.code;
        const found = AIRPORTS.find(a => a.code === code);
        return found ? { code: found.code, city: found.city, lat: found.lat, lon: found.lon } : null;
      };

      const origAp = resolveApCoords(selectedFlight.origin);
      const destAp = resolveApCoords(selectedFlight.destination);

      if (origAp && destAp) {
        const origCoords = [origAp.lat, origAp.lon];
        const planeCoords = [selectedFlight.lat, selectedFlight.lon];
        const destCoords = [destAp.lat, destAp.lon];
        const lineColor = selectedFlight.airline_color || '#FACC15';

        // Flown route portion: Airline-colored Dotted Line (starts at origin and follows plane live)
        const flownLine = L.polyline([origCoords, planeCoords], {
          color: lineColor,
          weight: 3.5,
          dashArray: '3, 8',
          opacity: 0.95
        }).addTo(map);

        // Remaining route portion: Bright White/Silver Dashed Line (from plane to destination)
        const remainingLine = L.polyline([planeCoords, destCoords], {
          color: '#FFFFFF',
          weight: 2,
          dashArray: '6, 8',
          opacity: 0.7
        }).addTo(map);

        // Origin Location Pin Marker (Clean Teardrop Location Icon + Rounded Pill, No Square Box)
        const origIcon = L.divIcon({
          className: 'route-orig-location-pin',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); pointer-events: none;">
              <div style="background: rgba(15, 23, 42, 0.94); color: #FFFFFF; border: 1.5px solid #10B981; border-radius: 14px; padding: 2px 8px; font-family: monospace; font-size: 10px; font-weight: 800; white-space: nowrap; margin-bottom: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;">
                <span style="color: #10B981;">●</span>
                <span>FROM: ${origAp.code}</span>
              </div>
              <svg width="22" height="28" viewBox="0 0 24 30" fill="#10B981">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12zm0 16.5c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5z" stroke="#FFFFFF" stroke-width="1.2"/>
              </svg>
            </div>
          `,
          iconSize: [80, 52],
          iconAnchor: [40, 50]
        });
        const origPin = L.marker(origCoords, { icon: origIcon, zIndexOffset: 1100 }).addTo(map);

        // Destination Location Pin Marker (Clean Teardrop Location Icon + Rounded Pill, No Square Box)
        const destIcon = L.divIcon({
          className: 'route-dest-location-pin',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); pointer-events: none;">
              <div style="background: rgba(15, 23, 42, 0.94); color: #FFFFFF; border: 1.5px solid #EF4444; border-radius: 14px; padding: 2px 8px; font-family: monospace; font-size: 10px; font-weight: 800; white-space: nowrap; margin-bottom: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;">
                <span style="color: #EF4444;">●</span>
                <span>TO: ${destAp.code}</span>
              </div>
              <svg width="22" height="28" viewBox="0 0 24 30" fill="#EF4444">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12zm0 16.5c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5z" stroke="#FFFFFF" stroke-width="1.2"/>
              </svg>
            </div>
          `,
          iconSize: [80, 52],
          iconAnchor: [40, 50]
        });
        const destPin = L.marker(destCoords, { icon: destIcon, zIndexOffset: 1100 }).addTo(map);

        routeLinesRef.current = {
          flown: flownLine,
          remaining: remainingLine,
          originPin: origPin,
          destPin: destPin
        };
      }
    }

  }, [allIndianFlights, selectedFlight]);

  // ============================================================================
  // 4. SMOOTH 60 FPS DEAD-RECKONING MOTION & DYNAMIC ROUTE LINE GLIDING
  // ============================================================================
  useEffect(() => {
    let active = true;

    const animateKinematics = () => {
      if (!active) return;
      const nowMs = performance.now();

      aircraftKinematicsRef.current.forEach((data, key) => {
        const marker = markersRef.current.get(key);
        if (!marker) return;

        if (!data.on_ground && data.velocity_kts > 20) {
          const dtSec = Math.max(0, (nowMs - data.lastUpdateTime) / 1000.0);

          if (dtSec < 20.0) {
            const distNm = (data.velocity_kts * dtSec) / 3600.0;
            const headingRad = ((data.heading || 0) * Math.PI) / 180.0;
            const dLat = (distNm * Math.cos(headingRad)) / 60.0;
            const cosLat = Math.cos((data.initialLat * Math.PI) / 180.0);
            const dLon = (distNm * Math.sin(headingRad)) / (60.0 * (cosLat === 0 ? 1 : cosLat));

            const newLat = data.initialLat + dLat;
            const newLon = data.initialLon + dLon;

            data.currentLat = newLat;
            data.currentLon = newLon;

            marker.setLatLng([newLat, newLon]);

            // DYNAMIC 60 FPS ROUTE LINE TRACKING: If this aircraft is the selected one,
            // continuously move the dotted lines along with the plane's live coordinates!
            const sel = selectedFlightRef.current;
            if (sel) {
              const selKey = sel.icao24 || sel.commercial_flight_number || sel.callsign;
              if (selKey === key) {
                sel.lat = newLat;
                sel.lon = newLon;

                if (routeLinesRef.current.flown && sel.origin) {
                  routeLinesRef.current.flown.setLatLngs([
                    [sel.origin.lat, sel.origin.lon],
                    [newLat, newLon]
                  ]);
                }
                if (routeLinesRef.current.remaining && sel.destination) {
                  routeLinesRef.current.remaining.setLatLngs([
                    [newLat, newLon],
                    [sel.destination.lat, sel.destination.lon]
                  ]);
                }
              }
            }
          }
        }
      });

      animFrameIdRef.current = requestAnimationFrame(animateKinematics);
    };

    animFrameIdRef.current = requestAnimationFrame(animateKinematics);

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  const weather = twinData?.weather;
  const isLight = theme === 'light';
  const T = {
    rootColor: isLight ? '#0F172A' : '#FAFAFA',
    textMuted: isLight ? '#64748B' : '#94A3B8',
    textSub: isLight ? '#475569' : '#CBD5E1',
    textBright: isLight ? '#0F172A' : '#FAFAFA',
    cardBg: isLight ? '#FFFFFF' : '#161922',
    cardBgAlt: isLight ? '#F8FAFC' : '#0D111A',
    cardBgDark: isLight ? '#F1F5F9' : '#0A0E1A',
    cardBorder: isLight ? '#E2E8F0' : '#262E3F',
    cardBorderAlt: isLight ? '#CBD5E1' : '#1E293B',
    btnBg: isLight ? '#F1F5F9' : '#1F2937',
    btnBorder: isLight ? '#CBD5E1' : '#374151',
    btnText: isLight ? '#0F172A' : '#F3F4F6',
    inputBg: isLight ? '#FFFFFF' : '#1E293B',
    inputBorder: isLight ? '#CBD5E1' : '#334155',
    inputText: isLight ? '#0F172A' : '#FFFFFF',
    tabBarBg: isLight ? '#F1F5F9' : '#0D0E12',
    tabBorder: isLight ? '#E2E8F0' : '#262626',
    tabActiveBg: isLight ? '#FFFFFF' : '#17191E',
    tableHeaderBg: isLight ? '#F1F5F9' : '#0D0E12',
    tableBorder: isLight ? '#E2E8F0' : '#262626',
    tableRowHover: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
    telemetryBoxBg: isLight ? '#F8FAFC' : '#0F172A',
    mapBorder: isLight ? '#CBD5E1' : '#262E3F',
    flightDrawerBg: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 15, 25, 0.96)',
    flightDrawerBorder: isLight ? '#CBD5E1' : '#FACC15',
    flightDrawerText: isLight ? '#0F172A' : '#FFFFFF',
    tabsWrapperBg: isLight ? '#FFFFFF' : '#111317',
  };

  const financials = twinData?.financials_live;
  const pax = twinData?.passengers;
  const fids = twinData?.fids;
  const ops = twinData?.operations;

  return (
    <div style={{ color: T.rootColor, fontFamily: "var(--font-sans, system-ui, sans-serif)", paddingBottom: "48px" }}>
      
      {/* SECTION HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(250, 204, 21, 0.15)', color: '#FACC15', border: '1px solid rgba(250, 204, 21, 0.4)' }}>
              <Radar size={13} style={{ animation: 'spin 4s linear infinite' }} />
              LIVE ADS-B RADAR (ALL INDIAN AIRSPACE)
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>•</span>
            <span style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              {allIndianFlights.length} Flights Tracked Nationwide
            </span>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                (Live: {lastUpdated})
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Live Flight Map & Aerodrome Radar
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Flightradar24 Architecture • Real-Time ADS-B Transponder Radar, Geodesic Flight Vectors & Aerodrome Concession Intelligence.
          </p>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchAirportData(selectedAirport, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: T.btnBg,
              border: `1px solid ${T.btnBorder}`,
              borderRadius: '8px',
              color: T.btnText,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Sync Radar Feed
          </button>
        </div>
      </div>

      {/* 20 MAJOR AIRPORTS SELECTOR PILLS */}
      <div style={{ background: T.cardBgAlt, border: `1px solid ${T.cardBorderAlt}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={15} style={{ color: '#38BDF8' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
              Select Aerodrome Hub (20 Major DGCA Airports)
            </span>
          </div>
          
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Filter airport (e.g. Pune, IXC)..."
              value={airportSearch}
              onChange={(e) => setAirportSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 10px 5px 30px',
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                borderRadius: '6px',
                color: T.inputText,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
          {filteredAirports.map(ap => {
            const isSelected = ap.code === selectedAirport;
            return (
              <button
                key={ap.code}
                onClick={() => setSelectedAirport(ap.code)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: isSelected ? `1.5px solid ${ap.color}` : `1px solid ${T.cardBorder}`,
                  background: isSelected ? (isLight ? '#EFF6FF' : 'rgba(30, 41, 59, 0.95)') : (isLight ? '#FFFFFF' : '#111827'),
                  color: isSelected ? (isLight ? '#1D4ED8' : '#FFFFFF') : T.textMuted,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 0 10px ${ap.color}33` : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ap.color }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: isSelected ? ap.color : '#CBD5E1' }}>{ap.code}</span>
                <span style={{ fontSize: '11px', color: isSelected ? '#E2E8F0' : '#64748B' }}>{ap.city}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED AERODROME TELEMETRY RIBBON */}
      <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AERODROME & OPERATOR</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
            {apConfig.name}
          </div>
          <div style={{ fontSize: '11px', color: apConfig.color, marginTop: '2px', fontWeight: 600 }}>
            {apConfig.operator}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE WEATHER & ACTIVE RUNWAY</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#38BDF8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wind size={15} />
            {weather?.temperature_c || 28}°C • {weather?.wind_speed_kt || 8}kt @ {weather?.wind_direction_deg || 90}°
          </div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>
            Active Runway: <strong>{weather?.active_runway || '09/27'}</strong> (Aligned to Wind)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>QNH PRESSURE & METAR</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#E2E8F0', marginTop: '2px', fontFamily: 'monospace' }}>
            QNH {weather?.surface_pressure_hpa || 1012} hPa
          </div>
          <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {weather?.metar_raw || `${apConfig.icao} 140000Z AUTO 09008KT 5000 HZ Q1012`}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TMA RADIAL COVERAGE</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FACC15', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={15} />
            {tmaFlights.length} Flights in {apConfig.code} TMA
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Elevation: {apConfig.elevation} • ICAO: {apConfig.icao}
          </div>
        </div>
      </div>

      {/* FULL-WIDTH SATELLITE RADAR MAP & FLIGHTRADAR24 DETAIL DRAWER */}
      <div style={{ position: "relative", width: "100%", height: "clamp(380px, 48vh, 620px)", borderRadius: "12px", overflow: "hidden", border: `1.5px solid ${T.mapBorder}`, marginBottom: "24px", background: isLight ? "#E2E8F0" : "#05070D" }}>
        
        {/* Leaflet Satellite Map Canvas */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Top Radar Legend Overlay */}
        <div style={{ position: 'absolute', top: '14px', left: '16px', zIndex: 500, background: 'rgba(10, 14, 26, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(250, 204, 21, 0.4)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FACC15', animation: 'ping 1.5s infinite' }} />
            <strong style={{ color: '#FACC15' }}>SATELLITE ADS-B RADAR</strong>
          </div>
          <div style={{ color: '#64748B' }}>|</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#FACC15', borderRadius: '2px' }} />
            <span>Click any plane to view route & flight path</span>
          </div>
          <div style={{ color: '#64748B' }}>|</div>
          <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>60 FPS Real-Life Motion</span>
        </div>

        {/* Flightradar24 Authentic Slide-in Flight Detail Drawer */}
        {selectedFlight && (
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: 'min(360px, calc(100% - 28px))',
            maxHeight: 'calc(100% - 28px)',
            overflowY: 'auto',
            zIndex: 600,
            background: T.flightDrawerBg,
            backdropFilter: 'blur(16px)',
            border: `2px solid ${T.flightDrawerBorder}`,
            borderRadius: '12px',
            padding: '16px',
            boxShadow: isLight ? '0 12px 32px rgba(0,0,0,0.15)' : '0 12px 40px rgba(0,0,0,0.9)',
            color: T.flightDrawerText
          }}>
            {/* Header: Commercial Flight Number & Airline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: selectedFlight.airline_color || '#FACC15' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                    {selectedFlight.airline}
                  </span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', color: '#FACC15', marginTop: '2px' }}>
                  {selectedFlight.commercial_flight_number || selectedFlight.callsign}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                  ATC Callsign: <strong style={{ color: '#CBD5E1' }}>{selectedFlight.atc_callsign || selectedFlight.callsign}</strong>
                </div>
              </div>

              <button
                onClick={() => setSelectedFlight(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Route Banner: Origin -> Destination with Geodesic Progress */}
            {selectedFlight.origin && selectedFlight.destination && (
              <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#10B981' }}>
                      {selectedFlight.origin.code}
                    </div>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                      {selectedFlight.origin.city}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, padding: '0 12px' }}>
                    <Plane size={16} style={{ color: '#FACC15', transform: 'rotate(90deg)' }} />
                    <div style={{ height: '3px', width: '100%', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${selectedFlight.progress_pct || 50}%`, background: '#FACC15' }} />
                    </div>
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                      {selectedFlight.progress_pct || 50}% Completed
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#EF4444' }}>
                      {selectedFlight.destination.code}
                    </div>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                      {selectedFlight.destination.city}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#FACC15', marginTop: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                  ● Dotted route line drawn on satellite map
                </div>
              </div>
            )}

            {/* Aircraft Model & Registration */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0A0E1A', border: '1px solid #1E293B', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#64748B' }}>AIRCRAFT: </span>
                <strong style={{ color: '#FFFFFF' }}>{selectedFlight.aircraft_model || 'Airbus A321neo'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>REG: </span>
                <strong style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{selectedFlight.registration || 'VT-IMD'}</strong>
              </div>
            </div>

            {/* Ground / Flight Navigation Status */}
            <div style={{ background: selectedFlight.on_ground ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)', border: `1px solid ${selectedFlight.on_ground ? '#10B981' : '#38BDF8'}`, borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={14} style={{ color: selectedFlight.on_ground ? '#10B981' : '#38BDF8' }} />
              <div>
                <div style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase' }}>RADAR NAVIGATION STATUS</div>
                <strong style={{ color: '#FFFFFF' }}>{selectedFlight.ground_status || 'AIRBORNE'}</strong>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#0F172A', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1E293B' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>CALIBRATED ALTITUDE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace' }}>
                  {selectedFlight.on_ground ? '0 ft (GND)' : `${selectedFlight.altitude_ft?.toLocaleString()} ft`}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  {selectedFlight.flight_level || '—'}
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1E293B' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>GROUND SPEED</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                  {selectedFlight.velocity_kts || 0} kts
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  {selectedFlight.velocity_kmh || 0} km/h
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1E293B' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>TRACK / HEADING</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FACC15', fontFamily: 'monospace' }}>
                  {selectedFlight.heading || 0}°
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  Compass Course
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1E293B' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>VERTICAL SPEED</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: selectedFlight.vertical_rate_fpm > 100 ? '#10B981' : selectedFlight.vertical_rate_fpm < -100 ? '#F43F5E' : '#E2E8F0', fontFamily: 'monospace' }}>
                  {selectedFlight.vertical_rate_fpm > 100 ? `▲ +${selectedFlight.vertical_rate_fpm}` : selectedFlight.vertical_rate_fpm < -100 ? `▼ ${selectedFlight.vertical_rate_fpm}` : '▶ Level'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>fpm</div>
              </div>
            </div>

            {/* Radar Coordinates & Distance */}
            <div style={{ background: '#090D16', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1E293B', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Distance to {apConfig.code}:</span>
                <span style={{ color: '#FACC15', fontWeight: 700 }}>{selectedFlight.dist_nm || '—'} NM ({selectedFlight.dist_km || '—'} km)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Transponder Squawk:</span>
                <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{selectedFlight.squawk || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Mode-S Hex Address:</span>
                <span style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>{selectedFlight.icao24?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Radar Signal:</span>
                <span style={{ color: '#10B981' }}>OpenSky Network (Live 1090 MHz)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC KPI HIGHLIGHTS RIBBON (DIRECTLY CALCULATED FROM LIVE FLIGHT MOVEMENTS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Roaming Passengers Card (Derived dynamically from active TMA flight waves) */}
        <div style={{ background: '#111317', border: '1px solid #262626', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#737373' }}>ROAMING PASSENGERS NOW</span>
            <Users size={15} style={{ color: '#38BDF8' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', color: '#FAFAFA' }}>
            <AnimatedNumber value={pax?.currently_roaming || 0} />
          </div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} />
            <span>Dynamic Concourse Flow ({tmaFlights.length} TMA Flights)</span>
          </div>
        </div>

        {/* Operator Daily Gross Income Card (Computed from live ATM and database fares) */}
        <div style={{ background: '#111317', border: '1px solid #262626', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#737373' }}>OPERATOR GROSS REVENUE</span>
            <DollarSign size={15} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', color: '#10B981' }}>
            ₹<AnimatedNumber value={financials?.daily_gross_revenue_cr || 0} decimals={2} /> Cr/day
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Annual Run-Rate: ₹<strong>{financials?.annualized_run_rate_cr?.toLocaleString() || 0}</strong> Cr
          </div>
        </div>

        {/* EBITDA Margin Card */}
        <div style={{ background: '#111317', border: '1px solid #262626', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#737373' }}>EBITDA MARGIN (AERA)</span>
            <TrendingUp size={15} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', color: '#F59E0B' }}>
            <AnimatedNumber value={financials?.ebitda_margin_pct || 0} decimals={1} suffix="%" />
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Daily EBITDA: ₹<strong>{financials?.ebitda_daily_cr || 0}</strong> Cr
          </div>
        </div>

        {/* Active Flights in Airspace */}
        <div style={{ background: '#111317', border: '1px solid #262626', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#737373' }}>LIVE FLIGHTS IN TMA</span>
            <Plane size={15} style={{ color: '#EC4899' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', color: '#EC4899' }}>
            <AnimatedNumber value={tmaFlights.length} />
          </div>
          <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '4px' }}>
            Hourly ATM Capacity: <strong>{ops?.peak_atm_capacity || 50}</strong> slots
          </div>
        </div>
      </div>

      {/* DETAILED TELEMETRY TABS (FINANCIALS, PASSENGERS, FIDS, RADAR LIST) */}
      <div style={{ background: T.tabsWrapperBg, border: `1px solid ${T.tabBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.tabBorder}`, background: T.tabBarBg, overflowX: 'auto' }}>
          {[
            { id: 'financials', label: 'OPERATOR FINANCIALS (AERA)', icon: DollarSign },
            { id: 'radar_list', label: `ALL FLIGHTS IN AIRSPACE (${allIndianFlights.length})`, icon: Radar },
            { id: 'passengers', label: 'ROAMING PASSENGERS FLOW', icon: Users },
            { id: 'fids', label: 'MULTI-CARRIER FIDS BOARD', icon: Plane }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  background: isActive ? T.tabActiveBg : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #FF3D00' : '2px solid transparent',
                  color: isActive ? (isLight ? '#0F172A' : '#FAFAFA') : T.textMuted,
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} style={{ color: isActive ? '#FF3D00' : T.textMuted }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          
          {/* TAB 1: OPERATOR FINANCIALS (AERA) */}
          {activeTab === 'financials' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                
                {/* Aeronautical Revenue */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '16px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700, fontFamily: 'monospace', marginBottom: '6px' }}>
                    AERONAUTICAL INCOME (AERA REGULATED)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: T.textBright, fontFamily: 'monospace' }}>
                    ₹{financials?.aeronautical_revenue_cr || 0} Cr/day
                    <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400, marginLeft: '8px' }}>
                      ({financials?.aero_share_pct || 45}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '10px' }}>
                    Regulated Tariff Streams:
                  </div>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6' }}>
                    {financials?.aero_streams?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #262E3F', fontSize: '11px', color: '#64748B' }}>
                    UDF Rate: ₹<strong>{financials?.udf_rate_inr || 0}</strong> / departing passenger
                  </div>
                </div>

                {/* Non-Aeronautical Revenue */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '16px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, fontFamily: 'monospace', marginBottom: '6px' }}>
                    NON-AERONAUTICAL INCOME (COMMERCIAL)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: T.textBright, fontFamily: 'monospace' }}>
                    ₹{financials?.non_aeronautical_revenue_cr || 0} Cr/day
                    <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400, marginLeft: '8px' }}>
                      ({financials?.non_aero_share_pct || 55}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '10px' }}>
                    Commercial Concessions:
                  </div>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6' }}>
                    {financials?.non_aero_streams?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #262E3F', fontSize: '11px', color: '#64748B' }}>
                    Spend Per Pax (SPP): ₹<strong>{financials?.spend_per_pax_inr || 0}</strong>
                  </div>
                </div>

                {/* AAI Concession Royalty */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '16px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace', marginBottom: '6px' }}>
                    AAI REVENUE SHARE / STATUTORY CONCESSION
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: T.textBright, fontFamily: 'monospace' }}>
                    ₹{financials?.daily_aai_concession_royalty_cr || 0} Cr/day
                    <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400, marginLeft: '8px' }}>
                      ({financials?.revenue_share_to_aai_pct || 0}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '10px', lineHeight: '1.5' }}>
                    Statutory concession royalty remitted to the Airports Authority of India (AAI) per the OMDA agreement.
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981' }}>
                    <ShieldCheck size={14} />
                    <span>Audited AERA Tariff Model</span>
                  </div>
                </div>
              </div>

              {/* Mathematical Model Documentation */}
              <div style={{ background: T.cardBgDark, border: `1px solid ${T.cardBorderAlt}`, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: T.textMuted, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={16} style={{ color: '#38BDF8', flexShrink: 0 }} />
                <span>
                  <strong>AERA Dynamic Tariff Engine:</strong> Instantaneous Operator Gross Revenue = (Active Departing Pax × UDF) + (Daily ATM × Landing MTOW) + (Pax × SPP × Concession Yield).
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: ALL FLIGHTS IN AIRSPACE */}
          {activeTab === 'radar_list' && (
            <div>
              {/* Airspace Filter & Search Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
                  {[
                    { code: 'ALL', label: `All Carriers (${allIndianFlights.length})` },
                    { code: '6E', label: 'IndiGo (6E)', color: '#0284C7' },
                    { code: 'AI', label: 'Air India (AI)', color: '#DC2626' },
                    { code: 'QP', label: 'Akasa (QP)', color: '#EA580C' },
                    { code: 'SG', label: 'SpiceJet (SG)', color: '#E11D48' },
                    { code: 'UK', label: 'Vistara (UK)', color: '#7C3AED' },
                    { code: 'INTL', label: 'Overflights (INTL)', color: '#10B981' }
                  ].map(carrier => {
                    const isSelected = airspaceFilterAirline === carrier.code;
                    return (
                      <button
                        key={carrier.code}
                        onClick={() => setAirspaceFilterAirline(carrier.code)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #FF3D00' : `1px solid ${T.cardBorder}`,
                          background: isSelected ? (isLight ? '#FFF7ED' : 'rgba(250, 204, 21, 0.15)') : (isLight ? '#FFFFFF' : '#161922'),
                          color: isSelected ? '#FF3D00' : T.textSub,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {carrier.color && <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: carrier.color }} />}
                        {carrier.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Search flight, route, or carrier..."
                    value={airspaceSearchQuery}
                    onChange={(e) => setAirspaceSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      background: T.inputBg,
                      border: `1px solid ${T.inputBorder}`,
                      borderRadius: '6px',
                      color: T.inputText,
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Airspace Table */}
              <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: T.tableHeaderBg, zIndex: 10 }}>
                    <tr style={{ borderBottom: `1px solid ${T.tableBorder}`, color: T.textMuted, fontFamily: 'monospace' }}>
                      <th style={{ padding: '10px' }}>FLIGHT NUMBER</th>
                      <th style={{ padding: '10px' }}>AIRLINE</th>
                      <th style={{ padding: '10px' }}>ORIGIN → DESTINATION</th>
                      <th style={{ padding: '10px' }}>ALTITUDE</th>
                      <th style={{ padding: '10px' }}>SPEED</th>
                      <th style={{ padding: '10px' }}>HEADING</th>
                      <th style={{ padding: '10px' }}>STATUS</th>
                      <th style={{ padding: '10px' }}>DIST TO {apConfig.code}</th>
                      <th style={{ padding: '10px' }}>RADAR ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const list = allIndianFlights.filter(fl => {
                        const matchesAirline = airspaceFilterAirline === 'ALL' ||
                          (airspaceFilterAirline === 'INTL' ? fl.is_intl : fl.airline_code === airspaceFilterAirline);
                        const q = airspaceSearchQuery.toLowerCase().trim();
                        const matchesSearch = !q ||
                          fl.commercial_flight_number?.toLowerCase().includes(q) ||
                          fl.callsign?.toLowerCase().includes(q) ||
                          fl.airline?.toLowerCase().includes(q) ||
                          fl.origin?.code?.toLowerCase().includes(q) ||
                          fl.origin?.city?.toLowerCase().includes(q) ||
                          fl.destination?.code?.toLowerCase().includes(q) ||
                          fl.destination?.city?.toLowerCase().includes(q);
                        return matchesAirline && matchesSearch;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                              No matching flights found in Indian airspace.
                            </td>
                          </tr>
                        );
                      }

                      return list.map((fl, idx) => {
                        const isSelected = selectedFlight && (selectedFlight.icao24 === fl.icao24 || selectedFlight.commercial_flight_number === fl.commercial_flight_number);
                        return (
                          <tr
                            key={idx}
                            onClick={() => {
                              setSelectedFlight(fl);
                              mapInstanceRef.current?.flyTo([fl.lat, fl.lon], 9, { duration: 1.2 });
                            }}
                            style={{
                              borderBottom: '1px solid #1A1D24',
                              background: isSelected ? 'rgba(250, 204, 21, 0.14)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.1s ease'
                            }}
                          >
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800, color: isSelected ? '#FACC15' : '#FAFAFA' }}>
                              {fl.commercial_flight_number || fl.callsign}
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: fl.airline_color || '#FACC15' }} />
                                <span>{fl.airline}</span>
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38BDF8' }}>
                              {fl.origin?.code} ({fl.origin?.city}) → {fl.destination?.code} ({fl.destination?.city})
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38BDF8' }}>
                              {fl.on_ground ? 'GND (0 ft)' : `${fl.altitude_ft?.toLocaleString()} ft`}
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#10B981' }}>
                              {fl.velocity_kts || 0} kts
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace' }}>
                              {fl.heading || 0}°
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                background: fl.on_ground ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                color: fl.on_ground ? '#34D399' : '#38BDF8'
                              }}>
                                {fl.ground_status || 'AIRBORNE'}
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#FACC15' }}>
                              {fl.dist_nm || '—'} NM
                            </td>
                            <td style={{ padding: '10px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFlight(fl);
                                  mapInstanceRef.current?.flyTo([fl.lat, fl.lon], 9, { duration: 1.2 });
                                  mapContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '5px',
                                  background: fl.airline_color || '#FACC15',
                                  border: 'none',
                                  color: '#0F172A',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                                }}
                              >
                                Track on Map
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ROAMING PASSENGERS FLOW */}
          {activeTab === 'passengers' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '14px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>CHECK-IN & DIGIYATRA BIOMETRIC</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#FAFAFA', fontFamily: 'monospace', marginTop: '4px' }}>
                    {pax?.concourse_breakdown?.check_in_desks?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '4px' }}>25% of current dwell pool</div>
                </div>

                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '14px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>CISF SECURITY SCREENING</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#FAFAFA', fontFamily: 'monospace', marginTop: '4px' }}>
                    {pax?.concourse_breakdown?.security_screening?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>17% in X-ray queues</div>
                </div>

                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '14px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>DUTY FREE & DINING BOULEVARD</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#FAFAFA', fontFamily: 'monospace', marginTop: '4px' }}>
                    {pax?.concourse_breakdown?.duty_free_and_dining?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>34% shopping / dining</div>
                </div>

                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '8px', padding: '14px', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>BOARDING GATE LOUNGES</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#FAFAFA', fontFamily: 'monospace', marginTop: '4px' }}>
                    {pax?.concourse_breakdown?.boarding_gates?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#EC4899', marginTop: '4px' }}>24% awaiting embarkation</div>
                </div>
              </div>

              <div style={{ background: T.cardBgDark, border: `1px solid ${T.cardBorderAlt}`, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: T.textMuted, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={16} style={{ color: '#38BDF8', flexShrink: 0 }} />
                <span>
                  <strong>Little's Law Terminal Model:</strong> Instantaneous concourse population fluctuates dynamically based on domestic bank arrival rates (&lambda; = scheduled seats &times; 87.4% PLF) and average dwell time (W = 75 mins).
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-CARRIER REAL-TIME FIDS BOARD (ALL DEPARTURES & ARRIVALS) */}
          {activeTab === 'fids' && (
            <div>
              {/* Type Switcher + Airline Filter + Search Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setFidsType('departures')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fidsType === 'departures' ? '#FF3D00' : T.btnBg,
                      color: fidsType === 'departures' ? '#FFFFFF' : T.btnText,
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>DEPARTURES</span>
                    <span style={{ background: fidsType === 'departures' ? '#0F172A' : '#374151', color: fidsType === 'departures' ? '#FACC15' : '#F3F4F6', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                      {fids?.departures?.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setFidsType('arrivals')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fidsType === 'arrivals' ? '#FF3D00' : T.btnBg,
                      color: fidsType === 'arrivals' ? '#FFFFFF' : T.btnText,
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>ARRIVALS</span>
                    <span style={{ background: fidsType === 'arrivals' ? '#0F172A' : '#374151', color: fidsType === 'arrivals' ? '#FACC15' : '#F3F4F6', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                      {fids?.arrivals?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Airline Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    { code: 'ALL', label: 'All Airlines' },
                    { code: '6E', label: 'IndiGo (6E)', color: '#0284C7' },
                    { code: 'AI', label: 'Air India (AI)', color: '#DC2626' },
                    { code: 'QP', label: 'Akasa (QP)', color: '#EA580C' },
                    { code: 'SG', label: 'SpiceJet (SG)', color: '#E11D48' },
                    { code: 'UK', label: 'Vistara (UK)', color: '#7C3AED' }
                  ].map(carrier => {
                    const isSelected = fidsFilterAirline === carrier.code;
                    return (
                      <button
                        key={carrier.code}
                        onClick={() => setFidsFilterAirline(carrier.code)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '5px',
                          border: isSelected ? '1px solid #FF3D00' : `1px solid ${T.cardBorder}`,
                          background: isSelected ? (isLight ? '#FFF7ED' : 'rgba(250, 204, 21, 0.15)') : (isLight ? '#FFFFFF' : '#161922'),
                          color: isSelected ? '#FF3D00' : T.textSub,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {carrier.color && <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: carrier.color }} />}
                        {carrier.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Search flight, city, gate..."
                    value={fidsSearchQuery}
                    onChange={(e) => setFidsSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      background: T.inputBg,
                      border: `1px solid ${T.inputBorder}`,
                      borderRadius: '6px',
                      color: T.inputText,
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Full Multi-Carrier FIDS Board */}
              <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: T.tableHeaderBg, zIndex: 10 }}>
                    <tr style={{ borderBottom: `1px solid ${T.tableBorder}`, color: T.textMuted, fontFamily: 'monospace' }}>
                      <th style={{ padding: '10px' }}>SCHED TIME</th>
                      <th style={{ padding: '10px' }}>FLIGHT NUMBER</th>
                      <th style={{ padding: '10px' }}>AIRLINE</th>
                      <th style={{ padding: '10px' }}>{fidsType === 'departures' ? 'DESTINATION' : 'ORIGIN'}</th>
                      <th style={{ padding: '10px' }}>AIRCRAFT EQUIPMENT</th>
                      <th style={{ padding: '10px' }}>OPERATIONAL STATUS</th>
                      <th style={{ padding: '10px' }}>{fidsType === 'departures' ? 'CONCOURSE GATE' : 'BAGGAGE BELT'}</th>
                      <th style={{ padding: '10px' }}>LIVE FARE QUOTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rawList = (fidsType === 'departures' ? fids?.departures : fids?.arrivals) || [];
                      const filteredList = rawList.filter(fl => {
                        const matchesAirline = fidsFilterAirline === 'ALL' || fl.airline_code === fidsFilterAirline;
                        const q = fidsSearchQuery.toLowerCase().trim();
                        const cityOrCode = (fl.destination_city || fl.origin_city || fl.destination || fl.origin || '').toLowerCase();
                        const matchesSearch = !q ||
                          fl.flight_number?.toLowerCase().includes(q) ||
                          fl.airline?.toLowerCase().includes(q) ||
                          cityOrCode.includes(q) ||
                          fl.status?.toLowerCase().includes(q) ||
                          (fl.gate && fl.gate.toLowerCase().includes(q)) ||
                          (fl.belt && fl.belt.toLowerCase().includes(q));
                        return matchesAirline && matchesSearch;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                              No scheduled flights match your filter criteria.
                            </td>
                          </tr>
                        );
                      }

                      return filteredList.map((fl, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1A1D24' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#FACC15', fontWeight: 700 }}>
                            {fl.scheduled_time}
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#FAFAFA' }}>
                            {fl.flight_number}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '2px',
                                background: fl.airline_code === '6E' ? '#0284C7' : fl.airline_code === 'AI' ? '#DC2626' : fl.airline_code === 'QP' ? '#EA580C' : fl.airline_code === 'SG' ? '#E11D48' : fl.airline_code === 'UK' ? '#7C3AED' : '#10B981'
                              }} />
                              <span>{fl.airline}</span>
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#38BDF8' }}>
                            {fl.destination_city || fl.origin_city || fl.destination || fl.origin}
                          </td>
                          <td style={{ padding: '10px', color: '#CBD5E1', fontFamily: 'monospace' }}>{fl.aircraft}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              background: fl.status.includes('BOARDING') || fl.status.includes('FINAL') ? 'rgba(239, 68, 68, 0.2)' : fl.status.includes('DELAYED') ? 'rgba(245, 158, 11, 0.2)' : fl.status.includes('TAXIING') ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: fl.status.includes('BOARDING') || fl.status.includes('FINAL') ? '#F87171' : fl.status.includes('DELAYED') ? '#FBBF24' : fl.status.includes('TAXIING') ? '#38BDF8' : '#34D399',
                              border: `1px solid ${fl.status.includes('BOARDING') || fl.status.includes('FINAL') ? 'rgba(239, 68, 68, 0.4)' : fl.status.includes('DELAYED') ? 'rgba(245, 158, 11, 0.4)' : fl.status.includes('TAXIING') ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                            }}>
                              {fl.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#F8FAFC' }}>
                            {fl.gate || fl.belt || '—'}
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#10B981', fontWeight: 700 }}>
                            {fl.fare_inr ? `₹${fl.fare_inr.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
