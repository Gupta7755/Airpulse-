import React from 'react';
import { X, Navigation, Compass, Plane, Wind, Gauge, Radio } from 'lucide-react';
import radarMapImg from '../assets/radar-map.jpg';

export default function MapModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card map-modal-card flight-radar-modal-card bold-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} strokeWidth={1.5} />
        </button>

        <div className="map-modal-content">
          <div className="map-visual-wrap flight-map-visual">
            <img src={radarMapImg} alt="Flight Air Traffic Radar" className="map-full-img" />
            <div className="radar-sweep-beam-large"></div>
            <div className="map-pin-pulse">
              <div className="flight-radar-marker">
                <Plane size={16} strokeWidth={1.5} className="marker-plane" />
              </div>
            </div>
            <div className="live-alt-tag bold-mono-tag">FL360 (36,000 FT) • DEL ➔ BOM</div>
          </div>

          <div className="map-details-wrap">
            <div className="map-badge bold-mono-pill">
              <span className="accent-square">■</span>
              <span>LIVE ADS-B TELEMETRY (Flight 6E-204)</span>
            </div>
            <h2 className="bold-display-h2">AIRBUS A321neo • IndiGo</h2>
            <p className="map-desc">
              Tracking airway W-10 across the Western India domestic corridor from Indira Gandhi International (DEL) to Chhatrapati Shivaji Maharaj International (BOM).
            </p>

            <div className="trail-highlights flight-telemetry-highlights">
              <div className="trail-item bold-trail-item">
                <Gauge size={16} strokeWidth={1.5} />
                <div>
                  <div className="th-title">GROUND SPEED & MACH</div>
                  <div className="th-sub">462 KTS (855 KM/H) [Mach 0.78]</div>
                </div>
              </div>
              <div className="trail-item bold-trail-item">
                <Wind size={16} strokeWidth={1.5} />
                <div>
                  <div className="th-title">DGCA BASKET WEIGHT</div>
                  <div className="th-sub">22.35% OF NATIONAL CORRIDOR BASKET (7.42M PAX/YR)</div>
                </div>
              </div>
              <div className="trail-item bold-trail-item">
                <Compass size={16} strokeWidth={1.5} />
                <div>
                  <div className="th-title">BEARING & DISTANCE</div>
                  <div className="th-sub">HDG 198° (Distance: 1,148 KM)</div>
                </div>
              </div>
            </div>

            <button type="button" className="btn-modal-primary btn-primary-bold" onClick={onClose}>
              <span>RETURN TO EXECUTIVE DECK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
