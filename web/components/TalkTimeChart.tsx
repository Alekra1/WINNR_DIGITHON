"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Participation } from "@/lib/types";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

interface Props {
  participation: Participation[];
}

export default function TalkTimeChart({ participation }: Props) {
  if (!participation || participation.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--text-3)" }}>
        No participation data yet.
      </p>
    );
  }

  const data = participation.map((p) => ({
    name: p.employeeName,
    pct: Math.round(p.talkPct * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 48)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "var(--text-3)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "var(--text-2)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--text-1)",
            fontSize: "12px",
          }}
          formatter={(val) => [`${val}%`, "Talk time"] as [string, string]}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
