import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/profile-edit-form";

export const metadata: Metadata = {
  title: "Edit profile | Cooking Network",
  description: "Update your profile information.",
};

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/profile/edit`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      password: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit profile</h1>
      <ProfileEditForm
        initialName={user.name ?? ""}
        initialUsername={user.username ?? ""}
        initialImage={user.image}
        initialBio={user.bio}
        canChangePassword={!!user.password}
      />
    </div>
  );
}
