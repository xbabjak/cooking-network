import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroceryItems } from "@/lib/grocery-items";
import { PostForm } from "@/components/post-form";

export default async function NewPostPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/post/new");

  const initialGroceryItems = await getGroceryItems();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New post</h1>
      <PostForm initialGroceryItems={initialGroceryItems} />
    </div>
  );
}
