"use client";
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalBackButton() {
    const router = useRouter();
    const pathname = usePathname();

    // Do not show on Dashboard or Root Landing page
    if (pathname === '/dashboard' || pathname === '/') {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10 fixed top-4 right-4 z-[100]"
            title="Go Back"
        >
            <ArrowLeft className="w-5 h-5" />
        </Button>
    );
}
