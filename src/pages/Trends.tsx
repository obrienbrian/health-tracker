import { useParams } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { BiomarkerChart } from "../components/BiomarkerChart";

const POPULAR_BIOMARKERS = [
  "Testosterone, Total",
  "LDL",
  "Glucose",
  "HbA1c",
  "TSH",
  "Estradiol",
];

export function Trends() {
  const { biomarkerName } = useParams<{ biomarkerName: string }>();
  const decodedName = biomarkerName
    ? decodeURIComponent(biomarkerName)
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track how your biomarkers change over time
        </p>
      </div>

      {/* Featured biomarker */}
      {decodedName && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {decodedName}
            </h2>
          </div>
          <BiomarkerChart biomarkerName={decodedName} />
        </div>
      )}

      {/* Popular biomarkers grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {decodedName ? "Other Biomarkers" : "Popular Biomarkers"}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {POPULAR_BIOMARKERS.filter((name) => name !== decodedName).map(
            (name) => (
              <div
                key={name}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
              >
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  {name}
                </h3>
                <BiomarkerChart biomarkerName={name} />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
