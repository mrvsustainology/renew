export default function OverviewLoading() {
    const shimmer = {
        background: "linear-gradient(90deg, #E4DFD5 25%, #F4F0E8 50%, #E4DFD5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        borderRadius: 8,
    } as React.CSSProperties;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Heading */}
            <div>
                <div style={{ ...shimmer, width: 180, height: 30, marginBottom: 8 }} />
                <div style={{ ...shimmer, width: 260, height: 14 }} />
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #E4DFD5" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ ...shimmer, width: 70, height: 10 }} />
                            <div style={{ ...shimmer, width: 24, height: 24, borderRadius: 6 }} />
                        </div>
                        <div style={{ ...shimmer, width: 80, height: 28 }} />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", padding: "16px 20px" }}>
                <div style={{ ...shimmer, width: 280, height: 14, marginBottom: 14 }} />
                <div style={{ ...shimmer, width: "100%", height: 190 }} />
            </div>

            {/* 2-col charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[1, 2].map(i => (
                    <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", padding: "16px 20px" }}>
                        <div style={{ ...shimmer, width: 200, height: 14, marginBottom: 14 }} />
                        <div style={{ ...shimmer, width: "100%", height: 190 }} />
                    </div>
                ))}
            </div>
        </div>
    );
}
