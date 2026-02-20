import { useState } from "react";
import { Mic, MicOff, Timer, Activity, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
    const [isCollapsed, setIsCollapsed] = useState(false);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            layout
            className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl overflow-hidden flex items-center group"
        >
            <AnimatePresence mode="wait">
                {!isCollapsed ? (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="px-6 py-3 flex items-center gap-6"
                    >
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
                    </motion.div>
                ) : (
                    <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="px-4 py-3 flex items-center gap-3"
                    >
                        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-xs font-mono">{formatTime(elapsedTime)}</span>
                        <span className="text-xs text-red-400 font-mono">{wpm} WPM</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="pr-4 pl-2 h-full flex items-center text-white/40 hover:text-white transition-colors border-l border-white/5"
            >
                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
        </motion.div>
    );
}
