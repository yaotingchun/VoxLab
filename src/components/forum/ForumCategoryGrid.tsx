import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Eye, User, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post } from '@/types/forum';
import { ForumSection } from '@/lib/forum-data';

interface CategoryStats {
    count: number;
    views: number;
    latestPost?: Post;
}

interface ForumCategoryGridProps {
    sections: ForumSection[];
    stats: Record<string, CategoryStats>;
    onCategoryClick: (category: string) => void;
}

export const ForumCategoryGrid: React.FC<ForumCategoryGridProps> = ({ sections, stats, onCategoryClick }) => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {sections.map((section) => (
                <div key={section.title} className="space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1 bg-gradient-to-b from-primary to-secondary rounded-full" />
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {section.title}
                        </h3>
                    </div>

                    {/* Cards Grid - Sleek List Design */}
                    <div className="space-y-3">
                        {section.topics.map((topic) => {
                            const stat = stats[topic.name] || { count: 0, views: 0 };

                            return (
                                <div
                                    key={topic.name}
                                    onClick={() => onCategoryClick(topic.name)}
                                    className="group flex flex-col md:flex-row items-stretch md:items-center gap-6 py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors cursor-pointer backdrop-blur-sm"
                                >
                                    {/* Hover Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                                    {/* Icon Box */}
                                    <div className="shrink-0 flex md:block justify-start">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 flex items-center justify-center group-hover:scale-105 group-hover:border-primary/30 transition-all duration-300 shadow-lg shadow-black/50">
                                            <topic.icon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="text-base font-semibold text-gray-200 group-hover:text-white transition-colors truncate tracking-wide">
                                            {topic.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                                            <span>{stat.count} discussions</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                            <span>{stat.views} views</span>
                                        </div>
                                    </div>

                                    {/* Latest Post - Desktop Only */}
                                    <div className="hidden md:flex flex-[1.5] justify-end items-center pl-6 border-l border-white/5">
                                        {stat.latestPost ? (
                                            <div className="w-full group/latest">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70 group-hover:text-primary transition-colors">Latest Activity</span>
                                                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors">
                                                        {stat.latestPost.createdAt ? formatDistanceToNow(stat.latestPost.createdAt.toDate(), { addSuffix: true }) : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-5 h-5 opacity-70 ring-1 ring-white/10">
                                                        <AvatarImage src={stat.latestPost.authorAvatar || ""} alt="" className="object-cover" />
                                                        <AvatarFallback className="flex items-center justify-center text-gray-500">
                                                            <User className="w-3.5 h-3.5" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-gray-400 truncate group-hover:text-primary-foreground/80 transition-colors font-medium">
                                                        {stat.latestPost.title}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-700 italic">No activity</span>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    <div className="hidden md:flex items-center justify-center w-8 shrink-0 text-gray-700 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
