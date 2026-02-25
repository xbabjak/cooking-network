import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { getGroceryItems } from "@/lib/grocery-items";
import { PostForm } from "@/components/post-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?callbackUrl=/post/${id}/edit`);

  const [post, initialGroceryItems] = await Promise.all([
    getPostById(id),
    getGroceryItems(),
  ]);
  if (!post || post.authorId !== session.user.id) notFound();

  const initialRecipe = post.recipe
    ? {
        name: post.recipe.name,
        description: post.recipe.description ?? "",
        ingredients: post.recipe.ingredients.map((i) => ({
          groceryItemId: i.groceryItemId,
          groceryItemName: i.groceryItem.name,
          quantity: i.quantity,
          unit: i.unit,
        })),
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit post</h1>
      <PostForm
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        initialImageUrls={post.imageUrls}
        initialType={post.type as "story" | "recipe"}
        initialRecipe={initialRecipe}
        initialGroceryItems={initialGroceryItems}
      />
    </div>
  );
}
