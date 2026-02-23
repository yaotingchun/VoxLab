"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Upload } from "lucide-react";

export default function PresentationSetupPage() {
    const router = useRouter();

    const [slideFile, setSlideFile] = useState<File | null>(null);
    const [slideBase64, setSlideBase64] = useState<string | null>(null);

    const [hasRubric, setHasRubric] = useState(false);
    const [rubricFile, setRubricFile] = useState<File | null>(null);
    const [rubricBase64, setRubricBase64] = useState<string | null>(null);

    // Helpers to read files to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSlideFile(file);
            try {
                const b64 = await fileToBase64(file);
                // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                const base64Data = b64.split(',')[1];
                setSlideBase64(base64Data);
            } catch (err) {
                console.error("Failed to read slide file", err);
            }
        }
    };

    const handleRubricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setRubricFile(file);
            try {
                const b64 = await fileToBase64(file);
                const base64Data = b64.split(',')[1];
                setRubricBase64(base64Data);
            } catch (err) {
                console.error("Failed to read rubric file", err);
            }
        }
    };

    const handleContinue = () => {
        // Save to sessionStorage before redirecting
        if (slideBase64) {
            sessionStorage.setItem("presentation_slide_b64", slideBase64);
            sessionStorage.setItem("presentation_slide_type", slideFile?.type || "application/pdf");
            sessionStorage.setItem("presentation_slide_name", slideFile?.name || "slides.pdf");
        }

        if (hasRubric && rubricBase64) {
            sessionStorage.setItem("presentation_rubric_b64", rubricBase64);
            sessionStorage.setItem("presentation_rubric_type", rubricFile?.type || "application/pdf");
            sessionStorage.setItem("presentation_rubric_name", rubricFile?.name || "rubric.pdf");
        } else {
            sessionStorage.removeItem("presentation_rubric_b64");
            sessionStorage.removeItem("presentation_rubric_type");
            sessionStorage.removeItem("presentation_rubric_name");
        }

        router.push("/dashboard/presentation");
    };

    return (
        <div className="min-h-screen bg-background p-8 flex flex-col items-center">
            <div className="max-w-xl w-full space-y-8 mt-12">

                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="text-center space-y-4 pt-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Presentation Setup
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Upload your materials so our AI Coach can analyze your delivery against your content.
                    </p>
                </div>

                <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-8">

                    {/* Slide Upload Section */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                1. Upload Slides (Required)
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Acceptable formats: PDF, PPT, PPTX. (PDF is strongly recommended for the most accurate AI extraction).
                            </p>

                            <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-muted/30 border-2 border-muted-foreground/30 border-dashed rounded-xl appearance-none cursor-pointer hover:border-primary/50 focus:outline-none">
                                {slideFile ? (
                                    <div className="flex flex-col items-center gap-2 text-center text-green-500">
                                        <FileText className="w-8 h-8" />
                                        <span className="font-medium">{slideFile.name}</span>
                                        <span className="text-xs text-muted-foreground">Click to replace</span>
                                    </div>
                                ) : (
                                    <span className="flex flex-col items-center space-y-2 text-muted-foreground">
                                        <Upload className="w-6 h-6" />
                                        <span className="font-medium text-sm">Drop slides here or click to browse</span>
                                    </span>
                                )}
                                <input type="file" name="slide_upload" className="hidden" accept=".pdf,.ppt,.pptx" onChange={handleSlideUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="h-px bg-border w-full" />

                    {/* Rubric Toggle Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                    2. Grading Rubric (Optional)
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Do you have a specific rubric you want the AI to score you against?
                                </p>
                            </div>

                            {/* Toggle Switch */}
                            <label className="flex items-center cursor-pointer ml-4">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={hasRubric}
                                        onChange={() => setHasRubric(!hasRubric)}
                                    />
                                    <div className={`block w-12 h-7 rounded-full transition-colors ${hasRubric ? 'bg-purple-500' : 'bg-muted'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${hasRubric ? 'transform translate-x-5' : ''}`}></div>
                                </div>
                            </label>
                        </div>

                        <AnimatePresence>
                            {hasRubric && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-muted/30 border-2 border-muted-foreground/30 border-dashed rounded-xl appearance-none cursor-pointer hover:border-primary/50 focus:outline-none mt-4">
                                        {rubricFile ? (
                                            <div className="flex flex-col items-center gap-2 text-center text-purple-500">
                                                <FileText className="w-8 h-8" />
                                                <span className="font-medium">{rubricFile.name}</span>
                                                <span className="text-xs text-muted-foreground">Click to replace</span>
                                            </div>
                                        ) : (
                                            <span className="flex flex-col items-center space-y-2 text-muted-foreground">
                                                <Upload className="w-6 h-6" />
                                                <span className="font-medium text-sm">Drop rubric (PDF/TXT) here or click to browse</span>
                                            </span>
                                        )}
                                        <input type="file" name="rubric_upload" className="hidden" accept=".pdf,.txt,.doc,.docx" onChange={handleRubricUpload} />
                                    </label>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-6">
                        <Button
                            size="lg"
                            className="w-full text-lg h-14 rounded-xl"
                            disabled={!slideBase64}
                            onClick={handleContinue}
                        >
                            Continue to Practice Room
                        </Button>
                        {!slideBase64 && (
                            <p className="text-center text-xs text-rose-500 mt-3 flex items-center justify-center gap-1">
                                You must upload your slides before continuing.
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
