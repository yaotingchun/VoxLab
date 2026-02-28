import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function SpeechCoachLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}
