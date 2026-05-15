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
// Marker icons — colored CDN icons
// ---------------------------------------------------------------------------
const CDN = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";
const SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const makeIcon = (color: string, size: [number, number] = [25, 41]) =>
  new L.Icon({
    iconUrl: `${CDN}/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW,
    iconSize: size,
    iconAnchor: [Math.floor(size[0] / 2), size[1]],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const RED_MARKER    = makeIcon("red");
const BLUE_MARKER   = makeIcon("blue");
const ORANGE_MARKER = makeIcon("orange");
const GREEN_MARKER  = makeIcon("green");
// Accident hotspot: slightly larger red icon
const HOTSPOT_MARKER = makeIcon("red", [30, 49]);

// ---------------------------------------------------------------------------
// Landmark data
// ---------------------------------------------------------------------------
type LandmarkCategory = "school" | "commercial" | "accident_hotspot" | "bus_stop";

interface Landmark {
  name: string;
  category: LandmarkCategory;
  coordinates: [number, number];
  note: string;
}

const LANDMARKS: Record<string, Landmark[]> = {
  Puchong: [
    // Schools
    { name: "SJK(C) Han Ming", category: "school", coordinates: [3.0280, 101.6150], note: "Primary school — school zone active 7–8am and 1–2pm" },
    { name: "SMK Puchong Permai", category: "school", coordinates: [3.0350, 101.6220], note: "Secondary school — contributes to morning peak congestion" },
    { name: "SMK Puchong", category: "school", coordinates: [3.0300, 101.6180], note: "Secondary school — school zone on Jalan Puchong" },
    // Malls/Commercial
    { name: "IOI Mall Puchong", category: "commercial", coordinates: [3.0180, 101.6280], note: "Major retail hub — high weekend traffic generator" },
    { name: "Setia Walk", category: "commercial", coordinates: [3.0250, 101.6200], note: "Commercial strip — peak activity evenings and weekends" },
    { name: "Tesco Extra Puchong", category: "commercial", coordinates: [3.0320, 101.6150], note: "Hypermarket — delivery lorry traffic congestion point" },
    { name: "Giant IOI Bandar Puteri", category: "commercial", coordinates: [3.0150, 101.6300], note: "Supermarket — contributes to Bandar Puteri junction congestion" },
    // Accident Hotspots
    { name: "Puchong Perdana Junction", category: "accident_hotspot", coordinates: [3.0280, 101.6180], note: "Known accident blackspot — multiple recorded crashes. Critical congestion zone." },
    { name: "Puchong Utama Junction", category: "accident_hotspot", coordinates: [3.0340, 101.6210], note: "Known accident blackspot — critical congestion. Hit-and-run Sep 2025." },
    { name: "Jalan Puchong/LDP Intersection (MTree Hotel)", category: "accident_hotspot", coordinates: [3.0200, 101.6250], note: "Known accident blackspot — 3 vehicles rammed at 12:30am May 2025." },
    { name: "Batu 14 Guardrail Crash Site", category: "accident_hotspot", coordinates: [3.0150, 101.6100], note: "Fatal crash Oct 2025 — Perodua Bezza impaled by road divider, 1 killed." },
    { name: "Jalan Puchong Puteri 2/7 Traffic Lights", category: "accident_hotspot", coordinates: [3.0310, 101.6190], note: "Hit-and-run Mar 2026 — red light runner fled scene at 8pm." },
  ],
  "Kuala Lumpur": [
    // Accident Hotspots
    { name: "NPE Flyover Merging Zone", category: "accident_hotspot", coordinates: [3.1090, 101.6410], note: "Accident blackspot — tour bus hit-and-run Apr 2026, frequent lane-merge crashes off NPE ramps" },
    { name: "Jalan Othman Intersection", category: "accident_hotspot", coordinates: [3.1060, 101.6370], note: "High-risk junction — car and bike burst into flames May 2024, red-light runner incident, T-bone crashes" },
    { name: "PJ Old Town Curve", category: "accident_hotspot", coordinates: [3.1045, 101.6355], note: "Illegal parking narrows lanes from 2 to 1, frequent evasive braking crashes" },
    // Infrastructure / Schools
    { name: "Jalan Templer / Jalan Gasing Junction", category: "school", coordinates: [3.1073, 101.6389], note: "Major arterial junction — 260,000 vehicles/day, MBPJ contraflow 5–7pm weekdays" },
    { name: "Jalan Othman Traffic Light", category: "school", coordinates: [3.1060, 101.6370], note: "Former roundabout converted to traffic lights — increased throughput by 50% (The Edge Malaysia)" },
  ],
};

const LANDMARK_ICONS: Record<LandmarkCategory, L.Icon> = {
  school: BLUE_MARKER,
  commercial: ORANGE_MARKER,
  accident_hotspot: HOTSPOT_MARKER,
  bus_stop: GREEN_MARKER,
};

const LANDMARK_EMOJI: Record<LandmarkCategory, string> = {
  school: "🏫",
  commercial: "🏬",
  accident_hotspot: "⚠️",
  bus_stop: "🚌",
};

const LANDMARK_LABEL: Record<LandmarkCategory, string> = {
  school: "School",
  commercial: "Commercial",
  accident_hotspot: "Accident Hotspot",
  bus_stop: "Bus Stop",
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
    { positions: [[3.1080, 101.6395], [3.1090, 101.6410]], level: "critical", label: "NPE Flyover Merging Zone — Critical congestion, accident blackspot" },
    { positions: [[3.1060, 101.6370], [3.1073, 101.6389]], level: "critical", label: "Jalan Othman intersection — Red-light runner zone, T-bone crashes" },
    { positions: [[3.1045, 101.6355], [3.1060, 101.6370]], level: "common",   label: "PJ Old Town Curve — Illegal parking narrows to 1 lane" },
    { positions: [[3.1073, 101.6389], [3.1090, 101.6410]], level: "common",   label: "Main bypass corridor — Highway overflow traffic" },
  ],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface MapPanelProps {
  location: LocationOption | null;
  selectedCity: string | null;
  recommendations: Recommendations | null;
  highlightedCategory: RecommendationCategory | null;
  onOverlayClick: (category: RecommendationCategory) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_CENTER: [number, number] = [3.8077, 108.9];
const DEFAULT_ZOOM = 6;
const CIRCLE_RADIUS = 150;
const OFFSET = 0.0015;

interface OverlayConfig {
  category: RecommendationCategory;
  color: string;
  offset: [number, number];
}

const OVERLAY_CONFIGS: OverlayConfig[] = [
  { category: "traffic_flow",       color: "#DC2626", offset: [OFFSET, 0] },
  { category: "public_transport",   color: "#2563EB", offset: [0, OFFSET] },
  { category: "walkability",        color: "#16A34A", offset: [-OFFSET, 0] },
  { category: "policy_enforcement", color: "#D97706", offset: [0, -OFFSET] },
];

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
// Combined legend — heatmap + landmark categories
// ---------------------------------------------------------------------------
function MapLegend({ showLandmarks }: { showLandmarks: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "12px",
      left: "12px",
      zIndex: 1000,
      backgroundColor: "rgba(255,255,255,0.95)",
      borderRadius: "6px",
      padding: "8px 10px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      fontSize: "11px",
      lineHeight: 1.7,
      pointerEvents: "none",
      maxWidth: "180px",
    }}>
      {/* Traffic heatmap */}
      <div style={{ fontWeight: 700, marginBottom: "3px", color: "#1E3A5F", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Traffic Heatmap
      </div>
      {(["critical", "common", "light"] as HeatLevel[]).map((level) => (
        <div key={level} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "18px", height: "4px", borderRadius: "2px", backgroundColor: HEAT_COLORS[level] }} />
          <span style={{ color: "#374151", fontSize: "10px" }}>
            {level === "critical" ? "Critical" : level === "common" ? "Common" : "Light"}
          </span>
        </div>
      ))}

      {/* Landmark categories */}
      {showLandmarks && (
        <>
          <div style={{ fontWeight: 700, marginTop: "6px", marginBottom: "3px", color: "#1E3A5F", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Landmarks
          </div>
          {(["school", "commercial", "accident_hotspot"] as LandmarkCategory[]).map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "12px" }}>{LANDMARK_EMOJI[cat]}</span>
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
  recommendations,
  highlightedCategory,
  onOverlayClick,
}: MapPanelProps) {
  const heatSegments = selectedCity ? (HEAT_SEGMENTS[selectedCity] ?? []) : [];
  const landmarks = selectedCity ? (LANDMARKS[selectedCity] ?? []) : [];
  const hotspots = landmarks.filter((l) => l.category === "accident_hotspot");
  const otherLandmarks = landmarks.filter((l) => l.category !== "accident_hotspot");

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Pulsing animation for hotspot markers */}
      <style>{`
        @keyframes markerPulse {
          0%   { opacity: 1; transform: scale(1); }
          50%  { opacity: 0.6; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .hotspot-pulse img {
          animation: markerPulse 1.8s ease-in-out infinite;
          transform-origin: bottom center;
        }
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
          <Marker position={location.coordinates} icon={RED_MARKER}>
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

        {/* Non-hotspot landmark markers */}
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

        {/* Accident hotspot markers — pulsing class */}
        {hotspots.map((lm, i) => (
          <Marker
            key={`hs-${i}`}
            position={lm.coordinates}
            icon={HOTSPOT_MARKER}
            // Apply pulse CSS class via ref trick using className on the wrapper div
          >
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

        {/* Pulsing circles behind hotspot markers for visual attention */}
        {hotspots.map((lm, i) => (
          <Circle
            key={`pulse-${i}`}
            center={lm.coordinates}
            radius={40}
            pathOptions={{
              color: "#DC2626",
              fillColor: "#DC2626",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "4 4",
            }}
          />
        ))}

        {/* Category circle overlays — shown when recommendations available */}
        {location &&
          recommendations &&
          OVERLAY_CONFIGS.map(({ category, color, offset }) => {
            const circleCenter: [number, number] = [
              location.coordinates[0] + offset[0],
              location.coordinates[1] + offset[1],
            ];
            const isHighlighted = highlightedCategory === category;
            return (
              <Circle
                key={category}
                center={circleCenter}
                radius={CIRCLE_RADIUS}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isHighlighted ? 0.65 : 0.3,
                  weight: isHighlighted ? 3 : 2,
                }}
                eventHandlers={{ click: () => onOverlayClick(category) }}
              />
            );
          })}
      </MapContainer>

      {/* Legend */}
      {selectedCity && <MapLegend showLandmarks={landmarks.length > 0} />}
    </div>
  );
}
