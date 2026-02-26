"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AbstractMic } from "@/components/ui/abstract-mic";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Mic, Video, FileText, BarChart3, ChevronRight, Briefcase, Layout, BookOpen, Play, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { SignOutModal } from "@/components/auth/SignOutModal";
import { UserProfile } from "@/components/ui/UserProfile";

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
          <Logo size="lg" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
          <Link href="/speech-coach" className="hover:text-primary transition-colors">Speech Coach</Link>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <UserProfile displayName={user.displayName || user.email?.split('@')[0] || "User"} />
            </div>
            <Button
              variant="outline"
              className="rounded-full border-white/10 hover:bg-white/5"
              onClick={() => setIsSignOutModalOpen(true)}
            >
              Sign Out
            </Button>
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


          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 pb-2">
            Master the Art of <br />
            <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-accent text-transparent">Public Speaking</span>
          </h1>

          <p className="max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Refine your voice, content, and presence with real-time AI analysis.
            The personal coach that fits in your pocket and prepares you for the world stage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {user ? (
              <Link href="/speech-coach">
                <Button size="lg" className="rounded-full text-base group">
                  Start Training Now
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="rounded-full text-base group" onClick={() => setIsAuthModalOpen(true)}>
                Start Training Now
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Hero Visual - Abstract Mic (Balanced size, With Waves) */}
        <div className="flex items-center justify-center order-1 md:order-2 w-full h-full min-h-[400px]">
          <div className="w-64 h-64 md:w-80 md:h-80 lg:w-[450px] lg:h-[450px]">
            <AbstractMic showWaves={true} />
          </div>
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

      {/* How It Works Section */}
      <section id="how-it-works" className="z-10 w-full max-w-7xl px-6 py-24 space-y-16 relative">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white">How VoxLab Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            VoxLab is your personal AI speaking coach. Choose a mode tailored to your specific context, practice in a safe environment, and receive instant, actionable feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Practice Mode */}
          <div className="group relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-primary/30 hover:shadow-2xl overflow-hidden">
            <div className="relative z-10 flex flex-col h-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-primary" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Practice Mode</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                The core VoxLab experience. Master raw speaking skills with open-ended practice sessions, focusing on your pacing, tone, and filler word usage.
              </p>
            </div>
          </div>

          {/* Interview Lab */}
          <div className="group relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-purple-500/30 hover:shadow-2xl overflow-hidden">
            <div className="relative z-10 flex flex-col h-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Interview Lab</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                Simulate high-pressure job interviews with AI-generated behavioral and technical questions tailored specifically to your field and experience level.
              </p>
            </div>
          </div>

          {/* Presentation Setup */}
          <div className="group relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-emerald-500/30 hover:shadow-2xl overflow-hidden">
            <div className="relative z-10 flex flex-col h-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
                <Layout className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Presentation Setup</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                Rehearse your slide decks and pitches. Our AI helps you refine your narrative structure and ensures your delivery is compelling and persuasive.
              </p>
            </div>
          </div>

          {/* Lecture Lab */}
          <div className="group relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-blue-500/30 hover:shadow-2xl overflow-hidden">
            <div className="relative z-10 flex flex-col h-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Lecture Lab</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                Perfect long-form educational content with emphasis on clarity, audience engagement, and knowledge retention for your listeners.
              </p>
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
          <Button
            variant="secondary"
            className="rounded-full relative z-10 pointer-events-auto"
            onClick={() => router.push('/sample-report')}
          >
            View Sample Report
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 w-full max-w-md mx-auto relative h-[320px] md:h-[400px]">
          {/* Hand-drawn stickman pointing to the graph */}
          <div className="absolute top-1/2 -right-20 md:-right-32 transform -translate-y-1/2 z-20 w-40 h-40 pointer-events-none opacity-80 animate-[wiggle_4s_ease-in-out_infinite]">
            <svg viewBox="0 0 200 200" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {/* Head */}
              <circle cx="130" cy="60" r="18" stroke="white" strokeWidth="4" />
              {/* Eyes */}
              <circle cx="123" cy="55" r="2" fill="white" stroke="none" />
              <circle cx="135" cy="55" r="2" fill="white" stroke="none" />
              {/* Smile */}
              <path d="M122 65 Q130 72 138 65" />
              {/* Body */}
              <path d="M130 78 Q135 110 130 135" stroke="white" strokeWidth="4" />
              {/* Right Arm (resting) */}
              <path d="M130 90 Q150 100 155 125" />
              {/* Left Arm (pointing to the graph on the left) */}
              <path d="M130 90 Q90 100 40 90" strokeWidth="4" />
              {/* Hand (rounded) */}
              <circle cx="40" cy="90" r="5" fill="white" stroke="none" />
              {/* Movement Lines */}
              <path d="M155 45 L165 35 M145 25 L155 15 M115 30 L105 20" strokeWidth="2" strokeDasharray="4 4" />
              {/* Legs */}
              <path d="M130 135 Q150 155 155 180" stroke="white" strokeWidth="4" />
              <path d="M130 135 Q115 155 110 180" stroke="white" strokeWidth="4" />
              {/* Text */}
              <text x="110" y="45" fill="white" stroke="none" fontSize="18" fontFamily="comic sans ms, cursive" transform="rotate(-10 110 45)">Look!</text>
            </svg>
          </div>

          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary opacity-20 blur-xl rounded-2xl"></div>
          <div className="relative bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl h-full flex flex-col justify-between z-10 w-full">
            {/* Mock Chart */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Confidence Score</div>
                <div className="text-2xl font-black text-white">88/100</div>
              </div>
              <div className="flex gap-2">
                <BarChart3 className="text-primary w-5 h-5 bg-primary/10 rounded overflow-visible p-0.5" />
              </div>
            </div>
            <div className="flex-1 flex items-end justify-between gap-1.5 px-1 py-4">
              {[40, 55, 48, 62, 68, 75, 82, 88].map((value, i) => (
                <div key={i} className="w-full bg-primary/10 rounded-t-md relative group h-full">
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

      {/* Contact Us Section */}
      <section id="contact" className="z-10 w-full max-w-7xl px-6 pb-24 space-y-12 relative flex flex-col items-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Contact Us</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Have questions or need support? Reach out to our team directly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-x-16 gap-y-8">
          {[
            { name: "Chun Yao Ting", phone: "011-5623 1125" },
            { name: "Angela Ngu Xin Yi", phone: "019-878 0610" },
            { name: "Tay Xin Ying", phone: "011-1409 8243" },
            { name: "Wong Zi Ning", phone: "011-1504 0506" },
          ].map((contact, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-1">
              <h3 className="text-base font-semibold text-white">{contact.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-3.5 h-3.5" />
                <span>{contact.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black/20 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size="lg" />
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
