import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import type { Biomarker } from "../types";
import { FlagBadge } from "./FlagBadge";

interface PanelAccordionProps {
  name: string;
  biomarkers: Biomarker[];
  defaultExpanded?: boolean;
  onUpdate: (biomarkers: Biomarker[]) => void;
  onRemovePanel: () => void;
}

function computeFlag(value: number, refMin?: number, refMax?: number): "high" | "low" | "normal" {
  if (refMax !== undefined && value > refMax) return "high";
  if (refMin !== undefined && value < refMin) return "low";
  return "normal";
}

export function PanelAccordion({
  name,
  biomarkers,
  defaultExpanded = false,
  onUpdate,
  onRemovePanel,
}: PanelAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  function updateBiomarker(index: number, field: keyof Biomarker, raw: string) {
    const updated = [...biomarkers];
    const b = { ...updated[index] };

    if (field === "name" || field === "unit") {
      (b[field] as string) = raw;
    } else if (field === "value") {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        b.value = num;
        b.flag = computeFlag(num, b.referenceMin, b.referenceMax);
      }
    } else if (field === "referenceMin") {
      const num = raw === "" ? undefined : parseFloat(raw);
      b.referenceMin = isNaN(num as number) ? undefined : num;
      b.flag = computeFlag(b.value, b.referenceMin, b.referenceMax);
    } else if (field === "referenceMax") {
      const num = raw === "" ? undefined : parseFloat(raw);
      b.referenceMax = isNaN(num as number) ? undefined : num;
      b.flag = computeFlag(b.value, b.referenceMin, b.referenceMax);
    }

    updated[index] = b;
    onUpdate(updated);
  }

  function removeBiomarker(index: number) {
    onUpdate(biomarkers.filter((_, i) => i !== index));
  }

  function addBiomarker() {
    onUpdate([
      ...biomarkers,
      { name: "", value: 0, unit: "", flag: "normal" as const },
    ]);
  }

  const flaggedCount = biomarkers.filter((b) => b.flag !== "normal").length;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
            <p className="text-xs text-gray-500">
              {biomarkers.length} biomarkers
              {flaggedCount > 0 && (
                <span className="ml-2 text-amber-600">
                  {flaggedCount} flagged
                </span>
              )}
            </p>
          </div>
        </button>
        <button
          onClick={onRemovePanel}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Remove panel"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Test Name
                  </th>
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Value
                  </th>
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Unit
                  </th>
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ref Min
                  </th>
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ref Max
                  </th>
                  <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Flag
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {biomarkers.map((b, i) => (
                  <tr key={`${b.name}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => updateBiomarker(i, "name", e.target.value)}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="Test name"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="any"
                        value={b.value}
                        onChange={(e) => updateBiomarker(i, "value", e.target.value)}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={b.unit}
                        onChange={(e) => updateBiomarker(i, "unit", e.target.value)}
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="unit"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="any"
                        value={b.referenceMin ?? ""}
                        onChange={(e) => updateBiomarker(i, "referenceMin", e.target.value)}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="min"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="any"
                        value={b.referenceMax ?? ""}
                        onChange={(e) => updateBiomarker(i, "referenceMax", e.target.value)}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="max"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <FlagBadge flag={b.flag} />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeBiomarker(i)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove biomarker"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={addBiomarker}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add biomarker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
