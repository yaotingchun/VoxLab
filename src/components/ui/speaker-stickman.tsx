import React from 'react';
import { motion } from 'framer-motion';

export function SpeakerStickman({ className = '' }: { className?: string }) {
    return (
        <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-2xl"
            >
                {/* Glow Effect Behind */}
                <circle cx="200" cy="200" r="120" fill="#6D28D9" opacity="0.39" filter="blur(40px)" />

                {/* Minimal Background Elements */}
                <g opacity="0.15">
                    {/* Subtle data lines */}
                    <rect x="60" y="100" width="80" height="2" rx="1" fill="#E2E8F0" />
                    <rect x="60" y="140" width="140" height="2" rx="1" fill="#E2E8F0" />

                    {/* Floating accents */}
                    <circle cx="320" cy="110" r="3" fill="#8B5CF6" />
                    <circle cx="80" cy="220" r="2" fill="#8B5CF6" />
                    <circle cx="280" cy="280" r="4" fill="#A78BFA" opacity="0.5" />
                </g>

                {/* Speech Emphasis Marks (Animated) - Using Theme Colors */}
                <motion.g
                    initial={{ opacity: 0.3, scale: 0.95 }}
                    animate={{ opacity: 0.8, scale: 1.05 }}
                    transition={{ repeat: Infinity, duration: 2.5, repeatType: "reverse" }}
                >
                    <path d="M280 60 L300 50" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />
                    <path d="M290 85 L315 85" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" />
                    <path d="M285 110 L305 120" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />
                </motion.g>

                {/* Stickman - Dark slate with slight purple tint to blend */}
                <g>
                    {/* Head */}
                    <circle cx="210" cy="100" r="40" fill="#D8B4FE" stroke="#A855F7" strokeWidth="2" />

                    {/* Body */}
                    <path d="M210 140 C210 190 225 240 240 290 L235 360 L210 300 L185 360" stroke="#D8B4FE" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                    {/* Left Arm (Resting on podium) */}
                    <path d="M210 150 C240 160 260 195 270 205" stroke="#D8B4FE" strokeWidth="16" strokeLinecap="round" fill="none" />
                    <circle cx="270" cy="205" r="8" fill="#D8B4FE" />
                    {/* Subtle cuff */}
                    <path d="M258 195 L275 188" stroke="#F3E8FF" strokeWidth="3" strokeLinecap="round" />

                    {/* Right Arm (Gesturing) */}
                    <path d="M210 150 C185 160 155 170 130 150" stroke="#D8B4FE" strokeWidth="16" strokeLinecap="round" fill="none" />
                    {/* Hand */}
                    <path d="M115 135 C120 145 130 150 130 150" stroke="#D8B4FE" strokeWidth="14" strokeLinecap="round" />
                </g>

                {/* Podium - Sleek, glassmorphic/gradient look */}
                <g>
                    {/* Podium Base Shadow */}
                    <ellipse cx="200" cy="380" rx="120" ry="10" fill="#000000" opacity="0.4" filter="blur(4px)" />

                    {/* Podium Main Body with gradient feel (using theme purples/blues) */}
                    <path d="M130 220 L270 220 L280 370 L140 370 Z" fill="#1E1B4B" opacity="1" />

                    {/* Podium Front Panel Accent (Glassy reflection) */}
                    <path d="M145 230 L255 230 L262 360 L152 360 Z" fill="#312E81" opacity="1" />
                    <path d="M145 230 L160 230 L165 360 L152 360 Z" fill="#4338CA" opacity="1" />

                    {/* Podium Top Desk Base */}
                    <polygon points="100,200 280,200 270,220 130,220" fill="#312E81" />

                    {/* Podium Top Desk Surface */}
                    <polygon points="110,185 290,185 280,200 100,200" fill="#4338CA" opacity="1" />

                    {/* Podium Base Plate */}
                    <polygon points="130,370 280,370 290,385 120,385" fill="#0F172A" />
                </g>

                {/* Microphone Stack - Refined */}
                <g>
                    {/* Stand base */}
                    <path d="M170 185 L180 185 L175 160 Z" fill="#334155" />
                    {/* Flexible neck */}
                    <path d="M175 160 C170 140 160 130 150 125" stroke="#475569" strokeWidth="3" fill="none" />
                    {/* Mic head */}
                    <ellipse cx="145" cy="115" rx="8" ry="12" fill="#1E293B" transform="rotate(-30 145 115)" />
                    {/* Subtle dot mic grill */}
                    <circle cx="142" cy="112" r="1.5" fill="#64748B" />
                    <circle cx="147" cy="115" r="1.5" fill="#64748B" />
                    <circle cx="144" cy="118" r="1.5" fill="#64748B" />
                </g>
            </svg>
        </div>
    );
}

export default SpeakerStickman;
