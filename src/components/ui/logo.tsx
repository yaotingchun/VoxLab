import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Logo: React.FC<LogoProps> = ({ className, size = "md" }) => {
    const sizeClasses = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
        xl: "text-4xl",
        "2xl": "text-6xl",
    };

    return (
        <span
            className={cn(
                "font-space-grotesk font-bold tracking-tight text-white",
                sizeClasses[size],
                className
            )}
        >
            VoxLab
        </span>
    );
};
