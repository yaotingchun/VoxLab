import { Mic, MicOff, Timer, Activity, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpeechCoachWidgetProps {
    isListening: boolean;
    wpm: number;
    elapsedTime: number;
    transcript: string;
    onToggleListening: () => void;
    onReset: () => void;
}

export function SpeechCoachWidget({
    isListening,
    wpm,
    elapsedTime,
    transcript,
    onToggleListening,
    onReset
}: SpeechCoachWidgetProps) {

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl">
            {/* Controls */}
            <Button
                onClick={onToggleListening}
                variant={isListening ? "destructive" : "default"}
                size="icon"
                className={`w-10 h-10 rounded-full shadow-lg transition-all ${isListening ? 'animate-pulse' : ''}`}
            >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            {/* Status */}
            <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                <span className={`text-xs font-medium ${isListening ? 'text-green-400' : 'text-gray-400'}`}>
                    {isListening ? "Listening..." : "Paused"}
                </span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            {/* Timer */}
            <div className="flex items-center gap-3">
                <Timer className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Time</span>
                    <span className="text-sm font-mono leading-none">{formatTime(elapsedTime)}</span>
                </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            {/* Pace / WPM */}
            <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-red-500" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pace</span>
                    <span className="text-sm font-mono leading-none text-red-400">{wpm} <span className="text-[10px] text-gray-500">WPM</span></span>
                </div>
            </div>

            {/* Visualizer (Simulated) */}
            {isListening && (
                <div className="flex items-center gap-1 h-4 ml-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-bounce"
                            style={{
                                height: `${[40, 75, 30, 90, 55][i]}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.6s'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
