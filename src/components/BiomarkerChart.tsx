import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { useLabData } from "../hooks/useLabData";

interface BiomarkerChartProps {
  biomarkerName: string;
  mini?: boolean;
}

interface DataPoint {
  date: string;
  value: number;
  unit: string;
  flag: "high" | "low" | "normal";
  referenceMin?: number;
  referenceMax?: number;
}

function CustomDot(props: { cx?: number; cy?: number; payload?: DataPoint }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  let fill = "#3B82F6";
  if (payload.flag === "high") fill = "#EF4444";
  if (payload.flag === "low") fill = "#3B82F6";

  return (
    <circle cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={2} />
  );
}

export function BiomarkerChart({
  biomarkerName,
  mini = false,
}: BiomarkerChartProps) {
  const { getBiomarkerHistory } = useLabData();
  const history = getBiomarkerHistory(biomarkerName);

  if (history.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        No data available
      </div>
    );
  }

  const data: DataPoint[] = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    value: h.value,
    unit: h.unit,
    flag: h.flag,
    referenceMin: h.referenceMin,
    referenceMax: h.referenceMax,
  }));

  const refMin = history[0].referenceMin;
  const refMax = history[0].referenceMax;
  const unit = history[0].unit;

  const allValues = data.map((d) => d.value);
  const minVal = Math.min(
    ...allValues,
    refMin !== undefined ? refMin : Infinity,
  );
  const maxVal = Math.max(
    ...allValues,
    refMax !== undefined ? refMax : -Infinity,
  );
  const padding = (maxVal - minVal) * 0.15 || 1;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  if (mini) {
    return (
      <ResponsiveContainer width="100%" height={48}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#6B7280" }}
          axisLine={{ stroke: "#D1D5DB" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 12, fill: "#6B7280" }}
          axisLine={{ stroke: "#D1D5DB" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value: number) => [`${value} ${unit}`, biomarkerName]}
          labelFormatter={(label: string) => `Date: ${label}`}
        />
        {refMin !== undefined && refMax !== undefined && (
          <ReferenceArea
            y1={refMin}
            y2={refMax}
            fill="#22C55E"
            fillOpacity={0.08}
            stroke="#22C55E"
            strokeOpacity={0.2}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 6, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
