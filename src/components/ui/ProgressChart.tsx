"use client";

import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { motion } from "framer-motion";

export interface ChartDataPoint {
    day: number | string;
    Voice: number | null;
    "Posture & Facial": number | null;
    Content: number | null;
    Overall: number | null;
    sessionIds?: string[]; // Array of session IDs for this day
    videoUrls?: (string | null)[];
    jsonUrls?: (string | null)[];
}

interface ProgressChartProps {
    data: ChartDataPoint[];
    title?: string;
    onPrev?: () => void;
    onNext?: () => void;
    canGoNext?: boolean;
    onNodeClick?: (dataPoint: ChartDataPoint) => void;
}

const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

export function ProgressChart({ data, title, onPrev, onNext, canGoNext, onNodeClick }: ProgressChartProps) {

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload as ChartDataPoint;

            return (
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50 relative pointer-events-none">
                    <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Day {label}</p>

                    {/* Render the aggregated averages */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === null || entry.value === undefined) return null;
                            return (
                                <div key={index} className="flex items-center gap-2 text-[10px] justify-between mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                        <span className="text-gray-400 font-bold uppercase tracking-tight truncate" title={entry.name}>{entry.name}</span>
                                    </div>
                                    <span className="font-black text-white">{entry.value}%</span>
                                </div>
                            );
                        })}
                    </div>

                    {dataPoint.sessionIds && dataPoint.sessionIds.length > 0 && (
                        <p className="text-[10px] text-primary/80 font-black uppercase tracking-widest mt-2 text-center border-t border-white/5 pt-2">
                            {dataPoint.sessionIds.length} {dataPoint.sessionIds.length === 1 ? "session" : "sessions"} recorded
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full h-[450px] ${GLASS_CARD} rounded-3xl p-8 relative overflow-hidden`}
        >
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white tracking-tight">{title || "Performance Trends"}</h3>
                {onPrev && onNext && (
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <button onClick={onPrev} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">Prev</button>
                        <button onClick={onNext} disabled={!canGoNext} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!canGoNext ? "text-gray-700 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>Next</button>
                    </div>
                )}
            </div>
            {data.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest italic">
                    Not enough data
                </div>
            ) : (
                <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                            onClick={(e: any) => {
                                // Try activePayload first, fallback to activeTooltipIndex if clicking near but not on a line
                                const payload = e?.activePayload?.[0]?.payload || data[e?.activeTooltipIndex];
                                if (payload?.sessionIds) {
                                    onNodeClick?.(payload as ChartDataPoint);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.05} vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#94a3b8"
                                opacity={0.5}
                                fontSize={10}
                                fontWeight={900}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `D${val}`}
                                dy={10}
                            />
                            <YAxis
                                domain={[0, 100]}
                                stroke="#94a3b8"
                                opacity={0.5}
                                fontSize={10}
                                fontWeight={900}
                                tickLine={false}
                                axisLine={false}
                                dx={-5}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '5 5' }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", paddingTop: "25px" }}
                            />

                            <Line
                                connectNulls
                                type="monotone"
                                dataKey="Voice"
                                stroke="#3b82f6"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#fff", stroke: "#3b82f6", strokeWidth: 3, onClick: (props: any) => onNodeClick?.(props.payload as ChartDataPoint) }}
                            />
                            <Line
                                connectNulls
                                type="monotone"
                                dataKey="Posture & Facial"
                                stroke="#10b981"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#fff", stroke: "#10b981", strokeWidth: 3, onClick: (props: any) => onNodeClick?.(props.payload as ChartDataPoint) }}
                            />
                            <Line
                                connectNulls
                                type="monotone"
                                dataKey="Content"
                                stroke="#f59e0b"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3, onClick: (props: any) => onNodeClick?.(props.payload as ChartDataPoint) }}
                            />
                            <Line
                                connectNulls
                                type="monotone"
                                dataKey="Overall"
                                stroke="#ec4899"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#ec4899", strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#fff", stroke: "#ec4899", strokeWidth: 3, onClick: (props: any) => onNodeClick?.(props.payload as ChartDataPoint) }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
}
