"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Loader2, X } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signInWithGoogle, user } = useAuth();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setEmail("");
            setPassword("");
        }
    }, [isOpen]);

    // Close modal when user is authenticated
    useEffect(() => {
        if (user && isOpen) {
            onClose();
        }
    }, [user, isOpen, onClose]);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Modal will close via useEffect
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            // Modal will close via useEffect
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-md p-8 overflow-hidden rounded-3xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Inner Highlight for Glass Effect */}
                <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-white/10" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-4 mb-6">
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/20 group">
                        <div className="absolute inset-0 rounded-full border border-primary/50 animate-ripple" />
                        <div className="absolute inset-0 rounded-full border border-primary/30 animate-ripple" style={{ animationDelay: "0.5s" }} />
                        <Mic className="relative z-10 w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            {isLogin ? "Welcome back" : "Create an account"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {isLogin
                                ? "Enter your credentials to access your dashboard"
                                : "Enter your email below to create your account"}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 focus:bg-black/40 transition-colors h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 focus:bg-black/40 transition-colors h-11"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-400 text-center p-2 bg-red-500/10 rounded-md border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? "Sign In" : "Sign Up"}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google
                    </Button>

                    <div className="text-center">
                        <button
                            type="button"
                            className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                            onClick={() => setIsLogin(!isLogin)}
                            disabled={loading}
                        >
                            {isLogin
                                ? "Don't have an account? Sign Up"
                                : "Already have an account? Sign In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

