"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AbstractMic } from "@/components/ui/abstract-mic";
import { ArrowRight, Mic, Video, FileText, BarChart3, ChevronRight, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { SignOutModal } from "@/components/auth/SignOutModal";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleStartTraining = () => {
    if (user) {
      router.push("/dashboard/coach");
    } else {
      setIsAuthModalOpen(true);
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] opacity-40" />
      </div>

      {/* Navigation */}
      <nav className="z-50 w-full max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center">
            <Mic className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VoxLab</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white hidden sm:block">
              {user.email?.split('@')[0]}
            </span>
            <Button
              variant="outline"
              className="rounded-full border-white/10 hover:bg-white/5"
              onClick={() => setIsSignOutModalOpen(true)}
            >
              Sign Out
            </Button>
            <Link href="/dashboard">
              <Button className="rounded-full">
                Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            variant="outline"
            className="rounded-full hidden sm:flex border-white/10 hover:bg-white/5"
            onClick={() => setIsAuthModalOpen(true)}
          >
            Sign In
          </Button>
        )}
      </nav>

      {/* Hero Section */}
      <section className="z-10 w-full max-w-7xl px-6 pt-6 pb-20 md:pt-12 md:pb-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-8 order-2 md:order-1">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            AI Public Speaking Coach V1.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 pb-2">
            Master the Art of <br />
            <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-accent text-transparent">Public Speaking</span>
          </h1>

          <p className="max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Refine your voice, content, and presence with real-time AI analysis.
            The personal coach that fits in your pocket and prepares you for the world stage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="rounded-full text-base group" onClick={handleStartTraining}>
              Start Training Now
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-full text-base border-white/10 hover:bg-white/5 backdrop-blur-sm">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Hero Visual - Abstract Mic */}
        <div className="flex items-center justify-center order-1 md:order-2 w-full h-full min-h-[400px]">
          <AbstractMic />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="z-10 w-full max-w-7xl px-6 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white">Three Pillars of Excellence</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our AI analyzes the three crucial components of impactful communication to give you holistic feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Body Language */}
          <div className="group relative p-8 rounded-3xl border border-white/5 bg-surface/50 backdrop-blur-sm transition-all hover:bg-surface/80 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white">Posture & Presence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Using computer vision, we analyze your stance, gestures, and eye contact to ensure you project confidence and authority.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  Hunchback detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  Hand gesture analysis
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 2: Voice */}
          <div className="group relative p-8 rounded-3xl border border-white/5 bg-surface/50 backdrop-blur-sm transition-all hover:bg-surface/80 hover:border-secondary/20 hover:shadow-2xl hover:shadow-secondary/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Mic className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-white">Voice & Tone</h3>
              <p className="text-muted-foreground leading-relaxed">
                Advanced audio processing detects nervousness, filler words, and pacing issues to help you speak with clarity.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Pace & Volume tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Filler word detection (um, ah)
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Content */}
          <div className="group relative p-8 rounded-3xl border border-white/5 bg-surface/50 backdrop-blur-sm transition-all hover:bg-surface/80 hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Content & Fluency</h3>
              <p className="text-muted-foreground leading-relaxed">
                NLP algorithms analyze your transcript for vocabulary quality, sentiment, and structural coherence.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Vocabulary richness
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Sentiment analysis
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="z-10 w-full max-w-7xl px-6 py-24 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            Visualize Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Continuous Growth</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Track your progress over time with detailed analytics. See how your filler word usage drops and your confidence score rises with every session.
          </p>
          <Button variant="secondary" className="rounded-full">
            View Sample Report
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 w-full relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary opacity-20 blur-2xl rounded-full"></div>
          <div className="relative bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            {/* Mock Chart */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Confidence Score</div>
                <div className="text-3xl font-bold text-white">88/100</div>
              </div>
              <div className="flex gap-2">
                <BarChart3 className="text-primary w-6 h-6" />
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {[40, 55, 48, 62, 68, 75, 82, 88].map((value, i) => (
                <div key={i} className="w-full bg-primary/20 rounded-t-lg relative group h-full">
                  <div
                    style={{ height: `${value}%` }}
                    className="absolute bottom-0 w-full bg-gradient-to-t from-primary/60 to-primary rounded-t-lg transition-all duration-1000 group-hover:from-accent group-hover:to-white"
                  ></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-muted-foreground px-2">
              <span>Week 1</span>
              <span>Week 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black/20 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Mic className="text-primary w-5 h-5" />
            <span className="text-lg font-bold text-white">VoxLab</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 VoxLab AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={() => {
          logout();
          setIsSignOutModalOpen(false);
        }}
      />
    </main>
  )
}
