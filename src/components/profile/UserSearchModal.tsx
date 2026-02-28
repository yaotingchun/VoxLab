"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, UserPlus, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/contexts/FollowContext";
import { useAuth } from "@/contexts/AuthContext";
import { searchUsers } from "@/lib/users";
import { UserProfile } from "@/types/forum";
import { useRouter } from "next/navigation";

interface UserSearchModalProps {
    onClose: () => void;
}

export function UserSearchModal({ onClose }: UserSearchModalProps) {
    const { user } = useAuth();
    const { followUser, unfollowUser, isFollowing } = useFollow();
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
    const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});

    // Debounced search
    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const found = await searchUsers(query);
                // Exclude the current user from results
                const filtered = found.filter(u => u.uid !== user?.uid);
                setResults(filtered);

                // Check follow status for each result
                const map: Record<string, boolean> = {};
                await Promise.all(filtered.map(async u => {
                    map[u.uid] = await isFollowing(u.uid);
                }));
                setFollowingMap(map);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query, user, isFollowing]);

    const handleToggleFollow = async (target: UserProfile) => {
        setLoadingFollow(p => ({ ...p, [target.uid]: true }));
        try {
            if (followingMap[target.uid]) {
                await unfollowUser(target.uid);
                setFollowingMap(p => ({ ...p, [target.uid]: false }));
            } else {
                await followUser(target.uid, target.displayName, target.photoURL ?? null);
                setFollowingMap(p => ({ ...p, [target.uid]: true }));
            }
        } finally {
            setLoadingFollow(p => ({ ...p, [target.uid]: false }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold">Find Friends</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search @username or paste a user ID..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Try <span className="font-mono">@tayxinying</span> or paste a full Firebase UID
                    </p>
                </div>

                {/* Results */}
                <div className="overflow-y-auto flex-1 max-h-80 p-3 space-y-2">
                    {!query.trim() && (
                        <p className="text-center text-sm text-muted-foreground py-8">
                            Start typing to search for users
                        </p>
                    )}
                    {query.trim() && !searching && results.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">
                            No users found for <strong>&quot;{query}&quot;</strong>
                        </p>
                    )}
                    {results.map(u => (
                        <div key={u.uid} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors">
                            <button
                                onClick={() => { onClose(); router.push(`/dashboard/profile/${u.uid}`); }}
                                className="flex items-center gap-3 flex-1 text-left min-w-0"
                            >
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
                                    <AvatarFallback>{(u.displayName?.[0] ?? "U").toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{u.displayName}</p>
                                    {u.username && (
                                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                                    )}
                                    {u.bio && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5 italic">{u.bio}</p>
                                    )}
                                </div>
                            </button>

                            <Button
                                size="sm"
                                variant={followingMap[u.uid] ? "outline" : "default"}
                                disabled={loadingFollow[u.uid]}
                                onClick={() => handleToggleFollow(u)}
                                className="flex-shrink-0 gap-1.5"
                            >
                                {loadingFollow[u.uid] ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : followingMap[u.uid] ? (
                                    <><UserCheck className="w-3.5 h-3.5" />Following</>
                                ) : (
                                    <><UserPlus className="w-3.5 h-3.5" />Follow</>
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
