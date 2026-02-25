import { useState, useEffect, RefObject } from 'react';

export interface TimeSeriesDataPoint {
    timestamp: number; // in seconds
    posture_score?: number;
    facial_engagement_score?: number;
    vocal_sentiment?: string;
    [key: string]: any;
}

/**
 * A hook to synchronize video playback with time-series session metrics.
 * Provides functions to seek the video and returns the metrics closest to the current playback time.
 */
export function useSessionReplay(
    videoRef: RefObject<HTMLVideoElement | null>,
    timeSeriesData: TimeSeriesDataPoint[]
) {
    const [currentDataPoint, setCurrentDataPoint] = useState<TimeSeriesDataPoint | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !timeSeriesData || timeSeriesData.length === 0) return;

        // Ensure data is sorted by timestamp (ascending) for accurate matching
        const sortedData = [...timeSeriesData].sort((a, b) => a.timestamp - b.timestamp);

        const handleTimeUpdate = () => {
            const time = video.currentTime;
            setCurrentTime(time);

            // Find the closest data point that is <= current video time
            let closest = sortedData[0];
            for (let i = 0; i < sortedData.length; i++) {
                if (sortedData[i].timestamp <= time) {
                    closest = sortedData[i];
                } else {
                    break;
                }
            }
            setCurrentDataPoint(closest);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [videoRef, timeSeriesData]);

    /**
     * Seeks the video to a specific timestamp (e.g., when clicking a Low Point on a graph)
     */
    const seekTo = (timestamp: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
        }
    };

    return {
        currentTime,
        currentDataPoint,
        seekTo
    };
}
