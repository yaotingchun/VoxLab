"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Briefcase,
    BookOpen,
    Upload,
    X,
    Check,
    Sparkles,
    Loader2,
    AlertTriangle,
    ArrowRight,
} from "lucide-react";
import { readFileAsText } from "@/hooks/useInterview";

interface UploadCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    required?: boolean;
    accept: string;
    text: string;
    onTextChange: (text: string) => void;
    fileName: string | null;
    onFileChange: (name: string | null) => void;
    accentColor: string;
    borderColor: string;
    bgColor: string;
    loading: boolean;
    onLoadingChange: (loading: boolean) => void;
}

function UploadCard({
    icon,
    title,
    description,
    required,
    accept,
    text,
    onTextChange,
    fileName,
    onFileChange,
    accentColor,
    borderColor,
    bgColor,
    loading,
    onLoadingChange,
}: UploadCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(
        async (file: File) => {
            setError(null);
            onLoadingChange(true);
            try {
                const extracted = await readFileAsText(file);
                onTextChange(extracted);
                onFileChange(file.name);
            } catch (e: any) {
                setError(e.message || "Failed to read file");
                onFileChange(null);
            } finally {
                onLoadingChange(false);
            }
        },
        [onTextChange, onFileChange, onLoadingChange]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const clearFile = useCallback(() => {
        onTextChange("");
        onFileChange(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [onTextChange, onFileChange]);

    const hasContent = text.trim().length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${borderColor} ${bgColor} p-5 transition-all`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${accentColor} bg-opacity-10`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            {title}
                            {required && (
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                    Required
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                    </div>
                </div>
                {hasContent && (
                    <button
                        onClick={clearFile}
                        className="text-slate-500 hover:text-white transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            {hasContent ? (
                <div className="space-y-2">
                    {fileName && (
                        <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-green-300 font-medium">{fileName}</span>
                            <span className="text-slate-500 text-xs">
                                ({text.split(/\s+/).length} words extracted)
                            </span>
                        </div>
                    )}
                    <textarea
                        value={text}
                        onChange={(e) => onTextChange(e.target.value)}
                        className="w-full h-32 bg-black/30 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 custom-scrollbar"
                        placeholder="Or paste your text here..."
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Drop Zone */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                            dragOver
                                ? "border-purple-400 bg-purple-500/10"
                                : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"
                        }`}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                <span className="text-xs text-slate-400">Extracting text...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-6 h-6 text-slate-500" />
                                <span className="text-xs text-slate-400">
                                    Drop file here or click to upload
                                </span>
                                <span className="text-[10px] text-slate-600">PDF, TXT</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={handleInputChange}
                        className="hidden"
                    />

                    {/* Or Paste */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider">
                                or paste text
                            </span>
                        </div>
                    </div>

                    <textarea
                        value={text}
                        onChange={(e) => {
                            onTextChange(e.target.value);
                            if (e.target.value.trim()) onFileChange("Pasted text");
                        }}
                        className="w-full h-24 bg-black/30 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        placeholder={`Paste your ${title.toLowerCase()} here...`}
                    />
                </div>
            )}
        </motion.div>
    );
}

// ── Main Setup Component ─────────────────────────────────────────────────────
interface InterviewSetupProps {
    resumeText: string;
    jobDescriptionText: string;
    notesText: string;
    onResumeChange: (text: string) => void;
    onJdChange: (text: string) => void;
    onNotesChange: (text: string) => void;
    onStart: () => void;
    isGenerating: boolean;
    error: string | null;
}

export default function InterviewSetup({
    resumeText,
    jobDescriptionText,
    notesText,
    onResumeChange,
    onJdChange,
    onNotesChange,
    onStart,
    isGenerating,
    error,
}: InterviewSetupProps) {
    const [resumeFile, setResumeFile] = useState<string | null>(null);
    const [jdFile, setJdFile] = useState<string | null>(null);
    const [notesFile, setNotesFile] = useState<string | null>(null);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [jdLoading, setJdLoading] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);

    const canStart = resumeText.trim().length > 0 && !resumeLoading && !jdLoading && !notesLoading;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl space-y-6"
            >
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-500/20">
                            <Briefcase className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Interview Preparation
                    </h1>
                    <p className="text-slate-400 max-w-md mx-auto text-sm">
                        Upload your documents and let AI generate a realistic mock interview
                        tailored to your profile and target role.
                    </p>
                </div>

                {/* Upload Cards */}
                <div className="space-y-4">
                    <UploadCard
                        icon={<FileText className="w-5 h-5 text-blue-400" />}
                        title="Resume / CV"
                        description="Your professional background and skills"
                        required
                        accept=".pdf,.txt,.doc,.docx"
                        text={resumeText}
                        onTextChange={onResumeChange}
                        fileName={resumeFile}
                        onFileChange={setResumeFile}
                        accentColor="text-blue-400"
                        borderColor="border-blue-500/20"
                        bgColor="bg-blue-500/5"
                        loading={resumeLoading}
                        onLoadingChange={setResumeLoading}
                    />

                    <UploadCard
                        icon={<Briefcase className="w-5 h-5 text-purple-400" />}
                        title="Job Description"
                        description="The role you're interviewing for"
                        accept=".pdf,.txt,.doc,.docx"
                        text={jobDescriptionText}
                        onTextChange={onJdChange}
                        fileName={jdFile}
                        onFileChange={setJdFile}
                        accentColor="text-purple-400"
                        borderColor="border-purple-500/20"
                        bgColor="bg-purple-500/5"
                        loading={jdLoading}
                        onLoadingChange={setJdLoading}
                    />

                    <UploadCard
                        icon={<BookOpen className="w-5 h-5 text-emerald-400" />}
                        title="Technical Notes / Cheatsheets"
                        description="Optional study materials for technical questions"
                        accept=".pdf,.txt,.doc,.docx"
                        text={notesText}
                        onTextChange={onNotesChange}
                        fileName={notesFile}
                        onFileChange={setNotesFile}
                        accentColor="text-emerald-400"
                        borderColor="border-emerald-500/20"
                        bgColor="bg-emerald-500/5"
                        loading={notesLoading}
                        onLoadingChange={setNotesLoading}
                    />
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
                        >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Button */}
                <Button
                    size="lg"
                    disabled={!canStart || isGenerating}
                    onClick={onStart}
                    className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01]"
                >
                    {isGenerating ? (
                        <span className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating Interview Questions...
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5" />
                            Generate Interview & Start
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    )}
                </Button>

                <p className="text-center text-xs text-slate-600">
                    AI will generate 10 realistic interview questions based on your documents
                </p>
            </motion.div>
        </div>
    );
}
