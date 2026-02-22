import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationDropdown } from './NotificationDropdown';
import Link from 'next/link';

interface ForumHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    toggleSidebar?: () => void;
}

export const ForumHeader: React.FC<ForumHeaderProps> = ({ searchQuery, setSearchQuery, toggleSidebar }) => {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full mb-8 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
            {/* Minimalist Background - Removed overlay div for cleaner DOM */}

            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

                {/* Left: Mobile Menu & Current Context */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white lg:hidden"
                        onClick={toggleSidebar}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                        <span className="hover:text-white cursor-pointer transition-colors">VoxLab</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-white font-medium">Community</span>
                    </div>
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 max-w-xl">
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

                {/* Right: User Actions */}
                <div className="flex items-center gap-3">
                    <NotificationDropdown />

                    {user && (
                        <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-3 pl-3 border-l border-white/5 group cursor-pointer"
                        >
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-white leading-none mb-1 group-hover:text-primary transition-colors">
                                    {user.displayName?.split(' ')[0]}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                    Member
                                </div>
                            </div>

                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-[1px] shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                                <div className="w-full h-full rounded-full bg-[#111] overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6d28d9&color=fff`}
                                        alt="User"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </header >
    );
};
