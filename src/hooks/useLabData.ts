import { useState, useCallback, useEffect } from "react";
import type { LabResult } from "../types";
import { api } from "../lib/api";

interface BiomarkerHistoryEntry {
  date: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  flag: "high" | "low" | "normal";
}

export function useLabData() {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLabs() {
      try {
        const data = await api<LabResult[]>("/labs");
        if (!cancelled) {
          setLabResults(data);
        }
      } catch (err) {
        console.error("Failed to fetch lab results:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLabs();
    return () => { cancelled = true; };
  }, []);

  const getBiomarkerHistory = useCallback(
    (name: string): BiomarkerHistoryEntry[] => {
      const entries: BiomarkerHistoryEntry[] = [];

      for (const result of labResults) {
        for (const panel of result.panels) {
          for (const biomarker of panel.biomarkers) {
            if (biomarker.name === name) {
              entries.push({
                date: result.dateCollected,
                value: biomarker.value,
                unit: biomarker.unit,
                referenceMin: biomarker.referenceMin,
                referenceMax: biomarker.referenceMax,
                flag: biomarker.flag,
              });
            }
          }
        }
      }

      return entries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    },
    [labResults],
  );

  return { labResults, loading, getBiomarkerHistory };
}
