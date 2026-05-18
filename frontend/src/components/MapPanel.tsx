import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import type { LocationOption } from "../constants/locations";
import type { RecommendationCategory, Recommendations } from "../types/api";

// ---------------------------------------------------------------------------
// Fix default Leaflet marker icon broken by bundlers
// ---------------------------------------------------------------------------
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ---------------------------------------------------------------------------
// Emoji DivIcon markers — no external CDN dependency, works in all browsers
// ---------------------------------------------------------------------------
const makeEmojiIcon = (emoji: string, size = 32, pulse = false) =>
  L.divIcon({
    className: pulse ? "emoji-marker pulse-marker" : "emoji-marker",
    html: `<div style="
      font-size: ${size}px;
      line-height: 1;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));
      cursor: pointer;
      user-select: none;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

// Main location pin
const PIN_ICON = makeEmojiIcon("📍", 34);

// Landmark category icons
const SCHOOL_ICON    = makeEmojiIcon("🏫", 30);
const COMMERCIAL_ICON = makeEmojiIcon("🏬", 30);
const HOTSPOT_ICON   = makeEmojiIcon("⚠️", 32, true);   // pulsing
const BUS_STOP_ICON  = makeEmojiIcon("🚌", 30);
const OKU_ICON = makeEmojiIcon("♿", 30);

// ---------------------------------------------------------------------------
// Landmark data
// ---------------------------------------------------------------------------
type LandmarkCategory = "school" | "commercial" | "accident_hotspot" | "bus_stop" | "oku_facility";

interface Landmark {
  name: string;
  category: LandmarkCategory;
  coordinates: [number, number];
  note: string;
}

const LANDMARKS: Record<string, Landmark[]> = {
  Puchong: [
    { name: "SJK(C) Han Ming", category: "school", coordinates: [2.9967, 101.6232], note: "Primary school at Batu 14, Jalan Puchong — school zone active 7–8am and 1–2pm" },
    { name: "SMK Puchong", category: "school", coordinates: [2.9978, 101.6231], note: "Secondary school at Batu 14, Jalan Puchong — school zone on main corridor" },
    { name: "SMK Puchong Permai", category: "school", coordinates: [2.9950, 101.5958], note: "Secondary school — students commute via Jalan Puchong daily" },
    { name: "IOI Mall Puchong", category: "commercial", coordinates: [3.0180, 101.6280], note: "Major retail hub — high weekend traffic generator" },
    { name: "Setia Walk", category: "commercial", coordinates: [3.0250, 101.6200], note: "Commercial strip — peak activity evenings and weekends" },
    { name: "Tesco Extra Puchong", category: "commercial", coordinates: [3.0320, 101.6150], note: "Hypermarket — delivery lorry traffic congestion point" },
    { name: "Giant IOI Bandar Puteri", category: "commercial", coordinates: [3.0150, 101.6300], note: "Supermarket — contributes to Bandar Puteri junction congestion" },
    { name: "Ahsana OKU Center (PKAKL)", category: "oku_facility", coordinates: [3.0489, 101.6612], note: "Registered NGO under JKM housing 14 OKU children. No OKU-friendly pedestrian access on Jalan Puchong corridor connecting to this facility." },
    { name: "Puchong Perdana Junction", category: "accident_hotspot", coordinates: [3.0280, 101.6180], note: "Known accident blackspot — multiple recorded crashes. Critical congestion zone." },
    { name: "Puchong Utama Junction (Hit-and-run Sep 2025)", category: "accident_hotspot", coordinates: [3.0340, 101.6210], note: "Hit-and-run Sep 2025 — motorcyclist struck by Honda BRV, driver fled." },
    { name: "Jalan Puchong/LDP Intersection (MTree Hotel)", category: "accident_hotspot", coordinates: [3.0200, 101.6250], note: "3 vehicles rammed at 12:30am May 2025." },
    { name: "Batu 14 — Fatal Crash Oct 2025", category: "accident_hotspot", coordinates: [2.9967, 101.6232], note: "Perodua Bezza impaled by road divider, 1 killed, 2 injured." },
    { name: "Caltex — Fatal Motorcycle Crash 8 May 2026", category: "accident_hotspot", coordinates: [3.0445, 101.6631], note: "Fatal motorcycle crash — blocked right lane, congestion from Bloomsvale to Taman Kinrara." },
    { name: "Jalan Puchong Puteri 2/7 Traffic Lights", category: "accident_hotspot", coordinates: [3.0310, 101.6190], note: "Hit-and-run Mar 2026 — red light runner fled scene at 8pm." },
    { name: "Bandar Puteri Junction", category: "accident_hotspot", coordinates: [3.0312, 101.6701], note: "8-vehicle pileup Jan 2026 — lorry brake failure, 7 stationary cars hit." },
  ],
  "Kuala Lumpur": [
    { name: "NPE Flyover Merging Zone", category: "accident_hotspot", coordinates: [3.1090, 101.6410], note: "Tour bus hit-and-run Apr 2026, car-motorcycle sideswipe May 2026. Vehicles decelerate rapidly off NPE ramps." },
    { name: "Jalan Othman Intersection", category: "accident_hotspot", coordinates: [3.1060, 101.6370], note: "Fatal junction fire May 2024 — Honda Accord and Yamaha burst into flames. Red-light runner zone." },
    { name: "PJ Old Town Curve", category: "accident_hotspot", coordinates: [3.1045, 101.6355], note: "Illegal parking narrows lanes from 2 to 1, forcing sudden evasive braking crashes." },
    { name: "PJ Old Town Bus Terminal", category: "oku_facility", coordinates: [3.1034, 101.6521], note: "Reconstructed at RM3.9mil with OKU parking bays and barrier-free walkways. Connecting pedestrian path from Jalan Templer lacks tactile paving." },
    { name: "Jalan Templer / Jalan Gasing Junction", category: "commercial", coordinates: [3.1073, 101.6389], note: "Major arterial junction — 260,000 vehicles/day, MBPJ contraflow 5–7pm weekdays." },
  ],
};

const LANDMARK_ICONS: Record<LandmarkCategory, L.DivIcon> = {
  school: SCHOOL_ICON,
  commercial: COMMERCIAL_ICON,
  accident_hotspot: HOTSPOT_ICON,
  bus_stop: BUS_STOP_ICON,
  oku_facility: OKU_ICON,
};

const LANDMARK_EMOJI: Record<LandmarkCategory, string> = {
  school: "🏫",
  commercial: "🏬",
  accident_hotspot: "⚠️",
  bus_stop: "🚌",
  oku_facility: "♿",
};

const LANDMARK_LABEL: Record<LandmarkCategory, string> = {
  school: "School",
  commercial: "Commercial",
  accident_hotspot: "Accident Hotspot",
  bus_stop: "Bus Stop",
  oku_facility: "OKU Facility",
};

// ---------------------------------------------------------------------------
// Heatmap polyline data
// ---------------------------------------------------------------------------
type HeatLevel = "critical" | "common" | "light" | "clear";

interface HeatSegment {
  positions: [[number, number], [number, number]];
  level: HeatLevel;
  label: string;
}

const HEAT_COLORS: Record<HeatLevel, string> = {
  critical: "#DC2626",
  common:   "#F97316",
  light:    "#EAB308",
  clear:    "#16A34A",
};

const HEAT_SEGMENTS: Record<string, HeatSegment[]> = {
  Puchong: [
    { positions: [[3.0280, 101.6180], [3.0300, 101.6195]], level: "critical", label: "Puchong Perdana junction — Critical congestion" },
    { positions: [[3.0340, 101.6210], [3.0360, 101.6225]], level: "critical", label: "Puchong Utama junction — Critical congestion" },
    { positions: [[3.0300, 101.6195], [3.0340, 101.6210]], level: "common",   label: "Main arterial — Common congestion" },
    { positions: [[3.0260, 101.6170], [3.0280, 101.6180]], level: "light",    label: "Side road approach — Light congestion" },
  ],
  "Kuala Lumpur": [
    { positions: [[3.1080, 101.6395], [3.1090, 101.6410]], level: "critical", label: "NPE Flyover Merging Zone — Critical congestion" },
    { positions: [[3.1060, 101.6370], [3.1073, 101.6389]], level: "critical", label: "Jalan Othman intersection — Red-light runner zone" },
    { positions: [[3.1045, 101.6355], [3.1060, 101.6370]], level: "common",   label: "PJ Old Town Curve — Illegal parking narrows to 1 lane" },
    { positions: [[3.1073, 101.6389], [3.1090, 101.6410]], level: "common",   label: "Main bypass corridor — Highway overflow traffic" },
  ],
};

// ---------------------------------------------------------------------------
// Props — keep recommendations/highlightedCategory/onOverlayClick in props
// for backward compatibility, but no longer render circles
// ---------------------------------------------------------------------------
interface MapPanelProps {
  location: LocationOption | null;
  selectedCity: string | null;
  recommendations: Recommendations | null;
  highlightedCategory: RecommendationCategory | null;
  onOverlayClick: (category: RecommendationCategory) => void;
}

const DEFAULT_CENTER: [number, number] = [3.8077, 108.9];
const DEFAULT_ZOOM = 6;

// ---------------------------------------------------------------------------
// FlyToLocation
// ---------------------------------------------------------------------------
function FlyToLocation({ location }: { location: LocationOption | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location.coordinates, location.zoom, { duration: 1.2 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }
  }, [map, location]);
  return null;
}

// ---------------------------------------------------------------------------
// Map legend
// ---------------------------------------------------------------------------
function MapLegend({ showLandmarks }: { showLandmarks: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "12px",
      left: "12px",
      zIndex: 1000,
      backgroundColor: "rgba(255,255,255,0.97)",
      borderRadius: "8px",
      padding: "10px 12px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      fontSize: "11px",
      lineHeight: 1.7,
      pointerEvents: "none",
      maxWidth: "190px",
    }}>
      <div style={{ fontWeight: 800, marginBottom: "4px", color: "#1E3A5F", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Traffic Heatmap
      </div>
      {(["critical", "common", "light"] as HeatLevel[]).map((level) => (
        <div key={level} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "20px", height: "5px", borderRadius: "3px", backgroundColor: HEAT_COLORS[level], flexShrink: 0 }} />
          <span style={{ color: "#374151", fontSize: "10px" }}>
            {level === "critical" ? "Critical" : level === "common" ? "Common" : "Light"}
          </span>
        </div>
      ))}

      {showLandmarks && (
        <>
          <div style={{ fontWeight: 800, marginTop: "8px", marginBottom: "4px", color: "#1E3A5F", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Landmarks
          </div>
          {(["school", "commercial", "accident_hotspot", "oku_facility"] as LandmarkCategory[]).map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "14px", lineHeight: 1 }}>{LANDMARK_EMOJI[cat]}</span>
              <span style={{ color: "#374151", fontSize: "10px" }}>{LANDMARK_LABEL[cat]}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapPanel
// ---------------------------------------------------------------------------
export default function MapPanel({
  location,
  selectedCity,
}: MapPanelProps) {
  const heatSegments = selectedCity ? (HEAT_SEGMENTS[selectedCity] ?? []) : [];
  const landmarks = selectedCity ? (LANDMARKS[selectedCity] ?? []) : [];
  const hotspots = landmarks.filter((l) => l.category === "accident_hotspot");
  const otherLandmarks = landmarks.filter((l) => l.category !== "accident_hotspot");

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Pulse + emoji marker CSS */}
      <style>{`
        .emoji-marker { background: transparent !important; border: none !important; }
        @keyframes hotspotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.25); opacity: 0.75; }
        }
        .pulse-marker div { animation: hotspotPulse 1.8s ease-in-out infinite; }
      `}</style>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToLocation location={location} />

        {/* Main location pin */}
        {location && (
          <Marker position={location.coordinates} icon={PIN_ICON}>
            <Popup>
              <strong>{location.markerLabel}</strong>
            </Popup>
          </Marker>
        )}

        {/* Traffic heatmap polylines */}
        {heatSegments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{ color: HEAT_COLORS[seg.level], weight: 6, opacity: 0.85 }}
          >
            <Popup>{seg.label}</Popup>
          </Polyline>
        ))}

        {/* Non-hotspot landmarks — emoji markers */}
        {otherLandmarks.map((lm, i) => (
          <Marker key={`lm-${i}`} position={lm.coordinates} icon={LANDMARK_ICONS[lm.category]}>
            <Popup>
              <div style={{ fontSize: "13px" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                  {LANDMARK_EMOJI[lm.category]} {lm.name}
                </div>
                <div style={{ color: "#6B7280", fontSize: "11px", marginBottom: "3px" }}>
                  {LANDMARK_LABEL[lm.category]}
                </div>
                <div style={{ fontSize: "12px", color: "#374151" }}>{lm.note}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Accident hotspot markers — pulsing emoji */}
        {hotspots.map((lm, i) => (
          <Marker key={`hs-${i}`} position={lm.coordinates} icon={HOTSPOT_ICON}>
            <Popup>
              <div style={{ fontSize: "13px" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#DC2626" }}>
                  ⚠️ {lm.name}
                </div>
                <div style={{ color: "#DC2626", fontSize: "11px", fontWeight: 600, marginBottom: "3px" }}>
                  Accident Hotspot
                </div>
                <div style={{ fontSize: "12px", color: "#374151" }}>{lm.note}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Small pulsing circle ring around each hotspot for extra visibility */}
        {hotspots.map((lm, i) => (
          <Circle
            key={`ring-${i}`}
            center={lm.coordinates}
            radius={35}
            pathOptions={{ color: "#DC2626", fillColor: "#DC2626", fillOpacity: 0.08, weight: 1.5, dashArray: "5 4" }}
          />
        ))}
      </MapContainer>

      {selectedCity && <MapLegend showLandmarks={landmarks.length > 0} />}
    </div>
  );
}
