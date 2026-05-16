import { useState, useCallback } from "react";
import type { AnalyzeRequest, AnalysisResponse } from "../types/api";

// During development, Vite proxies /api/* → http://localhost:8000/*
// In production, set VITE_API_URL to the deployed backend origin (e.g. https://your-api.com)
const API_URL = import.meta.env.VITE_API_URL || "";

interface UseAnalysisReturn {
  analysis: AnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  analyze: (payload: AnalyzeRequest) => Promise<void>;
  lastBudgetRange: string | null;
  lastExactBudget: number | null;
  lastAdditionalContext: string | null;
}

export function useAnalysis(): UseAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBudgetRange, setLastBudgetRange] = useState<string | null>(null);
  const [lastExactBudget, setLastExactBudget] = useState<number | null>(null);
  const [lastAdditionalContext, setLastAdditionalContext] = useState<string | null>(null);

  const analyze = useCallback(async (payload: AnalyzeRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setLastBudgetRange(payload.budget_range);
    setLastExactBudget(payload.exact_budget ?? null);
    setLastAdditionalContext(payload.additional_context ?? "");

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.detail ?? errorData.error ?? `Request failed with status ${response.status}`;
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
        setError(errorMessage);
        return;
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analysis, isLoading, error, analyze, lastBudgetRange, lastExactBudget, lastAdditionalContext };
}
