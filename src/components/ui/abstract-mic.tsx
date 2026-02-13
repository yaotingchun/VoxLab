"use client"

import React, { useMemo, useState, useEffect } from "react"
import { motion } from "framer-motion"

export function AbstractMic() {
    // Elegant Purple Palette - Wuthering Waves inspired (Darker, High Contrast)
    const secondaryColor = "#a78bfa" // Light Purple
    const primaryColor = "#6d28d9"   // Deep Violet
    const accentColor = "#e9d5ff"    // Bright Lavender

    const [frequencyBars, setFrequencyBars] = useState<any[]>([])
    const [particles, setParticles] = useState<any[]>([])

    useEffect(() => {
        // Generate random bars for the frequency visualizer on client side
        setFrequencyBars(Array.from({ length: 24 }).map((_, i) => ({
            height: Math.random() * 50 + 25,
            delay: i * 0.05,
        })))

        // Generate particles on client side
        setParticles(Array.from({ length: 14 }).map((_, i) => {
            // UPSCALED ELLIPTICAL SPAWN LOGIC
            const angle = Math.random() * Math.PI * 2;
            const radiusX = 90 + Math.random() * 15;
            const radiusY = 150 + Math.random() * 25;

            const spawnX = Math.cos(angle) * radiusX;
            const spawnY = Math.sin(angle) * radiusY;

            // Drift
            const driftX = Math.cos(angle) * 12;
            const driftY = Math.sin(angle) * 12 - 15;

            return {
                id: i,
                spawnX, spawnY,
                driftX, driftY,
                r: Math.random() * 1.8 + 0.5,
                delay: Math.random() * 2,
                duration: Math.random() * 2 + 1.5,
            }
        }))
    }, [])

    return (
        <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center perspective-1000">
            {/* Background Light Shade (The "Stage Light") */}
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-125" />
            <div className="absolute inset-0 bg-gradient-radial from-secondary/10 via-transparent to-transparent opacity-40 blur-2xl" />

            {/* --- SVG CONTAINER --- */}
            <motion.svg
                viewBox="0 0 500 600"
                className="w-full h-full"
                initial="hidden"
                animate="visible"
                style={{ overflow: "visible" }}
            >
                <defs>
                    <linearGradient id="capsule-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
                        <stop offset="50%" stopColor={accentColor} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                    </linearGradient>

                    {/* Outline Glow Filter */}
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                        <feColorMatrix in="blur" type="matrix" values="
                            0 0 0 0 0.65 
                            0 0 0 0 0.16 
                            0 0 0 0 0.85 
                            0 0 0 1 0" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Clip Path to keep bars inside capsule */}
                    <clipPath id="capsule-clip">
                        <rect x="-80" y="-140" width="160" height="280" rx="80" ry="80" />
                    </clipPath>
                </defs>

                {/* --- 1. NON-PERIODIC FLUID WAVEFORM (True Fluidity) --- */}
                <motion.g transform="translate(250, 300)" filter="url(#soft-glow)">

                    {/* Layer 1: The Heavy Flow (Wide) */}
                    <motion.path
                        stroke={accentColor}
                        strokeWidth={2}
                        fill="none"
                        opacity="0.8"
                        animate={{
                            d: [
                                "M -260 0 C -160 -70 -110 50 0 0 C 110 -50 160 70 260 0",
                                "M -260 10 C -190 60 -90 -60 0 10 C 90 60 190 -60 260 10",
                                "M -260 -10 C -210 -40 -60 70 0 -10 C 60 -70 210 40 260 -10",
                                "M -260 0 C -160 -70 -110 50 0 0 C 110 -50 160 70 260 0"
                            ],
                            opacity: [0.7, 0.4, 0.8, 0.7]
                        }}
                        transition={{
                            duration: 11,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Layer 2: The Counter Flow */}
                    <motion.path
                        stroke={secondaryColor}
                        strokeWidth={1.5}
                        fill="none"
                        opacity="0.6"
                        animate={{
                            d: [
                                "M -260 0 C -190 50 -70 -50 0 0 C 70 50 190 -50 260 0",
                                "M -260 0 C -160 -30 -110 30 0 0 C 110 -30 160 30 260 0",
                                "M -260 0 C -220 70 -40 -70 0 0 C 40 70 220 -70 260 0",
                                "M -260 0 C -190 50 -70 -50 0 0 C 70 50 190 -50 260 0"
                            ]
                        }}
                        transition={{
                            duration: 13,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Layer 3: The Interference */}
                    <motion.path
                        stroke={primaryColor}
                        strokeWidth={2}
                        fill="none"
                        opacity="0.7"
                        animate={{
                            d: [
                                "M -260 0 C -170 30 -90 -30 0 0 C 90 30 170 -30 260 0",
                                "M -260 0 C -170 -40 -90 40 0 0 C 90 -40 170 40 260 0",
                                "M -260 0 C -170 30 -90 -30 0 0 C 90 30 170 -30 260 0"
                            ]
                        }}
                        transition={{
                            duration: 7,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.g>

                {/* --- 2. THE MIC CAPSULE (UPSCALED) --- */}
                <motion.g transform="translate(250, 250)">
                    {/* The Capsule Body - UPSCALED (160x280) */}
                    <motion.rect
                        x="-80" y="-140" width="160" height="280" rx="80" ry="80"
                        fill="url(#capsule-gradient)"
                        stroke={secondaryColor}
                        strokeWidth="2"
                        strokeOpacity="0.8"
                        filter="url(#neon-glow)"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2 }}
                    />

                    {/* Internal Elements Group with Clip Path */}
                    <g clipPath="url(#capsule-clip)">
                        {/* Internal Frequency Spectrum (Wider spread) */}
                        <g transform="translate(-60, -70)">
                            {frequencyBars.map((bar, i) => (
                                <motion.rect
                                    key={`bar-${i}`}
                                    x={i * 5} // Wider spacing (was 4)
                                    y={50 - bar.height / 2}
                                    width="3" // Wider bars (was 2)
                                    height={bar.height}
                                    fill={accentColor}
                                    opacity="0.6"
                                    rx="1.5"
                                    animate={{
                                        height: [bar.height, bar.height * 1.5, bar.height],
                                        y: [50 - bar.height / 2, 50 - (bar.height * 1.5) / 2, 50 - bar.height / 2],
                                        opacity: [0.4, 0.8, 0.4]
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: bar.delay
                                    }}
                                />
                            ))}
                        </g>
                        {/* Duplicate spectrum for lower part */}
                        <g transform="translate(-60, 70)">
                            {frequencyBars.map((bar, i) => (
                                <motion.rect
                                    key={`bar-lower-${i}`}
                                    x={i * 5}
                                    y={50 - bar.height / 2}
                                    width="3"
                                    height={bar.height}
                                    fill={accentColor}
                                    opacity="0.3"
                                    rx="1.5"
                                    animate={{
                                        height: [bar.height, bar.height * 0.8, bar.height],
                                        y: [50 - bar.height / 2, 50 - (bar.height * 0.8) / 2, 50 - bar.height / 2],
                                    }}
                                    transition={{
                                        duration: 3 + Math.random() * 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: bar.delay
                                    }}
                                />
                            ))}
                        </g>

                        {/* Grille Overlay (Wider lines) */}
                        {[...Array(9)].map((_, i) => (
                            <motion.line
                                key={`grid-${i}`}
                                x1="-78" y1={-110 + i * 30}
                                x2="78" y2={-110 + i * 30}
                                stroke={secondaryColor}
                                strokeWidth="0.5"
                                opacity="0.3"
                            />
                        ))}
                    </g>
                </motion.g>

                {/* --- 3. HARDWARE STAND (Lowered position) --- */}
                <motion.g transform="translate(250, 390)"> {/* Moved up to connect with capsule */}
                    {/* Connection Node */}
                    <rect x="-18" y="-10" width="36" height="40" rx="4" fill={primaryColor} opacity="0.3" />

                    {/* Vertical Stem */}
                    <motion.rect
                        x="-3" y="20" width="6" height="60"
                        fill={secondaryColor}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />

                    {/* Ring Base */}
                    <motion.ellipse
                        cx="0" cy="80" rx="90" ry="18"
                        stroke="url(#line-gradient)"
                        strokeWidth="2"
                        fill="none"
                        filter="url(#neon-glow)"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.8 }}
                    />
                    <motion.ellipse
                        cx="0" cy="80" rx="70" ry="12"
                        stroke={primaryColor}
                        strokeWidth="1"
                        fill="none"
                        opacity="0.5"
                    />
                </motion.g>

                {/* --- 4. PARTICLES (Larger Halo) --- */}
                {particles.map((p) => (
                    <motion.circle
                        key={`particle-${p.id}`}
                        r={p.r}
                        fill={accentColor}
                        opacity="0"
                        initial={{ cx: 250 + p.spawnX, cy: 250 + p.spawnY - 10 }}
                        animate={{
                            cx: [250 + p.spawnX, 250 + p.spawnX + p.driftX],
                            cy: [250 + p.spawnY - 10, 250 + p.spawnY - 10 + p.driftY],
                            opacity: [0, 0.8, 0],
                            scale: [0, 1.2, 0]
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: p.delay
                        }}
                    />
                ))}
            </motion.svg>
        </div>
    )
}
