import { PresentationCoach } from "@/components/analysis/PresentationCoach";

export default function AnalysisPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">V</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">VoxLab Coach</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="py-8 px-4 h-full">
                <div className="max-w-4xl mx-auto mb-6 text-center">
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                        Holistic Presentation Analysis
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Real-time feedback on your <strong>Posture</strong>, <strong>Expression</strong>, and <strong>Eye Contact</strong>.
                    </p>
                </div>

                <PresentationCoach />
            </main>
        </div>
    );
}
