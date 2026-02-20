import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format, isBefore, subDays } from "date-fns"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatForumDate(date: Date | number | string): string {
    const d = new Date(date);
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    if (isBefore(d, sevenDaysAgo)) {
        return format(d, "MMM d, yyyy • h:mm a");
    }

    return formatDistanceToNow(d, { addSuffix: true });
}
