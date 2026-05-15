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
      "Jalan Puchong is a major arterial road in Puchong, Selangor under MBSJ (Majlis Bandaraya Subang Jaya) jurisdiction. " +
      "Police jurisdiction: IPD Subang Jaya / IPD Serdang. " +
      "TRAFFIC VOLUME: ~100,000 vehicles/day (source: Litrak.com.my billboard operator data). LDP connected corridor: 400,000 vehicle trips/day. Population catchment: ~441,000 (2022 census). Peak hours: 7–10am and 4–8pm weekdays (verified). " +
      "VERIFIED ACCIDENT INCIDENTS: " +
      "(1) 21 Oct 2025 — Fatal crash at Batu 14, Perodua Bezza impaled by road divider, 1 killed, 2 injured. " +
      "(2) 10 Sep 2025 — Hit-and-run at Jalan Puchong Utama, motorcyclist struck by Honda BRV, driver fled. " +
      "(3) 20 May 2025 — Multi-vehicle crash at Jalan Puchong/LDP intersection near MTree Hotel, Bandar Puchong Jaya, 3 stationary vehicles rammed at 12:30am. " +
      "(4) 19 Mar 2025 — Rush-hour crash near OUG toward Kinrara, 2 cars + 1 motorcycle, major traffic backlog. " +
      "(5) 8 May 2026 — Fatal motorcycle crash near Caltex, blocked right lane, congestion from Bloomsvale to Taman Kinrara. " +
      "(6) 26 Apr 2026 — Drunk driving crash at Kinrara 4:30pm, multi-vehicle, motorcyclist severely injured. " +
      "(7) 5 Mar 2026 — Hit-and-run at Jalan Puchong Puteri 2/7 traffic lights, 8pm, red light runner fled. " +
      "(8) 8 Jan 2026 — 8-vehicle pileup at Bandar Puteri, lorry brake failure plowed into 7 stationary cars, no fatalities. " +
      "REGIONAL STATISTICS: Selangor 150,000+ road accidents/year (MOT data), highest in Malaysia. State average: 400+ accidents/day. IPD Subang Jaya/Serdang logs dozens of daily traffic incidents on Jalan Puchong and LDP corridor. " +
      "ROAD CHARACTERISTICS: Serves as major toll-free alternative to LDP. Connects Old Klang Road, Kinrara, Puchong Utama. Complex layout: elevated flyovers, sudden lane merges, heavy commercial lorry traffic, closely spaced traffic lights near Bandar Puteri and OUG. Heavy lorry/commercial vehicle presence. " +
      "NEARBY SCHOOLS: SJK(C) Han Ming, SMK Puchong Permai, SMK Puchong. " +
      "NEARBY LANDMARKS: IOI Mall Puchong, Setia Walk, Mydin, Tesco Extra Puchong, One City, Giant IOI Bandar Puteri, MTree Hotel Bandar Puchong Jaya. " +
      "RESIDENTIAL CATCHMENT: Desa Millennia, Bandar Puteri Puchong, Taman Perindustrian Puchong, Bandar Kinrara, Grand Ville, Vistaria Residence. " +
      "FLOOD RISK: Flash floods during evening downpours. Slick surfaces causing rear-end collisions. Long traffic backlogs during rain events. " +
      "DATA SOURCES: Litrak.com.my, Astro Radio Traffic Facebook, The Star Online, The Sun Malaysia, Ministry of Transport Malaysia, PDRM/JSPT district records, 2022 Population Census.",
    coordinates: [3.0319, 101.62],
    zoom: 15,
    state: "Selangor",
  },
  "Kuala Lumpur": {
    value: "Kuala Lumpur",
    label: "Kuala Lumpur",
    markerLabel: "Jalan Templer, Petaling Jaya",
    context:
      "Jalan Templer is a major arterial road in Petaling Jaya under MBPJ (Majlis Bandaraya Petaling Jaya) jurisdiction. " +
      "Police jurisdiction: Petaling Jaya Traffic Police. " +
      "TRAFFIC VOLUME (verified): 8,000,000+ vehicles/month at Jalan Templer/Jalan Gasing arterial junction (Firstboard.com billboard operator data). Daily vehicle count: 260,000+ vehicles/day. Peak hours: 7:00–9:00am and 5:00–7:30pm weekdays. Thousands of motorists use Jalan Templer daily to bypass Federal Highway gridlock between Old Klang Road (Jalan Klang Lama) and NPE. " +
      "TRAFFIC INFRASTRUCTURE INTERVENTIONS (verified): " +
      "(1) Templer Roundabout demolished and converted to multi-phase traffic light junction at Jalan Othman intersection — increased throughput by up to 50% (source: The Edge Malaysia, EdgeProp). " +
      "(2) MBPJ runs evening contraflow lanes 5:00–7:00pm toward NPE intersection (trial and time-based). " +
      "(3) 3-phase traffic light trial at Jalan Othman–Jalan Templer intersection implemented Dec 2019 (source: Facebook/PTLMalaysia). " +
      "VERIFIED ACCIDENT INCIDENTS: " +
      "(1) 25 Apr 2026 — Tour bus hit-and-run under NPE flyover: bus rammed gridlocked traffic, broadslided Perodua Myvi, damaged 2 other vehicles, driver arrested by PJ Traffic Police. " +
      "(2) 5 May 2026 — Car-motorcycle sideswipe at NPE connection ramps, 4:00pm, highway transition lanes. " +
      "(3) 11 May 2024 — Fatal junction fire at Jalan Othman–Jalan Templer intersection: driver ran red light, Honda Accord and Yamaha Lagenda burst into flames, 53-year-old motorcyclist severely injured. " +
      "(4) 6 Jun 2017 — 4 simultaneous rear-end crashes during rainy morning rush at Jalan Othman bottleneck, traffic paralyzed back to Old Klang Road and Taman Maju Jaya. " +
      "PRIMARY ACCIDENT BLACKSPOTS: (1) NPE Flyover Merging Zone [3.1090, 101.6410] — vehicles decelerate rapidly off NPE ramps onto narrow dual-carriageway sections. (2) Jalan Othman Intersection [3.1060, 101.6370] — red-light runners causing T-bone crashes. (3) PJ Old Town Curve [3.1045, 101.6355] — illegally parked cars narrow lanes from 2 to 1, forcing sudden evasive braking. " +
      "ROAD CHARACTERISTICS: Dual carriageway with narrow sections. Steep ascending sections (heavy vehicle risk). Functions as spillover highway bypass from Federal Highway. High-speed multi-vehicle pileups under flyovers documented. Frequent side-swipes due to sudden lane merging. Red-light runners at major junctions documented. " +
      "KNOWN PROBLEMS: Illegal parking near PJ Old Town commercial storefronts narrows active lanes from 2 to 1. NPE ramp deceleration causes sudden braking chain reaction in peak hours. Jalan Othman long signal phases cause motorists to attempt red-light beating. Evening contraflow creates confusion for unfamiliar drivers. " +
      "NEARBY LANDMARKS: PJ Old Town commercial area, New Pantai Expressway (NPE) intersection, Jalan Othman market area, Jalan Gasing arterial junction. " +
      "DATA SOURCES: Firstboard.com, The Edge Malaysia, EdgeProp, NST, The Star, Malaysia Gazette, Harian Metro, FMT, Facebook/PTLMalaysia, Dashcam Owners Malaysia Network.",
    coordinates: [3.1073, 101.6389],
    zoom: 15,
    state: "Selangor",
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
