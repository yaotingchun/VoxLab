"use client";

interface WpmDataPoint {
    time: number;       // seconds since start
    wpm: number;
    wordCount: number;
}

// WPM Zones
const WPM_TARGET_LOW = 130;
const WPM_TARGET_HIGH = 155;
const WPM_WARNING_LOW = 110;
const WPM_WARNING_HIGH = 180;

function getWpmZoneColor(wpm: number): string {
    if (wpm < WPM_WARNING_LOW) return "#ef4444";   // red
    if (wpm < WPM_TARGET_LOW) return "#f59e0b";    // amber
    if (wpm <= WPM_TARGET_HIGH) return "#22c55e";   // green
    if (wpm <= WPM_WARNING_HIGH) return "#f59e0b";  // amber
    return "#ef4444";                                // red
}

export function PacingChart({ dataPoints }: { dataPoints: WpmDataPoint[] }) {
    if (dataPoints.length < 2) return null;

    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxTime = Math.max(...dataPoints.map(d => d.time));
    const maxWpm = Math.max(WPM_WARNING_HIGH + 20, ...dataPoints.map(d => d.wpm));
    const minWpm = Math.max(0, Math.min(WPM_WARNING_LOW - 20, ...dataPoints.map(d => d.wpm)));
    const wpmRange = maxWpm - minWpm;

    const scaleX = (t: number) => padding.left + (t / maxTime) * chartW;
    const scaleY = (w: number) => padding.top + chartH - ((w - minWpm) / wpmRange) * chartH;

    // Build SVG path
    const pathData = dataPoints
        .map((dp, i) => `${i === 0 ? "M" : "L"} ${scaleX(dp.time).toFixed(1)} ${scaleY(dp.wpm).toFixed(1)}`)
        .join(" ");

    // Area under the line
    const areaData = pathData
        + ` L ${scaleX(dataPoints[dataPoints.length - 1].time).toFixed(1)} ${scaleY(minWpm).toFixed(1)}`
        + ` L ${scaleX(dataPoints[0].time).toFixed(1)} ${scaleY(minWpm).toFixed(1)} Z`;

    // Horizontal zone lines
    const zoneLines = [
        { wpm: WPM_WARNING_LOW, label: `${WPM_WARNING_LOW}`, color: "#ef4444", dash: "4,4" },
        { wpm: WPM_TARGET_LOW, label: `${WPM_TARGET_LOW}`, color: "#22c55e", dash: "6,3" },
        { wpm: WPM_TARGET_HIGH, label: `${WPM_TARGET_HIGH}`, color: "#22c55e", dash: "6,3" },
        { wpm: WPM_WARNING_HIGH, label: `${WPM_WARNING_HIGH}`, color: "#ef4444", dash: "4,4" },
    ].filter(z => z.wpm >= minWpm && z.wpm <= maxWpm);

    // Target zone shading
    const targetTop = scaleY(Math.min(WPM_TARGET_HIGH, maxWpm));
    const targetBottom = scaleY(Math.max(WPM_TARGET_LOW, minWpm));

    // Time axis labels
    const timeLabels: number[] = [];
    const step = maxTime <= 30 ? 10 : maxTime <= 120 ? 30 : 60;
    for (let t = 0; t <= maxTime; t += step) {
        timeLabels.push(t);
    }

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
            {/* Target zone shading */}
            <rect
                x={padding.left} y={targetTop}
                width={chartW} height={targetBottom - targetTop}
                fill="#22c55e" opacity="0.06"
            />

            {/* Zone reference lines */}
            {zoneLines.map((z, i) => (
                <g key={i}>
                    <line
                        x1={padding.left} y1={scaleY(z.wpm)}
                        x2={padding.left + chartW} y2={scaleY(z.wpm)}
                        stroke={z.color} strokeWidth="1" strokeDasharray={z.dash} opacity="0.4"
                    />
                    <text x={padding.left - 5} y={scaleY(z.wpm) + 4} textAnchor="end" fill={z.color} fontSize="10" opacity="0.6">
                        {z.label}
                    </text>
                </g>
            ))}

            {/* Area fill */}
            <path d={areaData} fill="url(#areaGradient)" />
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Main line */}
            <path d={pathData} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Data points */}
            {dataPoints.map((dp, i) => (
                <circle
                    key={i}
                    cx={scaleX(dp.time)} cy={scaleY(dp.wpm)}
                    r="4" fill={getWpmZoneColor(dp.wpm)} stroke="#1a1a2e" strokeWidth="2"
                />
            ))}

            {/* X-axis labels */}
            {timeLabels.map(t => (
                <text key={t} x={scaleX(t)} y={height - 5} textAnchor="middle" fill="#6b7280" fontSize="10">
                    {t}s
                </text>
            ))}

            {/* Axis label */}
            <text x={padding.left - 5} y={padding.top - 6} textAnchor="end" fill="#6b7280" fontSize="10">
                WPM
            </text>
        </svg>
    );
}
