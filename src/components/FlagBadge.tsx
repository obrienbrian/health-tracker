interface FlagBadgeProps {
  flag: "high" | "low" | "normal";
}

export function FlagBadge({ flag }: FlagBadgeProps) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
    normal: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[flag]}`}
    >
      {flag.charAt(0).toUpperCase() + flag.slice(1)}
    </span>
  );
}
