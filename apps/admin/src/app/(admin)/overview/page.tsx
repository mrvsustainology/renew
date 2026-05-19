"use client";

import {
  Database,
  Users,
  Home,
  Gauge,
  Leaf,
  Package,
  Fuel,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { useOverview, useCharts } from "@/lib/hooks/useSWR";
import { Card, Heading, AlertBox, Tag, THead } from "@/components/ui";
import { ChartCard } from "@/components/ui/ChartCard";
import { C, PIE_C } from "@/lib/utils/tokens";
import OverviewLoading from "./loading";

export default function OverviewPage() {
  const { data: overview, error: ovErr, isLoading: ovLoading } = useOverview();
  const { data: charts, error: chErr, isLoading: chLoading } = useCharts();
  const [showAnomalies, setShowAnomalies] = useState(false);

  if (ovLoading || chLoading) return <OverviewLoading />;
  if (ovErr || chErr)
    return <AlertBox type="error">Failed to load dashboard data</AlertBox>;
  if (!overview || !charts) return null;

  const { stats, fuelDisplacement, anomalyReadings } = overview;
  const surplus = stats.surplus;

  const statCards = [
    { l: "Digesters", v: stats.digesterCount, c: C.primary, I: Database },
    { l: "Operators", v: stats.operatorCount, c: C.info, I: Users },
    { l: "Households", v: stats.householdCount, c: C.success, I: Home },
    {
      l: "Gas Produced",
      v: stats.totalGasProduced.toFixed(1),
      u: "m³",
      c: C.accent,
      I: Gauge,
    },
    {
      l: "Feedstock",
      v: stats.totalFeedstockKg,
      u: "kg",
      c: "#7C3AED",
      I: Leaf,
    },
    { l: "Compost Bags", v: stats.totalCompostBags, c: "#5B21B6", I: Package },
  ];

  const tt = {
    contentStyle: { fontSize: 12, fontFamily: C.sans, borderRadius: 8 },
  };
  const ax = { tick: { fontSize: 10, fill: C.muted } };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      className="fade-in"
    >
      <div>
        <Heading size="xl">Overview</Heading>
        <p
          style={{
            color: C.muted,
            fontSize: 15,
            marginTop: 6,
            fontFamily: C.sans,
          }}
        >
          The Renew Hope Initiative — All Digesters
        </p>
      </div>

      {/* Alerts */}
      {(surplus < 0 ||
        stats.anomalyCount > 0 ||
        stats.unassignedDigesters > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {surplus < 0 && (
            <AlertBox type="error">
              Gas distributed ({stats.totalDistributed.toFixed(1)} m³) exceeds
              produced ({stats.totalGasProduced.toFixed(1)} m³). Deficit:{" "}
              {Math.abs(surplus).toFixed(1)} m³.
            </AlertBox>
          )}
          {stats.anomalyCount > 0 && (
            <>
              {/* Anomaly popup modal */}
              {showAnomalies && (
                <div
                  onClick={() => setShowAnomalies(false)}
                  style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 9999, padding: 28,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: "#fff", borderRadius: 14,
                      width: "88vw", maxHeight: "82vh",
                      display: "flex", flexDirection: "column",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Modal header */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
                      flexShrink: 0,
                    }}>
                      <div>
                        <Heading size="md">Flagged Low-Output Readings</Heading>
                        <div style={{ fontSize: 12, color: C.muted, fontFamily: C.sans, marginTop: 3 }}>
                          {anomalyReadings.length} meter reading(s) with daily production &lt; 5 m³
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAnomalies(false)}
                        style={{
                          background: C.bg, border: `1px solid ${C.border}`,
                          borderRadius: 8, width: 34, height: 34,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: C.muted, flexShrink: 0,
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Scrollable table */}
                    <div style={{ overflow: "auto", flex: 1 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: C.sans }}>
                        <THead cols={["Date", "Digester", "Location", "Meter Reading", "Delta (m³)", "Operator"]} />
                        <tbody>
                          {anomalyReadings.map((r, i) => (
                            <tr
                              key={r.id}
                              style={{ borderBottom: i < anomalyReadings.length - 1 ? `1px solid ${C.border}` : "none" }}
                              onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                              onMouseLeave={e => (e.currentTarget.style.background = "")}
                            >
                              <td style={{ padding: "10px 14px" }}>
                                {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td style={{ padding: "10px 14px", fontFamily: C.mono, fontWeight: 700, color: C.primary }}>{r.digesterId}</td>
                              <td style={{ padding: "10px 14px", color: C.muted }}>{r.location}</td>
                              <td style={{ padding: "10px 14px", fontFamily: C.mono }}>{r.reading} m³</td>
                              <td style={{ padding: "10px 14px" }}>
                                <Tag color="amber">{r.delta} m³</Tag>
                              </td>
                              <td style={{ padding: "10px 14px", fontFamily: C.mono, color: C.muted }}>{r.operatorId ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{
                      padding: "10px 22px", borderTop: `1px solid ${C.border}`,
                      fontSize: 11, color: C.muted, fontFamily: C.mono,
                      flexShrink: 0, textAlign: "right",
                    }}>
                      Click outside to close
                    </div>
                  </div>
                </div>
              )}

              {/* Alert banner — click to open popup */}
              <button
                onClick={() => setShowAnomalies(true)}
                style={{
                  width: "100%", background: "#FFFBEB",
                  border: "1.5px solid #C97C0A90", borderRadius: 8,
                  padding: "10px 14px", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                  ⚠️ {stats.anomalyCount} meter reading(s) flagged for low output (&lt;5 m³)
                </span>
                <span style={{ fontSize: 11, color: C.warning, fontFamily: C.mono, fontWeight: 600, textDecoration: "underline" }}>
                  View all →
                </span>
              </button>
            </>
          )}
          {stats.unassignedDigesters > 0 && (
            <AlertBox type="error">
              {stats.unassignedDigesters} digester(s) unassigned.
            </AlertBox>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        {statCards.map((s) => (
          <Card key={s.l} style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontFamily: C.sans,
                  fontWeight: 600,
                }}
              >
                {s.l}
              </span>
              <div
                style={{ background: s.c + "18", borderRadius: 6, padding: 5 }}
              >
                <s.I size={14} color={s.c} />
              </div>
            </div>
            <div
              style={{
                fontFamily: C.sans,
                fontSize: 28,
                fontWeight: 500,
                color: C.text,
              }}
            >
              {s.v}
              {"u" in s && (
                <span
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    fontWeight: 400,
                    marginLeft: 4,
                  }}
                >
                  {s.u}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {/* Gas Trend */}
      <ChartCard title="Gas Production — Last 14 Days (m³/day)">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart
            data={charts.gasTrend}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" {...ax} interval={1} />
            <YAxis {...ax} unit=" m³" />
            <Tooltip {...tt} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke={C.accent}
              strokeWidth={2.5}
              dot={{ r: 4, fill: C.accent }}
              name="Gas (m³)"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2-col charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Gas Balance by Digester */}
        <ChartCard title="Gas Balance by Digester" expandedMinWidth={Math.max(900, charts.gasBalance.length * 90)}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={charts.gasBalance}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="id" {...ax} />
              <YAxis {...ax} unit=" m³" />
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="produced"
                fill={C.success}
                name="Produced"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="distributed"
                fill={C.accent}
                name="Distributed"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Feedstock by Type */}
        <ChartCard title="Feedstock by Type (kg)">
          {charts.feedstockByType.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={charts.feedstockByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={30}
                >
                  {charts.feedstockByType.map((_, i) => (
                    <Cell key={i} fill={PIE_C[i % 6]} />
                  ))}
                </Pie>
                <Tooltip {...tt} />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Feedstock Trend */}
        <ChartCard title="Feedstock Input — Last 14 Days (kg/day)">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={charts.fsTrend}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" {...ax} interval={1} />
              <YAxis {...ax} unit=" kg" />
              <Tooltip {...tt} />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="weight1"
                stackId="fs"
                fill={C.success}
                name="Weight 1 (kg)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="weight2"
                stackId="fs"
                fill={C.accent}
                name="Weight 2 (kg)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Compost by Digester */}
        <ChartCard title="Total Compost Bags by Digester" expandedMinWidth={Math.max(900, charts.compostByDigester.length * 90)}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={charts.compostByDigester}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="id" {...ax} />
              <YAxis {...ax} unit=" bags" />
              <Tooltip {...tt} />
              <Bar
                dataKey="bags"
                fill="#7C3AED"
                name="Bags"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Compost trend */}
      <ChartCard title="Compost Bags — Last 14 Days">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={charts.compostTrend}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" {...ax} interval={1} />
            <YAxis {...ax} unit=" bags" />
            <Tooltip {...tt} />
            <Bar
              dataKey="bags"
              fill="#7C3AED"
              name="Bags"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Fuel Displacement */}
      {Object.keys(fuelDisplacement).length > 0 && (
        <Card>
          <Heading size="sm" style={{ marginBottom: 14 }}>
            Fuel Displacement
          </Heading>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(fuelDisplacement).map(([f, c]) => (
              <div
                key={f}
                style={{
                  padding: "8px 14px",
                  background: C.bg,
                  borderRadius: 8,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Fuel size={13} color={C.accent} />
                <span style={{ fontSize: 13 }}>{f}</span>
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.primary,
                  }}
                >
                  {c} HH
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
