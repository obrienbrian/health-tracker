import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import { useLabData } from "../hooks/useLabData";
import { FlagBadge } from "../components/FlagBadge";

export function LabResults() {
  const { labResults } = useLabData();

  const sortedResults = useMemo(
    () =>
      [...labResults].sort(
        (a, b) =>
          new Date(b.dateCollected).getTime() -
          new Date(a.dateCollected).getTime(),
      ),
    [labResults],
  );

  const [selectedDate, setSelectedDate] = useState("");
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedDate && sortedResults[0]) {
      setSelectedDate(sortedResults[0].dateCollected);
      setExpandedPanels(new Set(sortedResults[0].panels.map((p) => p.name)));
    }
  }, [sortedResults, selectedDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedResult = sortedResults.find(
    (r) => r.dateCollected === selectedDate,
  );

  function togglePanel(name: string) {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    const result = sortedResults.find((r) => r.dateCollected === date);
    if (result) {
      setExpandedPanels(new Set(result.panels.map((p) => p.name)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your lab panels and biomarker details
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {sortedResults.map((r) => (
                <option key={r.id} value={r.dateCollected}>
                  {new Date(r.dateCollected).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {r.fasting ? " (Fasting)" : ""}
                </option>
              ))}
            </select>
          </div>
          <Link
            to="/results/add"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Result
          </Link>
        </div>
      </div>

      {selectedResult && (
        <div className="space-y-4">
          {selectedResult.panels.map((panel) => {
            const isExpanded = expandedPanels.has(panel.name);
            const flaggedCount = panel.biomarkers.filter(
              (b) => b.flag !== "normal",
            ).length;

            return (
              <div
                key={panel.name}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100"
              >
                <button
                  onClick={() => togglePanel(panel.name)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {panel.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {panel.biomarkers.length} biomarkers
                        {flaggedCount > 0 && (
                          <span className="ml-2 text-amber-600">
                            {flaggedCount} flagged
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Biomarker
                          </th>
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Value
                          </th>
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Flag
                          </th>
                          <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                            Unit
                          </th>
                          <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                            Reference Range
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {panel.biomarkers.map((biomarker) => (
                          <tr
                            key={biomarker.name}
                            className="transition-colors hover:bg-gray-50"
                          >
                            <td className="px-6 py-3">
                              <Link
                                to={`/trends/${encodeURIComponent(biomarker.name)}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {biomarker.name}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                              {biomarker.value}
                            </td>
                            <td className="px-6 py-3">
                              <FlagBadge flag={biomarker.flag} />
                            </td>
                            <td className="hidden px-6 py-3 text-sm text-gray-500 sm:table-cell">
                              {biomarker.unit}
                            </td>
                            <td className="hidden px-6 py-3 text-sm text-gray-500 md:table-cell">
                              {biomarker.referenceMin !== undefined &&
                              biomarker.referenceMax !== undefined
                                ? `${biomarker.referenceMin} - ${biomarker.referenceMax}`
                                : biomarker.referenceMin !== undefined
                                  ? `> ${biomarker.referenceMin}`
                                  : biomarker.referenceMax !== undefined
                                    ? `< ${biomarker.referenceMax}`
                                    : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
