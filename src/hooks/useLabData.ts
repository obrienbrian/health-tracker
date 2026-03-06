import { useState, useCallback, useEffect } from "react";
import type { LabResult } from "../types";
import { seedLabResults } from "../data/seedData";

const STORAGE_KEY = "healthtracker_lab_results";

interface BiomarkerHistoryEntry {
  date: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  flag: "high" | "low" | "normal";
}

export function useLabData() {
  const [labResults, setLabResults] = useState<LabResult[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as LabResult[];
      } catch {
        // Fall through to seed data
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedLabResults));
    return seedLabResults;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labResults));
  }, [labResults]);

  const addLabResult = useCallback((result: LabResult) => {
    setLabResults((prev) => {
      const updated = [...prev, result];
      return updated;
    });
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

  return { labResults, addLabResult, getBiomarkerHistory };
}
