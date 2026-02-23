export interface SessionData {
    id: string;
    savedAt: string;
    score: number;
    vocalScore: number;
    postureScore: number;
    facialScore: number;
    contentScore: number;
    videoUrl?: string;
    jsonUrl?: string;
}

export interface WeeklyAggregatedData {
    weekLabel: string;
    weekStart: string; // Used for sorting
    voice: number;
    postureFacial: number;
    content: number;
    overall: number;
    sessionCount: number;
}

export interface ChartDataPoint {
    dateStr: string;
    day: string;
    Voice: number | null;
    "Posture & Facial": number | null;
    Content: number | null;
    Overall: number | null;
    count: number;
    sessionIds: string[];
    videoUrls: string[];
    jsonUrls: string[];
}

/**
 * Returns the Monday of the week for a given date string.
 */
function getMonday(d: string | Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Groups sessions by calendar week (starting Monday).
 * Returns an array of aggregated weekly stats sorted chronologically.
 */
export function aggregateSessionsByWeek(sessions: SessionData[]): WeeklyAggregatedData[] {
    if (!sessions || sessions.length === 0) return [];

    const weeksMap = new Map<string, SessionData[]>();

    sessions.forEach(session => {
        const monday = getMonday(session.savedAt);
        const weekKey = monday.toISOString();
        if (!weeksMap.has(weekKey)) {
            weeksMap.set(weekKey, []);
        }
        weeksMap.get(weekKey)!.push(session);
    });

    const aggregated: WeeklyAggregatedData[] = [];

    weeksMap.forEach((weekSessions, weekStart) => {
        let totalVoice = 0;
        let totalPosture = 0;
        let totalFacial = 0;
        let totalContent = 0;
        let totalOverall = 0;
        const count = weekSessions.length;

        weekSessions.forEach(s => {
            totalVoice += s.vocalScore;
            totalPosture += s.postureScore;
            totalFacial += s.facialScore;
            totalContent += s.contentScore;
            totalOverall += s.score;
        });

        // The date format for label, e.g., "Feb 15"
        const dateObj = new Date(weekStart);
        const weekLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        aggregated.push({
            weekStart,
            weekLabel: `Week of ${weekLabel}`,
            voice: Math.round(totalVoice / count),
            // "Posture & Facial" combined average
            postureFacial: Math.round((totalPosture + totalFacial) / (count * 2)),
            content: Math.round(totalContent / count),
            overall: Math.round(totalOverall / count),
            sessionCount: count
        });
    });

    // Sort ascending by date
    return aggregated.sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
}

/**
 * Gets 7 days of data for a specific week given an offset from the current week.
 * 0 = current week (Mon-Sun), -1 = last week, etc.
 */
export function getWeeklyChartData(sessions: SessionData[], weekOffset: number) {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + (weekOffset * 7));

    // Determine the 7 days (Timezone safe using local dates instead of raw ISO slicing)
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDays.push(d);
    }

    // Initialize 7 days with 0/null data
    const chartData: ChartDataPoint[] = weekDays.map(date => {
        // Generate a local YYYY-MM-DD string that avoids UTC drift backwards/forwards
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayNum = String(date.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${dayNum}`;

        return {
            dateStr: localDateStr,
            day: date.toLocaleDateString("en-US", { weekday: "short" }), // "Mon", "Tue"
            Voice: 0,
            "Posture & Facial": 0,
            Content: 0,
            Overall: 0,
            count: 0,
            sessionIds: [] as string[],
            videoUrls: [] as string[],
            jsonUrls: [] as string[]
        };
    });

    // Populate data
    sessions.forEach(session => {
        // Parse the session time dynamically to match local bounds instead of UTC string split
        const sDate = new Date(session.savedAt);
        const year = sDate.getFullYear();
        const month = String(sDate.getMonth() + 1).padStart(2, '0');
        const dayNum = String(sDate.getDate()).padStart(2, '0');
        const localSessionDateStr = `${year}-${month}-${dayNum}`;

        const dayMatch = chartData.find(d => d.dateStr === localSessionDateStr);
        if (dayMatch) {
            dayMatch.Voice = (dayMatch.Voice || 0) + session.vocalScore;
            dayMatch["Posture & Facial"] = (dayMatch["Posture & Facial"] || 0) + ((session.postureScore + session.facialScore) / 2);
            dayMatch.Content = (dayMatch.Content || 0) + session.contentScore;
            dayMatch.Overall = (dayMatch.Overall || 0) + session.score;
            dayMatch.count += 1;
            dayMatch.sessionIds.push(session.id);
            if (session.videoUrl) dayMatch.videoUrls.push(session.videoUrl);
            if (session.jsonUrl) dayMatch.jsonUrls.push(session.jsonUrl);
        }
    });

    // Average the populated metrics
    chartData.forEach(d => {
        if (d.count > 0) {
            d.Voice = Math.round((d.Voice || 0) / d.count);
            d["Posture & Facial"] = Math.round((d["Posture & Facial"] || 0) / d.count);
            d.Content = Math.round((d.Content || 0) / d.count);
            d.Overall = Math.round((d.Overall || 0) / d.count);
        } else {
            // Nullify or keep 0? Keeping null ensures the line graph skips empty days cleanly.
            // But recharts expects numbers. 0 is fine, or we can use null.
            (d as any).Voice = null;
            (d as any)["Posture & Facial"] = null;
            (d as any).Content = null;
            (d as any).Overall = null;
        }
    });

    const weekStartLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEndLabel = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
        label: `${weekStartLabel} - ${weekEndLabel}`,
        data: chartData
    };
}
