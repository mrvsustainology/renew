export default function ExportLoading() {
    const shimmer = {
        background: "linear-gradient(90deg, #E4DFD5 25%, #F4F0E8 50%, #E4DFD5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        borderRadius: 8,
    } as React.CSSProperties;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
                <div style={{ ...shimmer, width: 160, height: 30, marginBottom: 8 }} />
                <div style={{ ...shimmer, width: 400, height: 14 }} />
            </div>

            {/* Date filter card */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", padding: "16px 20px" }}>
                <div style={{ ...shimmer, width: 140, height: 16, marginBottom: 10 }} />
                <div style={{ ...shimmer, width: 320, height: 12, marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ ...shimmer, width: 160, height: 42 }} />
                    <div style={{ ...shimmer, width: 160, height: 42 }} />
                </div>
            </div>

            {/* Export cards */}
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                            <div style={{ ...shimmer, width: 44, height: 44, borderRadius: 10 }} />
                            <div>
                                <div style={{ ...shimmer, width: 160, height: 16, marginBottom: 6 }} />
                                <div style={{ ...shimmer, width: 300, height: 12 }} />
                            </div>
                        </div>
                        <div style={{ ...shimmer, width: 80, height: 34, borderRadius: 8 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}
