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

// Red marker icon for the selected location pin
const RED_MARKER = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ---------------------------------------------------------------------------
// Heatmap polyline data — hardcoded verified segments per street
// ---------------------------------------------------------------------------
type HeatLevel = "critical" | "common" | "light" | "clear";

interface HeatSegment {
  positions: [[number, number], [number, number]];
  level: HeatLevel;
  label: string;
}

const HEAT_COLORS: Record<HeatLevel, string> = {
  critical: "#DC2626",  // Red
  common:   "#F97316",  // Orange
  light:    "#EAB308",  // Yellow
  clear:    "#16A34A",  // Green
};

const HEAT_SEGMENTS: Record<string, HeatSegment[]> = {
  Puchong: [
    {
      positions: [[3.0280, 101.6180], [3.0300, 101.6195]],
      level: "critical",
      label: "Puchong Perdana junction — Critical congestion",
    },
    {
      positions: [[3.0340, 101.6210], [3.0360, 101.6225]],
      level: "critical",
      label: "Puchong Utama junction — Critical congestion",
    },
    {
      positions: [[3.0300, 101.6195], [3.0340, 101.6210]],
      level: "common",
      label: "Main arterial — Common congestion",
    },
    {
      positions: [[3.0260, 101.6170], [3.0280, 101.6180]],
      level: "light",
      label: "Side road approach — Light congestion",
    },
  ],
  "Kuala Lumpur": [
    {
      positions: [[3.1700, 101.6830], [3.1720, 101.6845]],
      level: "critical",
      label: "Main bottleneck — Critical congestion",
    },
    {
      positions: [[3.1720, 101.6845], [3.1740, 101.6860]],
      level: "common",
      label: "Downstream flow — Common congestion",
    },
    {
      positions: [[3.1680, 101.6815], [3.1700, 101.6830]],
      level: "light",
      label: "Approach road — Light congestion",
    },
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
// Default view — full Malaysia
// ---------------------------------------------------------------------------
const DEFAULT_CENTER: [number, number] = [3.8077, 108.9];
const DEFAULT_ZOOM = 6;

// ---------------------------------------------------------------------------
// Category circle overlay config
// ---------------------------------------------------------------------------
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
// Map legend (absolute overlay)
// ---------------------------------------------------------------------------
function HeatmapLegend() {
  const entries: { level: HeatLevel; label: string }[] = [
    { level: "critical", label: "Critical congestion" },
    { level: "common",   label: "Common congestion" },
    { level: "light",    label: "Light congestion" },
    { level: "clear",    label: "No congestion" },
  ];

  return (
    <div style={{
      position: "absolute",
      bottom: "12px",
      left: "12px",
      zIndex: 1000,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: "6px",
      padding: "8px 10px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      fontSize: "11px",
      lineHeight: 1.6,
      pointerEvents: "none",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#1E3A5F", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Traffic Heatmap
      </div>
      {entries.map(({ level, label }) => (
        <div key={level} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width: "20px",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: HEAT_COLORS[level],
          }} />
          <span style={{ color: "#374151" }}>{label}</span>
        </div>
      ))}
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

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
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

        {/* Red pin marker with popup */}
        {location && (
          <Marker position={location.coordinates} icon={RED_MARKER}>
            <Popup>
              <strong>{location.markerLabel}</strong>
            </Popup>
          </Marker>
        )}

        {/* Traffic heatmap polylines — shown as soon as city is selected */}
        {heatSegments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{
              color: HEAT_COLORS[seg.level],
              weight: 6,
              opacity: 0.85,
            }}
          >
            <Popup>{seg.label}</Popup>
          </Polyline>
        ))}

        {/* Category circle overlays — only shown when recommendations are available */}
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
                eventHandlers={{
                  click: () => onOverlayClick(category),
                }}
              />
            );
          })}
      </MapContainer>

      {/* Legend — shown when a city is selected */}
      {selectedCity && <HeatmapLegend />}
    </div>
  );
}
