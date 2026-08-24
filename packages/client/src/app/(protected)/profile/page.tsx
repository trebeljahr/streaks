"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = trpc.profile.get.useQuery();
  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  function handleStartEdit() {
    setBio(profileQuery.data?.bio ?? "");
    setIsEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({ bio });
    setIsEditing(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      <div className="max-w-md space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Bio */}
        {profileQuery.isLoading ? (
          <p className="text-muted-foreground">Loading profile...</p>
        ) : isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="profile-bio-input"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                data-testid="profile-save"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Bio</p>
            <p className="text-sm text-muted-foreground" data-testid="profile-bio">
              {profileQuery.data?.bio || "No bio set"}
            </p>
            <button
              onClick={handleStartEdit}
              className="text-sm text-primary hover:underline"
              data-testid="profile-edit"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
