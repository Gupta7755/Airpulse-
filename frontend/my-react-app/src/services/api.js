// Base API URL resolver (supports Render production deployment, Vite proxy, and local fallback)
export const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    envUrl = envUrl.trim();
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }
    // Clean trailing /api/v1 or trailing slashes so getApiUrl creates correct URLs
    return envUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiUrl = (endpoint = '') => {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (clean.startsWith('/api/v1')) {
    return API_BASE_URL ? `${API_BASE_URL}${clean}` : clean;
  }
  return API_BASE_URL ? `${API_BASE_URL}/api/v1${clean}` : `/api/v1${clean}`;
};

const BACKEND_PRIMARY = API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1';
const BACKEND_CORS_1 = 'http://127.0.0.1:8000/api/v1';
const BACKEND_CORS_2 = 'http://localhost:8000/api/v1';

// HTTP Basic Authentication credentials for secured API endpoints
export const getAuthCredentials = () => {
  const user = import.meta.env.VITE_API_AUTH_USER || 'admin';
  const pass = import.meta.env.VITE_API_AUTH_PASS || 'airpulse_secure_2026';
  return { user, pass };
};

export const getAuthHeaders = (extraHeaders = {}) => {
  try {
    const { user, pass } = getAuthCredentials();
    const token = btoa(`${user}:${pass}`);
    return {
      'Authorization': `Basic ${token}`,
      ...extraHeaders
    };
  } catch {
    return extraHeaders;
  }
};

export const fetchWithAuth = async (url, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
};

async function fetchFromBackend(endpoint, defaultVal = null, options = {}) {
  const candidates = [
    `${BACKEND_PRIMARY}${endpoint}`,
    `/api/v1${endpoint}`,
    `${BACKEND_CORS_1}${endpoint}`,
    `${BACKEND_CORS_2}${endpoint}`
  ];

  const uniqueCandidates = [...new Set(candidates)];
  const headers = getAuthHeaders(options.headers || {});

  for (const url of uniqueCandidates) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Continue to next fallback
    }
  }

  return defaultVal;
}

