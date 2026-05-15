import { useState } from "react";
import type { AnalysisResponse } from "../types/api";

// In production, set VITE_API_URL to the deployed backend origin (e.g. https://your-api.com)
const API_URL = import.meta.env.VITE_API_URL || "";

interface PdfDownloadButtonProps {
  analysis: AnalysisResponse & { hasEditedCosts?: boolean };
}

export default function PdfDownloadButton({ analysis }: PdfDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEdits = analysis.hasEditedCosts ?? false;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis }),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error ?? `Request failed with status ${response.status}`;
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
        setError(errorMessage);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `JPJ-Report-${analysis.reference_number}.pdf`;

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-busy={isDownloading}
        style={{
          width: "100%",
          padding: "0.625rem 1.25rem",
          backgroundColor: isDownloading ? "#9CA3AF" : "#1E3A5F",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: "0.9375rem",
          border: "none",
          borderRadius: "0.375rem",
          cursor: isDownloading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "background-color 0.2s",
        }}
      >
        {isDownloading ? (
          <>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: "1rem",
                height: "1rem",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 0.75s linear infinite",
              }}
            />
            Menjana PDF... / Generating PDF...
          </>
        ) : (
          <>
            {/* Download icon */}
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Muat Turun Laporan PDF / Download PDF Report
            {hasEdits && (
              <span style={{ fontSize: "0.6875rem", backgroundColor: "#D97706", borderRadius: "4px", padding: "1px 5px", marginLeft: "4px" }}>
                Edited
              </span>
            )}
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "0.5rem",
            color: "#DC2626",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {/* Spinner keyframe — injected once via a style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
