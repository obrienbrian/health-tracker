import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useLabData } from "../hooks/useLabData";
import { useAuth } from "../hooks/useAuth";
import { FlagBadge } from "../components/FlagBadge";
import type { Biomarker } from "../types";

export function Dashboard() {
  const { userName } = useAuth();
  const { labResults, getBiomarkerHistory } = useLabData();

  const sortedResults = useMemo(
    () =>
      [...labResults].sort(
        (a, b) =>
          new Date(b.dateCollected).getTime() -
          new Date(a.dateCollected).getTime(),
      ),
    [labResults],
  );

  const latestResult = sortedResults[0];

  const stats = useMemo(() => {
    const allBiomarkerNames = new Set<string>();
    for (const result of labResults) {
      for (const panel of result.panels) {
        for (const biomarker of panel.biomarkers) {
          allBiomarkerNames.add(biomarker.name);
        }
      }
    }

    let flaggedCount = 0;
    if (latestResult) {
      for (const panel of latestResult.panels) {
        for (const biomarker of panel.biomarkers) {
          if (biomarker.flag !== "normal") flaggedCount++;
        }
      }
    }

    return {
      totalBiomarkers: allBiomarkerNames.size,
      flaggedItems: flaggedCount,
      labReports: labResults.length,
      latestDate: latestResult
        ? new Date(latestResult.dateCollected).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A",
    };
  }, [labResults, latestResult]);

  const flaggedBiomarkers = useMemo(() => {
    if (!latestResult) return [];
    const flagged: (Biomarker & { panelName: string })[] = [];
    for (const panel of latestResult.panels) {
      for (const biomarker of panel.biomarkers) {
        if (biomarker.flag !== "normal") {
          flagged.push({ ...biomarker, panelName: panel.name });
        }
      }
    }
    return flagged;
  }, [latestResult]);

  const latestPanels = useMemo(() => {
    if (!latestResult) return [];
    return latestResult.panels.map((panel) => ({
      name: panel.name,
      biomarkerCount: panel.biomarkers.length,
      flaggedCount: panel.biomarkers.filter((b) => b.flag !== "normal").length,
    }));
  }, [latestResult]);

  const statCards = [
    {
      label: "Total Biomarkers Tracked",
      value: stats.totalBiomarkers,
      icon: Activity,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Flagged Items",
      value: stats.flaggedItems,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Lab Reports",
      value: stats.labReports,
      icon: FileText,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Latest Report",
      value: stats.latestDate,
      icon: Calendar,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is an overview of your latest health data.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Flagged Biomarkers */}
      {flaggedBiomarkers.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Flagged Biomarkers
            </h2>
            <Link
              to="/results"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              View all results
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flaggedBiomarkers.map((biomarker) => {
              const history = getBiomarkerHistory(biomarker.name);
              const sparkData = history.slice(-4).map((h) => ({
                value: h.value,
              }));

              return (
                <Link
                  key={biomarker.name}
                  to={`/trends/${encodeURIComponent(biomarker.name)}`}
                  className="block rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {biomarker.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {biomarker.panelName}
                      </p>
                    </div>
                    <FlagBadge flag={biomarker.flag} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {biomarker.value}
                      </p>
                      <p className="text-xs text-gray-500">
                        {biomarker.unit}
                        {biomarker.referenceMin !== undefined &&
                        biomarker.referenceMax !== undefined
                          ? ` (${biomarker.referenceMin}-${biomarker.referenceMax})`
                          : biomarker.referenceMin !== undefined
                            ? ` (>${biomarker.referenceMin})`
                            : biomarker.referenceMax !== undefined
                              ? ` (<${biomarker.referenceMax})`
                              : ""}
                      </p>
                    </div>
                    {sparkData.length >= 2 && (
                      <div className="h-12 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#3B82F6"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Lab Panels */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Lab Panels
        </h2>
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          {latestPanels.map((panel, i) => (
            <div
              key={panel.name}
              className={`flex items-center justify-between px-6 py-4 ${
                i < latestPanels.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-50 p-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {panel.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {panel.biomarkerCount} biomarkers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {panel.flaggedCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    {panel.flaggedCount} flagged
                  </span>
                )}
                <Link to="/results">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