export const apiService = {
  // 1. Executive Macro Overview (latest APIx index, inflation rates, live stats)
  async getOverview() {
    return fetchFromBackend('/overview', null);
  },

  // 2. DGCA Routes Basket
  async getRoutes() {
    const data = await fetchFromBackend('/routes', []);
    return Array.isArray(data) ? data : [];
  },

  // 3. Monitored Airlines & OTAs
  async getAirlines(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/airlines${query ? `?${query}` : ''}`;
    const data = await fetchFromBackend(endpoint, []);
    return Array.isArray(data) ? data : [];
  },

  // 4. Advance Purchase Windows
  async getAdvanceWindows(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/advance-windows${query ? `?${query}` : ''}`;
    const data = await fetchFromBackend(endpoint, []);
    return Array.isArray(data) ? data : [];
  },

  // 5. Index Historical Series
  async getIndexSeries(frequency = "MONTHLY", limit = 33) {
    const data = await fetchFromBackend(`/index-records?frequency=${frequency}&limit=${limit}`, []);
    return Array.isArray(data) ? data : [];
  },

  // 6. Dynamic Real-time Calculated Index Trend & Corridor Decomposition
  async getIndexTrend(params = {}) {
    const query = new URLSearchParams({
      timeframe: params.timeframe || 'monthly',
      formula: params.formula || 'LASPEYRES',
      advance_window: params.advance_window || params.advanceWindow || 'ALL_WEIGHTED',
      route_code: params.route_code || params.routeCode || 'ALL'
    }).toString();
    return fetchFromBackend(`/index/trend?${query}`, null);
  },

  // 7. Flight Price Quotes Explorer
  async getQuotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/quotes${query ? `?${query}` : ''}`;
    const data = await fetchFromBackend(endpoint, { total_count: 0, limit: params.limit || 50, offset: params.offset || 0, quotes: [] });
    return data || { total_count: 0, limit: 50, offset: 0, quotes: [] };
  },

  // 8. Proof of Source Audit
  async getProofOfSource(quoteId) {
    return fetchFromBackend(`/quotes/${quoteId}/proof`, null);
  },

  // 9. Crawler Resilience Logs
  async getScraperLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/scraper-logs${query ? `?${query}` : ''}`;
    const data = await fetchFromBackend(endpoint, []);
    return Array.isArray(data) ? data : [];
  },

  // 10. Master Consolidated Normalized Flights Dataset Summary
  async getMasterNormalizedData() {
    return fetchFromBackend('/scraper/master-dataset', null);
  },

  // 11. Scraper Artifacts List
  async getScraperArtifacts() {
    const data = await fetchFromBackend('/scraper/artifacts', []);
    return Array.isArray(data) ? data : [];
  },

  // 12. Carrier Screenshot Image URL Helper with Cache-Buster
  getCarrierScreenshotUrl(carrierCode, version) {
    const base = `${BACKEND_PRIMARY}/scraper/carrier-screenshot/${carrierCode}`;
    if (!version) return base;
    const v = typeof version === 'string' ? encodeURIComponent(version) : new Date(version).getTime();
    return `${base}?v=${v}`;
  },

  // 13. Carrier Flights JSON Preview
  async getCarrierFlightsJson(carrierCode) {
    return fetchFromBackend(`/scraper/carriers/${carrierCode}/flights`, null);
  },

  async getCarrierFlights(carrierCode) {
    return this.getCarrierFlightsJson(carrierCode);
  },

  // 14. Full Pipeline Diagnostics
  async getPipelineStatus() {
    return fetchFromBackend('/pipeline/status', null);
  },

  // 15. Dynamic Flight Price Search
  async searchFlights(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await fetchFromBackend(`/search${query ? `?${query}` : ''}`, []);
    return Array.isArray(data) ? data : [];
  },

  // 16. MongoDB Status & Storage Telemetry
  async getMongoStatus() {
    return fetchFromBackend('/mongo/status', null);
  },

  // 17. Trigger MongoDB Database Sync
  async syncMongo(clearExisting = false) {
    const headers = getAuthHeaders();
    try {
      const res = await fetch(`${BACKEND_CORS_1}/mongo/sync?clear_existing=${clearExisting}`, { method: 'POST', headers });
      return await res.json();
    } catch {
      try {
        const res2 = await fetch(`${BACKEND_PRIMARY}/mongo/sync?clear_existing=${clearExisting}`, { method: 'POST', headers });
        return await res2.json();
      } catch (e) {
        return { status: "error", message: e.message };
      }
    }
  },

  // 18. Automated Crawl Scheduler Status
  async getSchedulerStatus() {
    return fetchFromBackend('/scheduler/status', null);
  },

  // 19. Trigger Immediate Crawl in Background
  async triggerScrapeNow() {
    const headers = getAuthHeaders();
    try {
      const res = await fetch(`${BACKEND_CORS_1}/scheduler/trigger`, { method: 'POST', headers });
      return await res.json();
    } catch {
      try {
        const res2 = await fetch(`${BACKEND_PRIMARY}/scheduler/trigger`, { method: 'POST', headers });
        return await res2.json();
      } catch (e) {
        return { status: "error", message: e.message };
      }
    }
  },

  // 20. Snapshot Content Retrieval
  async getSnapshotContent(filename) {
    return fetchFromBackend(`/snapshots/${filename}`, null);
  },

  // 21. Dynamic Heatmap Matrix & Calendar Quotes from MongoDB
  async getHeatmapData() {
    return fetchFromBackend('/heatmap', null);
  },

  // 22. Set Scheduler Crawl Interval
  async setSchedulerInterval(intervalMinutes) {
    const headers = getAuthHeaders();
    const candidates = [
      `${BACKEND_PRIMARY}/scheduler/interval?interval_minutes=${intervalMinutes}`,
      `/api/v1/scheduler/interval?interval_minutes=${intervalMinutes}`,
      `${BACKEND_CORS_1}/scheduler/interval?interval_minutes=${intervalMinutes}`,
      `${BACKEND_CORS_2}/scheduler/interval?interval_minutes=${intervalMinutes}`
    ];
    for (const url of [...new Set(candidates)]) {
      try {
        const res = await fetch(url, { method: 'POST', headers });
        if (res.ok) return await res.json();
      } catch {
        // try next endpoint
      }
    }
    return { status: "error", message: "Failed to connect to scheduler API" };
  },

  // 23. Route Stress Index (RSI) - Dynamic multi-factor stress computation
  async getRSI() {
    return fetchFromBackend('/rsi', null);
  },

  // 24. Airport Catchment Substitution Intelligence
  async getAirportSubstitution() {
    return fetchFromBackend('/airport-substitution', null);
  },

  // 25. Airport Disruption Scenario Simulation
  async runAirportSimulation(payload = {}) {
    const defaultPayload = {
      hub_code: payload.hub_code || 'DEL',
      capacity_reduction_pct: payload.capacity_reduction_pct ?? 25.0,
      weather_severity_pct: payload.weather_severity_pct ?? 50.0,
      demand_surge_pct: payload.demand_surge_pct ?? 20.0
    };

    const endpoints = [
      `${BACKEND_PRIMARY}/airport-simulation`,
      `/api/v1/airport-simulation`,
      `${BACKEND_CORS_1}/airport-simulation`,
      `${BACKEND_CORS_2}/airport-simulation`
    ];

    for (const url of [...new Set(endpoints)]) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(defaultPayload)
        });
        if (res.ok) return await res.json();
      } catch {
        // try next endpoint
      }
    }
    return null;
  }
};