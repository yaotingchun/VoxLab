import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Menu, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { UserProfile } from '@/components/ui/UserProfile';

interface ForumHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    toggleSidebar?: () => void;
}

export const ForumHeader: React.FC<ForumHeaderProps> = ({ searchQuery, setSearchQuery, toggleSidebar }) => {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <header className="sticky top-0 z-50 w-full mb-8 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
            <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

                {/* Left: Branding & Mobile Menu */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white lg:hidden mr-2"
                        onClick={toggleSidebar}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Logo size="sm" className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                        <div className="h-4 w-[1px] bg-white/10" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Community</span>
                    </div>
                </div>

                {/* Center: Search Bar */}
                <div className="hidden md:block flex-1 max-w-xl mx-8">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search discussions, topics, or users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-[#161616] border-white/5 focus:bg-[#1a1a1a] focus:border-primary/30 text-white rounded-lg transition-all text-sm w-full"
                        />
                    </div>
                </div>

                {/* Right: Navigation & Profile */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/dashboard/mode')}
                        className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 group text-sm font-medium"
                    >
                        Mode
                    </button>
                    <button
                        onClick={() => router.push('/forum')}
                        className="text-white hover:text-primary transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        Forum
                    </button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard')}
                        className="text-white/50 hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
                        title="Dashboard"
                    >
                        <Home className="w-5 h-5" />
                    </Button>

                    <NotificationDropdown />

                    {user && <UserProfile displayName={user.displayName || user.email?.split('@')[0] || "User"} />}
                </div>
            </div>
        </header>
    );
};
