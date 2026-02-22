"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import Link from "next/link";

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

type Step = "mode" | "custom" | "ai-menu" | "categories" | "topics" | "random";

const difficultyColors: Record<string, string> = {
    beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    advanced: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function TopicSelectionPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("mode");
    const [customTopic, setCustomTopic] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [randomTopic, setRandomTopic] = useState<Topic | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [loading, setLoading] = useState(false);
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
        if (step === "custom" || step === "ai-menu") setStep("mode");
        else if (step === "categories") setStep("ai-menu");
        else if (step === "topics") setStep("categories");
        else if (step === "random") setStep("ai-menu");
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
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[160px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4">
                {step === "mode" ? (
                    <Link href="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                ) : (
                    <button onClick={handleBack} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back</span>
                    </button>
                )}

                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold tracking-wide">Choose Your Topic</span>
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
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                            <p className="text-purple-300 font-medium animate-pulse">Generating with AI...</p>
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
                                            <p className="text-sm text-white/40 leading-relaxed">Enter your own topic or speech subject to practice with.</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-blue-400 font-medium">
                                            Choose topic <ChevronRight className="w-3 h-3" />
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
                                            <p className="text-sm text-white/40 leading-relaxed">Let AI generate a topic — browse categories or get a random one.</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-purple-400 font-medium">
                                            Explore options <ChevronRight className="w-3 h-3" />
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
                                    className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-purple-900/20 hover:shadow-purple-900/30 transition-all disabled:opacity-30"
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
                </AnimatePresence>
            </div>
        </div>
    );
}
