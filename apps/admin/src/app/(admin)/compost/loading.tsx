export default function CompostLoading() {
    const shimmer = {
        background: "linear-gradient(90deg, #E4DFD5 25%, #F4F0E8 50%, #E4DFD5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        borderRadius: 8,
    } as React.CSSProperties;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
                <div style={{ ...shimmer, width: 180, height: 30, marginBottom: 8 }} />
                <div style={{ ...shimmer, width: 300, height: 14 }} />
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #E4DFD5" }}>
                        <div style={{ ...shimmer, width: 80, height: 10, marginBottom: 10 }} />
                        <div style={{ ...shimmer, width: 60, height: 26 }} />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", padding: "16px 20px" }}>
                <div style={{ ...shimmer, width: 280, height: 14, marginBottom: 14 }} />
                <div style={{ ...shimmer, width: "100%", height: 180 }} />
            </div>

            {/* Table */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", overflow: "hidden" }}>
                <div style={{ background: "#F4F0E8", padding: "10px 14px", display: "flex", gap: 20 }}>
                    {[80, 80, 80, 50, 60, 100].map((w, i) => (
                        <div key={i} style={{ ...shimmer, width: w, height: 12, background: "#ddd" }} />
                    ))}
                </div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ padding: "10px 14px", display: "flex", gap: 20, borderBottom: "1px solid #E4DFD5" }}>
                        {[80, 90, 100, 40, 60, 120].map((w, j) => (
                            <div key={j} style={{ ...shimmer, width: w, height: 14 }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
