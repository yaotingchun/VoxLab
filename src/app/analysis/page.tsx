import { PostureAnalyzer } from "@/components/posture/PostureAnalyzer";

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
                        <h1 className="text-xl font-bold tracking-tight">VoxLab Analysis</h1>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        End Session
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="py-12 px-6">
                <div className="max-w-3xl mx-auto mb-10 text-center">
                    <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                        Real-Time Posture Coach
                    </h2>
                    <p className="text-slate-400">
                        Our AI analyzes your posture in real-time to help you present with confidence.
                        Maintain a stable, upright position for the best score.
                    </p>
                </div>

                <PostureAnalyzer />
            </main>
        </div>
    );
}
