"use client";

import { useMemo } from "react";

interface PitchChartProps {
    pitchData: number[]; // Array of Hz values
    volumeData: number[]; // Array of RMS values
    color?: string;
}

export function PitchChart({
    pitchData,
    volumeData,
    color = "#8b5cf6" // violet-500
}: PitchChartProps) {

    // Internal coordinate system
    const COORD_WIDTH = 1000;
    const COORD_HEIGHT = 200;

    // Process data for the chart
    const { pathData, areaData, minHz, maxHz } = useMemo(() => {
        if (!pitchData || pitchData.length < 2) return { pathData: "", areaData: "", minHz: 0, maxHz: 0 };

        const validPitches = pitchData.filter(p => p > 50);

        // Auto-scale Y-axis
        let chartMin = 70;
        let chartMax = 300;

        if (validPitches.length > 0) {
            const dataMin = Math.min(...validPitches);
            const dataMax = Math.max(...validPitches);
            const range = dataMax - dataMin;
            const padding = Math.max(20, range * 0.2);

            chartMin = Math.max(50, dataMin - padding);
            chartMax = Math.max(chartMin + 50, dataMax + padding);
        }

        const range = chartMax - chartMin;
        const maxPoints = 200;
        const step = Math.max(1, Math.ceil(pitchData.length / maxPoints));

        // Collect ALL valid points
        const points: { x: number; y: number }[] = [];

        for (let i = 0; i < pitchData.length; i += step) {
            let sumPitch = 0;
            let count = 0;

            for (let j = 0; j < step && (i + j) < pitchData.length; j++) {
                const p = pitchData[i + j];
                if (p > 50) {
                    sumPitch += p;
                    count++;
                }
            }

            // Only add point if we have signal. 
            // If no signal, we simply DON'T add a point.
            // This means the line will naturally connect from the previous valid point 
            // to the next valid point, "bridging" the gap linearly.
            if (count > 0) {
                const avgPitch = sumPitch / count;
                const normalized = Math.max(0, Math.min(1, (avgPitch - chartMin) / range));

                const x = (i / (pitchData.length - 1)) * COORD_WIDTH;
                const y = COORD_HEIGHT - (normalized * COORD_HEIGHT);

                points.push({ x, y });
            }
        }

        if (points.length < 2) return { pathData: "", areaData: "", minHz: Math.round(chartMin), maxHz: Math.round(chartMax) };

        // Build Paths
        let finalPath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

        for (let i = 1; i < points.length; i++) {
            // Check delta X. If it's HUGE (e.g. > 50% of graph), maybe we break?
            // But user wants "continuous". Let's just connect them.
            // This interpolates silence.
            finalPath += ` L ${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
        }

        // Area
        const startX = points[0].x.toFixed(1);
        const endX = points[points.length - 1].x.toFixed(1);
        const finalArea = `${finalPath} L ${endX},${COORD_HEIGHT} L ${startX},${COORD_HEIGHT} Z`;

        return { pathData: finalPath, areaData: finalArea, minHz: Math.round(chartMin), maxHz: Math.round(chartMax) };

    }, [pitchData, volumeData]);

    if (!pathData) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs bg-white/5 rounded-lg">
                Not enough pitch data to graph
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {/* HTML Labels */}
            <div className="absolute -top-1 left-0 text-[11px] font-bold text-slate-300 pointer-events-none">
                High ({maxHz}Hz)
            </div>
            <div className="absolute -bottom-1 left-0 text-[11px] font-bold text-slate-300 pointer-events-none">
                Low ({minHz}Hz)
            </div>

            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${COORD_WIDTH} ${COORD_HEIGHT}`}
                className="overflow-visible"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="pitchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                <line x1="0" y1={COORD_HEIGHT * 0.25} x2={COORD_WIDTH} y2={COORD_HEIGHT * 0.25} stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="8,8" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={COORD_HEIGHT * 0.5} x2={COORD_WIDTH} y2={COORD_HEIGHT * 0.5} stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="8,8" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={COORD_HEIGHT * 0.75} x2={COORD_WIDTH} y2={COORD_HEIGHT * 0.75} stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="8,8" vectorEffect="non-scaling-stroke" />

                {/* Area Fill */}
                <path
                    d={areaData}
                    fill="url(#pitchGradient)"
                    stroke="none"
                />

                {/* Stroke Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}
