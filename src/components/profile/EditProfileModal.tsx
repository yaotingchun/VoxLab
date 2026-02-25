"use client";

import { useState, useRef } from "react";
import { X, Camera, Loader2, AtSign, User, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, UpdateProfileFields } from "@/hooks/useUserProfile";
import { isUsernameTaken } from "@/lib/users";
import { UserProfile } from "@/types/forum";

interface EditProfileModalProps {
    profile: UserProfile;
    onClose: () => void;
}

export function EditProfileModal({ profile, onClose }: EditProfileModalProps) {
    const { user } = useAuth();
    const { updateProfile } = useUserProfile();

    const [displayName, setDisplayName] = useState(profile.displayName ?? "");
    const [username, setUsername] = useState(profile.username ?? "");
    const [bio, setBio] = useState(profile.bio ?? "");
    const [photoURL, setPhotoURL] = useState(profile.photoURL ?? "");

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        setError(null);
        try {
            // Get signed URL from our existing GCS endpoint
            const res = await fetch("/api/upload/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: `avatars/${user.uid}-${file.name}`, contentType: file.type }),
            });
            if (!res.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, publicUrl } = await res.json();

            await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

            // Make the file public after successful upload
            await fetch("/api/upload/make-public", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: publicUrl }),
            });

            setPhotoURL(publicUrl);
        } catch (err: any) {
            setError("Avatar upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const validateUsername = (val: string) => {
        if (!val) return null; // optional
        if (!/^[a-z0-9_]{3,20}$/.test(val.toLowerCase())) {
            return "Username must be 3–20 chars: letters, numbers, underscores only.";
        }
        return null;
    };

    const handleSave = async () => {
        setError(null);
        const uErr = validateUsername(username);
        if (uErr) { setUsernameError(uErr); return; }
        setUsernameError(null);

        setSaving(true);
        try {
            // Check username uniqueness if changed
            if (username && username.toLowerCase() !== profile.username) {
                const taken = await isUsernameTaken(username.toLowerCase(), user!.uid);
                if (taken) {
                    setUsernameError("That username is already taken.");
                    setSaving(false);
                    return;
                }
            }

            const fields: UpdateProfileFields = {};
            if (displayName.trim()) fields.displayName = displayName.trim();
            if (bio !== profile.bio) fields.bio = bio.trim();
            if (username.toLowerCase() !== (profile.username ?? "")) fields.username = username.toLowerCase();
            if (photoURL !== profile.photoURL) fields.photoURL = photoURL;

            await updateProfile(fields);
            setSuccess(true);
            setTimeout(onClose, 800);
        } catch (err: any) {
            setError(err.message ?? "Failed to save profile.");
        } finally {
            setSaving(false);
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
                    <h2 className="text-lg font-semibold">Edit Profile</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={photoURL} alt={displayName} />
                                <AvatarFallback className="text-2xl">
                                    {(displayName?.[0] || "U").toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow hover:bg-primary/80 transition-colors disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Click camera to change photo</p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Display Name
                        </label>
                        <input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            maxLength={50}
                            placeholder="Your name"
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                            <AtSign className="w-3.5 h-3.5" /> Username
                        </label>
                        <input
                            value={username}
                            onChange={e => { setUsername(e.target.value); setUsernameError(null); }}
                            maxLength={20}
                            placeholder="e.g. tayxinying"
                            className={`w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${usernameError ? "border-red-500" : ""}`}
                        />
                        {usernameError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />{usernameError}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">Used for search. Letters, numbers & underscores only.</p>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Bio
                            <span className="ml-auto text-xs text-muted-foreground font-normal">{bio.length}/160</span>
                        </label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength={160}
                            rows={3}
                            placeholder="Tell people a little about yourself..."
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <p className="text-sm text-red-500 flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </p>
                    )}
                    {success && (
                        <p className="text-sm text-green-500 flex items-center gap-2 bg-green-500/10 rounded-lg px-3 py-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Profile saved!
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-5 border-t">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleSave} disabled={saving || uploading}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
