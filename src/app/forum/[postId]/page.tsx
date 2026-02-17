import PostDetail from "@/components/forum/PostDetail";

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params;
    return <PostDetail postId={postId} />;
}
