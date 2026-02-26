"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Sparkles,
    PenLine,
    Shuffle,
    Grid3X3,
    ArrowRight,
    RefreshCw,
    Loader2,
    ChevronRight,
    UploadCloud,
    BookOpen,
    Upload,
    Mic,
    FileText as FileIcon,
    Home
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { UserProfile } from "@/components/ui/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface Category {
    name: string;
    emoji: string;
    description: string;
}

interface Topic {
    title: string;
    prompt: string;
    difficulty?: string;
    category?: string;
    emoji?: string;
}

type Step = "mode" | "live-menu" | "custom" | "ai-menu" | "categories" | "topics" | "random" | "lecture";

const difficultyColors: Record<string, string> = {
    beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    advanced: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function TopicSelectionInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [step, setStep] = useState<Step>("mode");

    // Handle initial mode from query params
    useEffect(() => {
        const mode = searchParams.get("mode");
        if (mode === "lecture") {
            setStep("lecture");
        }
    }, [searchParams]);
    const [customTopic, setCustomTopic] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [randomTopic, setRandomTopic] = useState<Topic | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [extractingText, setExtractingText] = useState(false);
    const [lectureFile, setLectureFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const goToPractice = (topic: string) => {
        router.push(`/dashboard/practice?topic=${encodeURIComponent(topic)}`);
    };

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/ai/generate-topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "categories" }),
            });
            if (!res.ok) throw new Error("Failed to load categories");
            const data = await res.json();
            setCategories(data.categories);
            setStep("categories");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTopics = useCallback(async (category: string) => {
        setLoading(true);
        setError(null);
        setSelectedCategory(category);
        try {
            const res = await fetch("/api/ai/generate-topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "topics", category }),
            });
            if (!res.ok) throw new Error("Failed to load topics");
            const data = await res.json();
            setTopics(data.topics);
            setStep("topics");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRandom = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/ai/generate-topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "random" }),
            });
            if (!res.ok) throw new Error("Failed to generate topic");
            const data = await res.json();
            setRandomTopic(data.topic);
            setStep("random");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleBack = () => {
        if (step === "custom" || step === "ai-menu" || step === "lecture" || step === "live-menu") setStep("mode");
        else if (step === "categories") setStep("ai-menu");
        else if (step === "topics") setStep("categories");
        else if (step === "random") setStep("ai-menu");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            setError("Please upload a PDF file. PPT support coming soon!");
            return;
        }

        setLectureFile(file);
        setError(null);
    };

    const startLecturePractice = async () => {
        if (!lectureFile) return;

        setExtractingText(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", lectureFile);

            const res = await fetch("/api/ai/analyze-material", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const responseText = await res.text();
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    console.error("API Error (Non-JSON):", responseText.slice(0, 1000));
                    throw new Error("Server returned an invalid response. Check console for details.");
                }
                throw new Error(errorData.error || "Failed to analyze material");
            }

            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Parse Error (Non-JSON):", responseText.slice(0, 1000));
                throw new Error("Failed to parse server response. Check console for details.");
            }
            const { text, title } = data;

            // Store PDF as base64 for the slide viewer in practice room
            try {
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove the data:application/pdf;base64, prefix
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.readAsDataURL(lectureFile);
                });

                const base64 = await base64Promise;
                sessionStorage.setItem("lecture_slide_b64", base64);
                sessionStorage.setItem("lecture_slide_name", lectureFile.name);
                sessionStorage.setItem("lecture_slide_type", lectureFile.type);
            } catch (e) {
                console.error("Failed to store slide for preview:", e);
                // Non-blocking for the session itself
            }

            // Navigate to practice room with the extracted material
            sessionStorage.setItem("lecture_material", text);
            router.push(`/dashboard/practice?topic=${encodeURIComponent(title || lectureFile.name)}&mode=lecture`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setExtractingText(false);
        }
    };

    // Animation variants
    const container = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative">

            {/* Header */}
            <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                        title="Go Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Logo size="sm" className="opacity-80" />
                    <div className="h-6 w-[1px] bg-white/10 mx-1" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        {searchParams.get("mode") === "lecture" ? "Lecture Lab" : "Practice Mode"}
                    </span>
                </div>

                <div className="flex items-center gap-4 sm:gap-8">
                    <nav className="hidden lg:flex items-center gap-8 text-sm font-bold tracking-tight">
                        <button
                            onClick={() => router.push('/dashboard/mode')}
                            className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 group"
                        >
                            Mode
                        </button>
                        <button
                            onClick={() => router.push('/forum')}
                            className="text-slate-400 hover:text-white transition-all flex items-center gap-2"
                        >
                            Forum
                        </button>
                    </nav>

                    <div className="h-8 w-px bg-white/10" />

                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/dashboard')}
                            className="text-slate-400 hover:text-white transition-all rounded-xl"
                            title="Dashboard"
                        >
                            <Home className="w-5 h-5" />
                        </Button>
                        <NotificationDropdown />
                        {user && <UserProfile displayName={user.displayName || user.email?.split("@")[0] || "User"} />}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-6 overflow-y-auto">
                {/* Global loading overlay */}
                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                            <p className="text-primary/70 font-medium animate-pulse">Generating with AI...</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error banner */}
                {error && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* ========== MODE SELECT ========== */}
                    {step === "mode" && (
                        <motion.div key="mode" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-2xl space-y-8">
                            <motion.div variants={item} className="text-center space-y-3">
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">How would you like to practice?</h1>
                                <p className="text-white/50 max-w-md mx-auto">Choose your own topic or let AI surprise you with something interesting.</p>
                            </motion.div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Upload Video */}
                                <motion.div
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    className="group relative p-8 h-full min-h-[300px] flex flex-col justify-between rounded-[2rem] border border-orange-500/20 bg-[#161616] cursor-not-allowed overflow-hidden shadow-2xl shadow-orange-500/5 ring-1 ring-orange-500/10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative z-10 space-y-6">
                                        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-all duration-300 shadow-inner">
                                            <UploadCloud className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-2 text-white">Upload Video</h3>
                                            <p className="text-sm text-white/50 leading-relaxed font-medium">Upload a pre-recorded video for AI analysis and coaching.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-base text-orange-400 font-bold group-hover:text-orange-300 transition-colors mt-auto pt-6">
                                        Select file <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.div>

                                {/* Practice Live Session */}
                                <motion.button
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStep("live-menu")}
                                    className="group relative p-8 h-full min-h-[300px] flex flex-col justify-between rounded-[2rem] border border-white/5 bg-[#161616] text-left transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.05] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative z-10 space-y-6">
                                        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-all duration-300 shadow-inner">
                                            <Mic className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-2">Live Session</h3>
                                            <p className="text-sm text-white/40 leading-relaxed">Choose a topic and start a real-time practice session with AI coaching.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-base text-purple-400 font-bold group-hover:text-purple-300 transition-colors mt-auto pt-6">
                                        Enter room <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== LIVE MENU ========== */}
                    {step === "live-menu" && (
                        <motion.div key="live-menu" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-2xl space-y-8">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Select Topic Mode</h2>
                                <p className="text-white/40 text-sm">Pick how you want to decide your practice topic.</p>
                            </motion.div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Custom Topic */}
                                <motion.button
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStep("custom")}
                                    className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.05] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                            <PenLine className="w-7 h-7 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold mb-1">Custom Topic</h3>
                                            <p className="text-sm text-white/40 leading-relaxed">Enter your own topic or speech subject.</p>
                                        </div>
                                    </div>
                                </motion.button>

                                {/* AI Generated */}
                                <motion.button
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStep("ai-menu")}
                                    className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.05] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                            <Sparkles className="w-7 h-7 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold mb-1">AI Generated</h3>
                                            <p className="text-sm text-white/40 leading-relaxed">Explore categories or get a random topic.</p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== CUSTOM TOPIC ========== */}
                    {step === "custom" && (
                        <motion.div key="custom" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-lg space-y-6">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Enter Your Topic</h2>
                                <p className="text-white/40 text-sm">What do you want to speak about?</p>
                            </motion.div>
                            <motion.div variants={item} className="space-y-4">
                                <textarea
                                    autoFocus
                                    rows={4}
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    placeholder="e.g. The impact of AI on education..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 placeholder:text-white/20 transition-all"
                                />
                                <Button
                                    size="lg"
                                    disabled={!customTopic.trim()}
                                    onClick={() => goToPractice(customTopic.trim())}
                                    className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold shadow-xl shadow-purple-500/30 hover:shadow-purple-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80 disabled:from-blue-500/30 disabled:to-purple-500/30 disabled:border disabled:border-white/10 disabled:backdrop-blur-md disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    Start Practice
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ========== AI MENU ========== */}
                    {step === "ai-menu" && (
                        <motion.div key="ai-menu" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-2xl space-y-8">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">AI Topic Generator</h2>
                                <p className="text-white/40 text-sm">Pick how you&apos;d like to discover your topic.</p>
                            </motion.div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <motion.button
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={fetchCategories}
                                    className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.05] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <Grid3X3 className="w-7 h-7 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold mb-1">Browse Categories</h3>
                                            <p className="text-sm text-white/40 leading-relaxed">Explore broad topics, then pick a specific one.</p>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={fetchRandom}
                                    className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.05] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <Shuffle className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold mb-1">Shuffle Mode</h3>
                                            <p className="text-sm text-white/40 leading-relaxed">Get a random topic instantly. Re-shuffle if you don&apos;t like it.</p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== CATEGORIES ========== */}
                    {step === "categories" && (
                        <motion.div key="categories" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-3xl space-y-6">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Pick a Category</h2>
                                <p className="text-white/40 text-sm">Select a broad area, then choose a specific topic.</p>
                            </motion.div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {categories.map((cat) => (
                                    <motion.button
                                        key={cat.name}
                                        variants={item}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => fetchTopics(cat.name)}
                                        className="group p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-purple-500/20 hover:bg-purple-500/[0.05]"
                                    >
                                        <div className="text-3xl mb-3">{cat.emoji}</div>
                                        <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>
                                        <p className="text-xs text-white/30 line-clamp-2">{cat.description}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ========== TOPICS ========== */}
                    {step === "topics" && (
                        <motion.div key="topics" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-2xl space-y-6">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">{selectedCategory}</h2>
                                <p className="text-white/40 text-sm">Choose a topic to start practicing.</p>
                            </motion.div>

                            <div className="space-y-3">
                                {topics.map((topic, i) => (
                                    <motion.button
                                        key={i}
                                        variants={item}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => goToPractice(topic.title)}
                                        className="group w-full p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-left transition-all hover:border-purple-500/20 hover:bg-purple-500/[0.05] flex items-center gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-base mb-1">{topic.title}</h3>
                                            <p className="text-sm text-white/40 line-clamp-2">{topic.prompt}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {topic.difficulty && (
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${difficultyColors[topic.difficulty] || "text-white/40 bg-white/5 border-white/10"}`}>
                                                    {topic.difficulty}
                                                </span>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-purple-400 transition-colors" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ========== RANDOM / SHUFFLE ========== */}
                    {step === "random" && randomTopic && (
                        <motion.div key="random" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-lg space-y-6">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Your Random Topic</h2>
                                <p className="text-white/40 text-sm">Don&apos;t like it? Shuffle for another one.</p>
                            </motion.div>

                            <motion.div
                                variants={item}
                                className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm text-center space-y-4"
                            >
                                <div className="text-5xl">{randomTopic.emoji}</div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">{randomTopic.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{randomTopic.prompt}</p>
                                </div>
                                {randomTopic.category && (
                                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                        {randomTopic.category}
                                    </span>
                                )}
                            </motion.div>

                            <motion.div variants={item} className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={fetchRandom}
                                    className="flex-1 h-14 rounded-2xl border-white/10 hover:bg-white/5 text-base"
                                >
                                    <RefreshCw className="w-5 h-5 mr-2" />
                                    Shuffle Again
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={() => goToPractice(randomTopic.title)}
                                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl text-base"
                                >
                                    Use This Topic
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ========== LECTURE MODE ========== */}
                    {step === "lecture" && (
                        <motion.div key="lecture" variants={container} initial="hidden" animate="show" exit="exit" className="w-full max-w-lg space-y-6">
                            <motion.div variants={item} className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Lecture Support</h2>
                                <p className="text-white/40 text-sm">Upload your PDF teaching materials for AI analysis.</p>
                            </motion.div>

                            <motion.div variants={item} className="space-y-4">
                                <div
                                    className={`relative group h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer
                                        ${lectureFile ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-primary/50 hover:bg-white/[0.02]'}`}
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        onChange={handleFileUpload}
                                    />

                                    {lectureFile ? (
                                        <>
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <FileIcon className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-primary">{lectureFile.name}</p>
                                                <p className="text-xs text-white/40">{(lectureFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</p>
                                            </div>
                                            <button
                                                className="text-white/40 hover:text-rose-400 text-xs underline transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLectureFile(null);
                                                }}
                                            >
                                                Choose a different file
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                                                <UploadCloud className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-white/70">Click or drag to upload</p>
                                                <p className="text-xs text-white/30 mt-1">Accepts PDF files up to 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <Button
                                    size="lg"
                                    disabled={!lectureFile || extractingText}
                                    onClick={startLecturePractice}
                                    className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold shadow-xl shadow-purple-500/30 hover:shadow-purple-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80 disabled:from-blue-500/30 disabled:to-purple-500/30 disabled:border disabled:border-white/10 disabled:backdrop-blur-md disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {extractingText ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                            AI is studying your material...
                                        </>
                                    ) : (
                                        <>
                                            Start Lecture Practice
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>

                                <p className="text-[10px] text-center text-white/20 px-8">
                                    The AI will analyze your speech against this material to suggest analogies and identify complex parts.
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}

export default function TopicSelectionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>}>
            <TopicSelectionInner />
        </Suspense>
    );
}
