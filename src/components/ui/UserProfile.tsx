import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut } from 'lucide-react';

interface UserProfileProps {
    displayName: string;
    photoURL?: string | null;
    rank?: string;
    className?: string;
    onLogout?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
    displayName,
    photoURL,
    rank = "Elite Speaker",
    className = "",
    onLogout
}) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = React.useState(false);
    const initial = displayName?.charAt(0).toUpperCase() || "U";

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className="flex items-center gap-3 group cursor-pointer active:scale-95 transition-all">
                <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-sm font-bold text-white transition-colors group-hover:text-primary whitespace-nowrap">
                        {displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        {rank}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-lg flex items-center justify-center text-sm font-bold group-hover:border-primary/50 transition-all overflow-hidden shrink-0">
                    {photoURL ? (
                        <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        initial
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-48 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl"
                    >
                        <div className="p-1.5">
                            <button
                                onClick={() => router.push('/dashboard/profile')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all group/item"
                            >
                                <div className="p-2 bg-white/5 rounded-lg group-hover/item:text-primary transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                My Profile
                            </button>

                            <div className="h-px bg-white/5 my-1.5 mx-2" />

                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onLogout?.();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all group/item"
                            >
                                <div className="p-2 bg-rose-500/10 rounded-lg group-hover/item:bg-rose-500/20 transition-colors">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
