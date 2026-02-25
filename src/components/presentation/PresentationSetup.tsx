"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Upload,
    X,
    Check,
    Sparkles,
    Loader2,
    AlertTriangle,
    ArrowRight,
    Presentation,
    Trophy,
    FileCheck,
    Trash2,
} from "lucide-react";

interface UploadCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    required?: boolean;
    accept: string;
    fileName: string | null;
    onFileSelect: (file: File | null, base64: string | null) => void;
    accentColor: string;
    borderColor: string;
    bgColor: string;
    loading: boolean;
}

function UploadCard({
    icon,
    title,
    description,
    required,
    accept,
    fileName,
    onFileSelect,
    accentColor,
    borderColor,
    bgColor,
    loading,
}: UploadCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleFile = useCallback(
        async (file: File) => {
            setError(null);
            try {
                const b64 = await fileToBase64(file);
                const base64Data = b64.split(',')[1];
                onFileSelect(file, base64Data);
            } catch (e: any) {
                setError(e.message || "Failed to read file");
                onFileSelect(null, null);
            }
        },
        [onFileSelect]
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
        onFileSelect(null, null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [onFileSelect]);

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
            </div>

            {error && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            {fileName ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group/file">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white line-clamp-1">{fileName}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                File Uploaded Successfully
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={clearFile}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove File"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragOver
                            ? "border-blue-400 bg-blue-500/10"
                            : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"
                            }`}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                <span className="text-xs text-slate-400">Processing file...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-6 h-6 text-slate-500" />
                                <span className="text-xs text-slate-400">
                                    Drop file here or click to upload
                                </span>
                                <span className="text-[10px] text-slate-600">PDF, PPT, PPTX</span>
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
                </div>
            )}
        </motion.div>
    );
}

interface PresentationSetupProps {
    onStart: (slideData: { file: File; base64: string }, rubricData?: { file: File; base64: string }) => void;
}

export default function PresentationSetup({ onStart }: PresentationSetupProps) {
    const [slideState, setSlideState] = useState<{ file: File | null; base64: string | null }>({ file: null, base64: null });
    const [rubricState, setRubricState] = useState<{ file: File | null; base64: string | null }>({ file: null, base64: null });
    const [hasRubric, setHasRubric] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const canStart = slideState.file !== null && (!hasRubric || rubricState.file !== null);

    const handleStart = () => {
        if (slideState.file && slideState.base64) {
            onStart(
                { file: slideState.file, base64: slideState.base64 },
                (hasRubric && rubricState.file && rubricState.base64) ? { file: rubricState.file, base64: rubricState.base64 } : undefined
            );
        }
    };

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
                            <Presentation className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Presentation Setup
                    </h1>
                    <p className="text-slate-400 max-w-md mx-auto text-sm">
                        Upload your slides and optionally a rubric to get real-time AI feedback on your delivery and content alignment.
                    </p>
                </div>

                {/* Upload Cards */}
                <div className="space-y-4">
                    <UploadCard
                        icon={<FileText className="w-5 h-5 text-blue-400" />}
                        title="Presentation Slides"
                        description="PDF, PPT, or PPTX format"
                        required
                        accept=".pdf,.ppt,.pptx"
                        fileName={slideState.file?.name || null}
                        onFileSelect={(file, base64) => setSlideState({ file, base64 })}
                        accentColor="text-blue-400"
                        borderColor="border-blue-500/20"
                        bgColor="bg-blue-500/5"
                        loading={isProcessing}
                    />

                    <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-slate-300">Grade against a specific rubric?</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={hasRubric}
                                onChange={(e) => setHasRubric(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <AnimatePresence>
                        {hasRubric && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <UploadCard
                                    icon={<FileCheck className="w-5 h-5 text-purple-400" />}
                                    title="Grading Rubric"
                                    description="A PDF or TXT file containing grading criteria"
                                    accept=".pdf,.txt,.doc,.docx"
                                    fileName={rubricState.file?.name || null}
                                    onFileSelect={(file, base64) => setRubricState({ file, base64 })}
                                    accentColor="text-purple-400"
                                    borderColor="border-purple-500/20"
                                    bgColor="bg-purple-500/5"
                                    loading={isProcessing}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Start Button */}
                <Button
                    size="lg"
                    disabled={!canStart || isProcessing}
                    onClick={handleStart}
                    className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] mt-4"
                >
                    <span className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5" />
                        Enter Practice Room
                        <ArrowRight className="w-4 h-4" />
                    </span>
                </Button>

                <p className="text-center text-xs text-slate-600">
                    Your slides will be analyzed to provide context-aware suggestions during your presentation.
                </p>
            </motion.div>
        </div>
    );
}
