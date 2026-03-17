export default function OperatorsLoading() {
    const shimmer = {
        background: "linear-gradient(90deg, #E4DFD5 25%, #F4F0E8 50%, #E4DFD5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        borderRadius: 8,
    } as React.CSSProperties;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ ...shimmer, width: 150, height: 30 }} />
                <div style={{ ...shimmer, width: 140, height: 38, borderRadius: 8 }} />
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4DFD5", overflow: "hidden" }}>
                <div style={{ background: "#F4F0E8", padding: "10px 14px", display: "flex", gap: 20 }}>
                    {[80, 100, 90, 80, 80, 60, 80].map((w, i) => (
                        <div key={i} style={{ ...shimmer, width: w, height: 12, background: "#ddd" }} />
                    ))}
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ padding: "12px 14px", display: "flex", gap: 20, borderBottom: "1px solid #E4DFD5" }}>
                        {[80, 120, 90, 80, 80, 60, 80].map((w, j) => (
                            <div key={j} style={{ ...shimmer, width: w, height: 14 }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
