import type { RecommendationCategory } from "../types/api";

// ---------------------------------------------------------------------------
// Supported cities and their streets (exactly 2 verified locations)
// ---------------------------------------------------------------------------

export const CITIES = ["Puchong", "Kuala Lumpur"] as const;
export type City = (typeof CITIES)[number];

export const STREETS_BY_CITY: Record<City, string[]> = {
  Puchong: ["Jalan Puchong"],
  "Kuala Lumpur": ["Jalan Templer"],
};

// ---------------------------------------------------------------------------
// LocationOption — used by MapPanel for pin + flyTo
// ---------------------------------------------------------------------------

export interface LocationOption {
  value: string;
  label: string;
  markerLabel: string;
  /** Verified context string — sent to agent as location_context */
  context: string;
  coordinates: [number, number];
  zoom: number;
  state: string;
}

// ---------------------------------------------------------------------------
// Verified map config per city
// ---------------------------------------------------------------------------

export const CITY_MAP_CONFIG: Record<City, LocationOption> = {
  Puchong: {
    value: "Puchong",
    label: "Puchong",
    markerLabel: "Jalan Puchong, Puchong",
    context:
      "Jalan Puchong is a high-density suburban arterial road in Puchong, Selangor under MBSJ jurisdiction. " +
      "Daily vehicle count: ~52,000. Known peak hours: 7–10am and 5–8pm on weekdays (verified). " +
      "Accident hotspots: Puchong Perdana junction and Puchong Utama junction. " +
      "School zones: SMK Seksyen 3 Bandar Kinrara is nearby. " +
      "Flood risk: Yes — flood-prone near Puchong Perdana during heavy rain. " +
      "Existing issues: Illegal parking near commercial lots, single-lane bottleneck sections. " +
      "MBSJ trialled new traffic lights at the Jalan Pipit–Jalan Merbuk junction in 2023 to reduce congestion. " +
      "Selangor context: Selangor recorded 100,000+ road crashes between 2012–2022, the highest in Malaysia. " +
      "Subang and Puchong districts are among the most frequent congestion areas in the state.",
    coordinates: [3.0319, 101.62],
    zoom: 15,
    state: "Selangor",
  },
  "Kuala Lumpur": {
    value: "Kuala Lumpur",
    label: "Kuala Lumpur",
    markerLabel: "Jalan Templer, KL",
    context:
      "Jalan Templer is a residential-commercial mixed, narrow 2-lane road in Kuala Lumpur under DBKL jurisdiction. " +
      "Known peak hours: 7–9am morning peak toward KL city centre. " +
      "School zones: Multiple schools within 500m of the road. " +
      "Existing issues: Rat-run traffic using Jalan Templer to bypass main roads, bottleneck at KL entry points, " +
      "poor pedestrian crossing infrastructure, and motorcycles using pedestrian paths — a known safety issue. " +
      "KL context: KL faces severe congestion on every major road during rush hours. " +
      "Emergency response times are significantly affected by traffic volume. " +
      "Motorcycle usage of pedestrian paths is a documented safety concern.",
    coordinates: [3.1719, 101.6841],
    zoom: 15,
    state: "W.P. Kuala Lumpur",
  },
};

// ---------------------------------------------------------------------------
// Recommendation category order (unchanged)
// ---------------------------------------------------------------------------

export const RECOMMENDATION_CATEGORIES: RecommendationCategory[] = [
  "traffic_flow",
  "public_transport",
  "walkability",
  "policy_enforcement",
];
