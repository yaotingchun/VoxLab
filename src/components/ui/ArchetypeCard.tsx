"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ArchetypeInsight } from "@/lib/archetypes";

interface ArchetypeCardProps {
    archetype: ArchetypeInsight | null;
}

export function ArchetypeCard({ archetype }: ArchetypeCardProps) {
    if (!archetype) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-6 rounded-3xl shadow-lg relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-indigo-400" size={18} />
                    <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Your Archetype</h4>
                </div>

                <h3 className="text-2xl font-black text-white mb-2">{archetype.archetypeName}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {archetype.description}
                </p>

                <div className="flex flex-wrap gap-2">
                    {archetype.traits.map((trait, idx) => (
                        <span key={idx} className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                            {trait}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
