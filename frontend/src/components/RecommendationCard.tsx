import type { Recommendation } from "../types/api";

interface RecommendationCardProps {
  recommendation: Recommendation;
  isHighlighted: boolean;
}

// Hex colors matching design spec for inline styles
const PRIORITY_HEX: Record<Recommendation["priority_level"], string> = {
  Critical: "#DC2626",
  High: "#D97706",
  Medium: "#2563EB",
};

export default function RecommendationCard({
  recommendation,
  isHighlighted,
}: RecommendationCardProps) {
  const { action, responsible_party, estimated_timeline, priority_level } =
    recommendation;

  const badgeStyle = {
    backgroundColor: PRIORITY_HEX[priority_level],
    color: "#ffffff",
  };

  return (
    <div
      className={[
        "rounded-lg border p-4 transition-all",
        isHighlighted
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white",
      ].join(" ")}
    >
      {/* Priority badge */}
      <span
        className="inline-block rounded px-2 py-0.5 text-xs font-semibold mb-2"
        style={badgeStyle}
      >
        {priority_level}
      </span>

      {/* Action */}
      <p className="text-sm font-medium text-gray-900 mb-3">{action}</p>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span>
          <span className="font-semibold">Pihak Bertanggungjawab / Party: </span>
          {responsible_party}
        </span>
        <span>
          <span className="font-semibold">Tempoh / Timeline: </span>
          {estimated_timeline}
        </span>
      </div>
    </div>
  );
}
