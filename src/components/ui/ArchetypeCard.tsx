"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ArchetypeInsight } from "@/lib/archetypes";

interface ArchetypeCardProps {
    archetype: ArchetypeInsight | null;
}

const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

export function ArchetypeCard({ archetype }: ArchetypeCardProps) {
    if (!archetype) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${GLASS_CARD} p-8 rounded-3xl relative overflow-hidden group`}
        >
            {/* Animated Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Sparkles size={18} />
                    </div>
                    <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Your Archetype</h4>
                </div>

                <h3 className="text-4xl font-black text-white mb-4 tracking-tight">{archetype.archetypeName}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium italic">
                    "{archetype.description}"
                </p>

                <div className="flex flex-wrap gap-2">
                    {archetype.traits.map((trait, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest hover:bg-white/10 hover:border-primary/30 hover:text-white transition-all">
                            {trait}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
