"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft, Download } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
    digestersApi, reportsApi,
    type Digester, type DigesterDetail, type Operator,
} from "@/lib/api/admin.api";
import { useDigesters, useOperators } from "@/lib/hooks/useSWR";
import {
    Card, Heading, Tag, Btn, Field, TI, AlertBox,
    THead, Paginator, DateFilter, PhotoBtn, PhotoModal,
} from "@/components/ui";
import { C } from "@/lib/utils/tokens";
import DigestersLoading from "./loading";

const PAGE_SIZE = 10;

function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function applyDF<T extends { date: string }>(rows: T[], from: string, to: string): T[] {
    return rows.filter(r => {
        if (from && r.date < from) return false;
        if (to && r.date > to) return false;
        return true;
    });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(filename: string, rows: any[], columns: { key: string; header: string }[]) {
    const header = columns.map(c => `"${c.header}"`).join(",");
    const body = rows.map(r =>
        columns.map(c => {
            const v = r[c.key] ?? "";
            return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
    ).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const TAB_COLUMNS: Record<string, { key: string; header: string }[]> = {
    feedstock: [
        { key: "date", header: "Date" },
        { key: "type", header: "Type" },
        { key: "weight", header: "Weight (kg)" },
        { key: "waterLitres", header: "Water (L)" },
        { key: "notes", header: "Notes" },
    ],
    meter: [
        { key: "date", header: "Date" },
        { key: "reading", header: "Meter Reading (m³)" },
        { key: "notes", header: "Notes" },
    ],
    distribution: [
        { key: "date", header: "Date" },
        { key: "householdHead", header: "Household" },
        { key: "volume", header: "Volume (m³)" },
    ],
    compost: [
        { key: "date", header: "Date" },
        { key: "bags", header: "Bags" },
        { key: "notes", header: "Notes" },
    ],
};

// ─── Digester Detail View ─────────────────────────────────────────────────────
function DigesterDetailView({
    id,
    onBack,
}: {
    id: string;
    onBack: () => void;
}) {
    const [detail, setDetail] = useState<DigesterDetail | null>(null);
    const [feedstockRows, setFeedstockRows] = useState<any[]>([]);
    const [meterRows, setMeterRows] = useState<any[]>([]);
    const [distRows, setDistRows] = useState<any[]>([]);
    const [compostRows, setCompostRows] = useState<any[]>([]);
    const [tab, setTab] = useState("overview");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [photoModal, setPhotoModal] = useState<{ url: string; caption: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            digestersApi.getById(id),
            reportsApi.getTableData("feedstock"),
            reportsApi.getTableData("meter"),
            reportsApi.getTableData("distribution"),
            reportsApi.getTableData("compost"),
        ]).then(([d, fs, m, dist, c]) => {
            setDetail(d);
            setFeedstockRows(fs.filter((r: any) => r.digesterId === id));
            setMeterRows(m.filter((r: any) => r.digesterId === id));
            setDistRows(dist.filter((r: any) => r.digesterId === id));
            setCompostRows(c.filter((r: any) => r.digesterId === id));
        }).finally(() => setLoading(false));
    }, [id]);

    if (loading || !detail) {
        const shimmer: React.CSSProperties = {
            background: "linear-gradient(90deg, #E4DFD5 25%, #F4F0E8 50%, #E4DFD5 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
            borderRadius: 8,
        };
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Back button + title */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...shimmer, width: 72, height: 34, borderRadius: 8 }} />
                    <div style={{ ...shimmer, width: 140, height: 28 }} />
                    <div style={{ ...shimmer, width: 56, height: 22, borderRadius: 4 }} />
                </div>

                {/* Dark header card skeleton */}
                <div style={{ background: C.primary, borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                        {[100, 160, 80, 50].map((w, i) => (
                            <div key={i}>
                                <div style={{ ...shimmer, width: w * 0.6, height: 10, marginBottom: 8, opacity: 0.4 }} />
                                <div style={{ ...shimmer, width: w, height: 16, opacity: 0.3 }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ background: "#fff", border: "1px solid #E4DFD5", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ ...shimmer, width: "60%", height: 22, margin: "0 auto 8px" }} />
                            <div style={{ ...shimmer, width: "80%", height: 10, margin: "0 auto" }} />
                        </div>
                    ))}
                </div>

                {/* Tab buttons */}
                <div style={{ display: "flex", gap: 6 }}>
                    {[90, 110, 85, 110, 85].map((w, i) => (
                        <div key={i} style={{ ...shimmer, width: w, height: 34, borderRadius: 8 }} />
                    ))}
                </div>

                {/* Table card */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", overflow: "hidden" }}>
                    <div style={{ background: "#F4F0E8", padding: "10px 14px", display: "flex", gap: 20 }}>
                        {[70, 100, 80, 70, 60, 100].map((w, i) => (
                            <div key={i} style={{ ...shimmer, width: w, height: 12 }} />
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ padding: "12px 14px", display: "flex", gap: 20, borderBottom: "1px solid #E4DFD5" }}>
                            {[70, 100, 80, 70, 60, 100].map((w, j) => (
                                <div key={j} style={{ ...shimmer, width: w, height: 14 }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const changeTab = (t: string) => { setTab(t); setFrom(""); setTo(""); setPage(1); };

    // ── Overview chart data ────────────────────────────────────────────────
    // Gas trend: sort meter readings ascending, compute consecutive deltas
    const sortedMeter = [...meterRows].sort((a: any, b: any) => a.date < b.date ? -1 : 1);
    const gasTrend = sortedMeter.slice(1).map((r: any, i: number) => {
        const delta = +(r.reading - sortedMeter[i].reading).toFixed(2);
        return { date: r.date.slice(5), volume: delta >= 0 ? delta : 0 };
    });

    // Feedstock by type
    const fsByType: Record<string, number> = {};
    for (const r of feedstockRows) {
        fsByType[(r as any).type] = (fsByType[(r as any).type] ?? 0) + (r as any).weight;
    }
    const feedstockByType = Object.entries(fsByType).map(([name, value]) => ({
        name, value: +value.toFixed(1),
    }));

    const tabData: Record<string, any[]> = {
        feedstock: feedstockRows,
        meter: meterRows,
        distribution: distRows,
        compost: compostRows,
    };
    const filtered = tab === "overview" ? [] : applyDF(tabData[tab] ?? [], from, to);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const { stats } = detail;
    const surplus = stats.totalGasProduced - stats.totalDistributed;
    const anomalies = meterRows.filter((r: any) => r.dailyProduction < 5 && r.dailyProduction != null);

    const TABS = [
        { id: "overview",     label: "Overview" },
        { id: "feedstock",    label: `Feedstock (${feedstockRows.length})` },
        { id: "meter",        label: `Meter (${meterRows.length})` },
        { id: "distribution", label: `Distribution (${distRows.length})` },
        { id: "compost",      label: `Compost (${compostRows.length})` },
    ];

    const tt = { contentStyle: { fontSize: 12, borderRadius: 8 } };
    const ax = { tick: { fontSize: 10, fill: C.muted } };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fade-in">
            {photoModal && (
                <PhotoModal url={photoModal.url} caption={photoModal.caption} onClose={() => setPhotoModal(null)} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                    onClick={onBack}
                    style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "7px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: C.muted,
                        fontSize: 13,
                        fontFamily: C.sans,
                        cursor: "pointer",
                    }}
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <Heading size="xl">{detail.id}</Heading>

                {/* Status badge card */}
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: C.mono,
                        background: detail.status === "active" ? "#DCFCE7" : "#F3F4F6",
                        color: detail.status === "active" ? "#14532D" : "#374151",
                        border: `1px solid ${detail.status === "active" ? "#86EFAC" : C.border}`,
                    }}
                >
                    <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: detail.status === "active" ? "#16A34A" : "#9CA3AF",
                        display: "inline-block",
                    }} />
                    {detail.status}
                </div>

                {/* Export button (visible on data tabs) */}
                {tab !== "overview" && TAB_COLUMNS[tab] && (
                    <button
                        onClick={() => exportCSV(
                            `${id}_${tab}_${new Date().toISOString().split("T")[0]}.csv`,
                            filtered,
                            TAB_COLUMNS[tab],
                        )}
                        style={{
                            marginLeft: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 14px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: C.sans,
                            cursor: "pointer",
                            background: C.accent,
                            color: "#fff",
                            border: "none",
                        }}
                    >
                        <Download size={13} /> Export CSV
                    </button>
                )}
            </div>

            {/* Header card */}
            <Card style={{ background: C.primary, border: "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
                    {[
                        ["LOCATION", detail.location],
                        ["OPERATOR", detail.operator ? `${detail.operator.name} (${detail.operator.id})` : null],
                        ["INSTALLED", fmtDate(detail.installedDate)],
                        ["HOUSEHOLDS", String(detail.households.length)],
                    ].map(([lbl, val]) => (
                        <div key={lbl!}>
                            <div style={{ fontSize: 10, color: "#9DC0AB", fontFamily: C.mono, letterSpacing: 1.5 }}>{lbl}</div>
                            <div style={{ color: !val ? "#FF9999" : "#fff", fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                                {val ?? "Unassigned"}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                {[
                    { l: "Gas Produced",  v: stats.totalGasProduced.toFixed(1), u: "m³",  c: C.success },
                    { l: "Distributed",   v: stats.totalDistributed.toFixed(1),  u: "m³",  c: C.accent },
                    { l: surplus >= 0 ? "Surplus" : "Deficit", v: Math.abs(surplus).toFixed(1), u: "m³", c: surplus < 0 ? C.danger : C.info },
                    { l: "Feedstock",     v: String(stats.totalFeedstockKg),     u: "kg",  c: "#7C3AED" },
                    { l: "Compost Bags",  v: String(stats.totalCompostBags),              c: "#5B21B6" },
                ].map(s => (
                    <Card key={s.l} style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontFamily: C.mono, fontSize: 18, color: s.c, fontWeight: 600 }}>
                            {s.v}<span style={{ fontSize: 10, color: C.muted }}> {"u" in s ? s.u : ""}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.l}</div>
                    </Card>
                ))}
            </div>

            {anomalies.length > 0 && (
                <AlertBox type="warning">{anomalies.length} low-output reading(s) flagged (&lt;5 m³).</AlertBox>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => changeTab(t.id)}
                        style={{
                            padding: "7px 14px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: C.sans,
                            cursor: "pointer",
                            border: "none",
                            background: tab === t.id ? C.primary : C.border,
                            color: tab === t.id ? "#fff" : C.muted,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Overview tab ── */}
            {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Operator + last readings row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                        {/* Operator card */}
                        <Card>
                            <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Assigned Operator</div>
                            {detail.operator ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: C.sans, color: C.text }}>{detail.operator.name}</div>
                                    <div style={{ display: "flex", gap: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>ID</div>
                                            <div style={{ fontFamily: C.mono, fontSize: 13, color: C.primary, fontWeight: 700 }}>{detail.operator.id}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Phone</div>
                                            <div style={{ fontFamily: C.mono, fontSize: 13 }}>{detail.operator.phone}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Status</div>
                                            <Tag color={detail.operator.status === "active" ? "green" : "red"}>{detail.operator.status}</Tag>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <AlertBox type="warning">No operator assigned to this digester.</AlertBox>
                            )}
                        </Card>

                        {/* Activity summary card */}
                        <Card>
                            <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Activity Summary</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {[
                                    { label: "Feedstock Entries", value: stats.feedstockEntries },
                                    { label: "Meter Readings",    value: meterRows.length },
                                    { label: "Distributions",     value: stats.distributionRecords },
                                    { label: "Compost Entries",   value: stats.compostEntries },
                                ].map(s => (
                                    <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                                        <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: C.text }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Gas production trend */}
                    <Card>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: C.sans, color: C.text, marginBottom: 14 }}>
                            Gas Production Trend (m³ per reading interval)
                        </div>
                        {gasTrend.length < 2 ? (
                            <div style={{ color: C.muted, fontSize: 13, padding: "20px 0" }}>Not enough meter readings to show trend.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={gasTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                                    <XAxis dataKey="date" {...ax} />
                                    <YAxis {...ax} />
                                    <Tooltip {...tt} formatter={(v: any) => [`${v} m³`, "Gas"]} />
                                    <Line type="monotone" dataKey="volume" stroke={C.success} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Feedstock by type */}
                    {feedstockByType.length > 0 && (
                        <Card>
                            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: C.sans, color: C.text, marginBottom: 14 }}>
                                Feedstock by Type (kg, all time)
                            </div>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={feedstockByType} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                                    <XAxis dataKey="name" {...ax} />
                                    <YAxis {...ax} />
                                    <Tooltip {...tt} formatter={(v: any) => [`${v} kg`, "Weight"]} />
                                    <Bar dataKey="value" fill={C.success} radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {/* Households list */}
                    <Card style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                            <Heading size="sm">Enrolled Households ({detail.households.length})</Heading>
                        </div>
                        {detail.households.length === 0 ? (
                            <div style={{ padding: "20px 16px", color: C.muted, fontSize: 13 }}>No households enrolled yet.</div>
                        ) : (
                            <div style={{ overflow: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: C.sans }}>
                                    <THead cols={["Head Name", "Phone", "Members", "Fuel Replaced", "Joined"]} />
                                    <tbody>
                                        {detail.households.map((hh, i) => (
                                            <tr key={hh.id} style={{ borderBottom: i < detail.households.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                                <td style={{ padding: "9px 14px", fontWeight: 600 }}>{hh.headName}</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono }}>{hh.phone}</td>
                                                <td style={{ padding: "9px 14px", textAlign: "center" }}>{hh.members}</td>
                                                <td style={{ padding: "9px 14px" }}>
                                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                        {hh.fuelReplaced.length === 0
                                                            ? <Tag color="gray">None</Tag>
                                                            : hh.fuelReplaced.map(f => <Tag key={f} color="blue">{f}</Tag>)
                                                        }
                                                    </div>
                                                </td>
                                                <td style={{ padding: "9px 14px", color: C.muted }}>{fmtDate(hh.joinedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ── Data tabs ── */}
            {tab !== "overview" && (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                    <DateFilter from={from} setFrom={v => { setFrom(v); setPage(1); }} to={to} setTo={v => { setTo(v); setPage(1); }} />
                    <div style={{ overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: C.sans }}>
                            {tab === "feedstock" && (
                                <>
                                    <THead cols={["Date", "Type", "Weight", "Water (L)", "Photo", "Notes"]} />
                                    <tbody>
                                        {paginated.map((r: any, i: number) => (
                                            <tr key={r.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                                <td style={{ padding: "9px 14px" }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding: "9px 14px" }}>{r.type}</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono }}>{r.weight} kg</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono }}>{r.waterLitres ?? 0} L</td>
                                                <td style={{ padding: "9px 14px" }}>
                                                    <PhotoBtn url={r.photoUrl} caption={`${r.type} · ${fmtDate(r.date)}`} setModal={setPhotoModal} />
                                                </td>
                                                <td style={{ padding: "9px 14px", color: C.muted }}>{r.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {tab === "meter" && (
                                <>
                                    <THead cols={["Date", "Meter Reading", "Photo", "Notes"]} />
                                    <tbody>
                                        {paginated.map((r: any, i: number) => (
                                            <tr key={r.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                                <td style={{ padding: "9px 14px" }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono, fontWeight: 700 }}>{r.reading} m³</td>
                                                <td style={{ padding: "9px 14px" }}>
                                                    <PhotoBtn url={r.photoUrl} caption={`Meter · ${fmtDate(r.date)}`} setModal={setPhotoModal} />
                                                </td>
                                                <td style={{ padding: "9px 14px", color: C.muted }}>{r.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {tab === "distribution" && (
                                <>
                                    <THead cols={["Date", "Household", "Volume"]} />
                                    <tbody>
                                        {paginated.map((r: any, i: number) => (
                                            <tr key={r.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                                <td style={{ padding: "9px 14px" }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding: "9px 14px" }}>{r.householdHead}</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono }}>{r.volume} m³</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {tab === "compost" && (
                                <>
                                    <THead cols={["Date", "Bags", "Photo", "Notes"]} />
                                    <tbody>
                                        {paginated.map((r: any, i: number) => (
                                            <tr key={r.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                                <td style={{ padding: "9px 14px" }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding: "9px 14px", fontFamily: C.mono, fontWeight: 700, color: "#7C3AED" }}>{r.bags}</td>
                                                <td style={{ padding: "9px 14px" }}>
                                                    <PhotoBtn url={r.photoUrl} caption={`Compost · ${fmtDate(r.date)}`} setModal={setPhotoModal} />
                                                </td>
                                                <td style={{ padding: "9px 14px", color: C.muted }}>{r.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                    <Paginator page={safePage} totalPages={totalPages} setPage={setPage} total={filtered.length} />
                </Card>
            )}
        </div>
    );
}

// ─── Digesters List Page ──────────────────────────────────────────────────────
export default function DigestersPage() {
    const { data: digesters = [], isLoading: dLoading, mutate: mutateDigesters } = useDigesters();
    const { data: operators = [], isLoading: oLoading } = useOperators();
    const [detail, setDetail] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ id: "", location: "", installedDate: todayISO() });
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const loading = dLoading || oLoading;

    if (detail) {
        return <DigesterDetailView id={detail} onBack={() => setDetail(null)} />;
    }

    const totalPages = Math.max(1, Math.ceil(digesters.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = digesters.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleAdd = async () => {
        if (!form.id || !form.location || !form.installedDate) {
            setFormError("All fields are required");
            return;
        }
        setSubmitting(true);
        setFormError("");
        try {
            await digestersApi.create(form);
            mutateDigesters();
            setForm({ id: "", location: "", installedDate: todayISO() });
            setShowAdd(false);
        } catch (err: any) {
            setFormError(err?.response?.data?.message ?? "Failed to create digester");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DigestersLoading />;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Heading size="xl">Digesters</Heading>
                <Btn icon={Plus} onClick={() => setShowAdd(true)}>Add Digester</Btn>
            </div>

            {showAdd && (
                <Card style={{ border: `2px solid ${C.primary}` }} className="fade-in">
                    <Heading size="md" style={{ marginBottom: 16 }}>Register New Digester</Heading>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <Field label="Digester ID" required note="e.g. DG-007">
                            <TI value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))} placeholder="DG-XXX" />
                        </Field>
                        <Field label="Installation Date" required>
                            <TI type="date" value={form.installedDate} onChange={e => setForm(f => ({ ...f, installedDate: e.target.value }))} />
                        </Field>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <Field label="Location / Address" required>
                                <TI value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Village, Ward, Block..." />
                            </Field>
                        </div>
                    </div>
                    {formError && <div style={{ marginTop: 10, color: C.danger, fontSize: 13 }}>{formError}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <Btn onClick={handleAdd} disabled={submitting}>{submitting ? "Registering…" : "Register"}</Btn>
                        <Btn variant="secondary" onClick={() => { setShowAdd(false); setFormError(""); }}>Cancel</Btn>
                    </div>
                </Card>
            )}

            <Card style={{ padding: 0, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: C.sans }}>
                    <THead cols={["Digester", "Location", "Installed", "Operator", "HH", "Status"]} />
                    <tbody>
                        {paginated.map((d, i) => (
                            <tr
                                key={d.id}
                                onClick={() => setDetail(d.id)}
                                style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                                onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                                onMouseLeave={e => (e.currentTarget.style.background = "")}
                            >
                                <td style={{ padding: "12px 14px", fontFamily: C.mono, fontWeight: 700, color: C.primary }}>{d.id}</td>
                                <td style={{ padding: "12px 14px" }}>{d.location}</td>
                                <td style={{ padding: "12px 14px", color: C.muted }}>{fmtDate(d.installedDate)}</td>
                                <td style={{ padding: "12px 14px" }}>
                                    {d.operator
                                        ? <Tag color="green">{d.operator.id}</Tag>
                                        : <Tag color="red">Unassigned</Tag>
                                    }
                                </td>
                                <td style={{ padding: "12px 14px", textAlign: "center" }}>{d.householdCount}</td>
                                <td style={{ padding: "12px 14px" }}>
                                    <Tag color={d.status === "active" ? "green" : "gray"}>{d.status}</Tag>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Paginator page={safePage} totalPages={totalPages} setPage={setPage} total={digesters.length} />
            </Card>
        </div>
    );
}
