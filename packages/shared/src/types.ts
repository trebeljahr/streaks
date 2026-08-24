/** Metadata about a room member. */
export type RoomMember = {
  userId: string;
  displayName: string;
  joinedAt: string;
};

/** Possible statuses for an Item. */
export type ItemStatus = "draft" | "published" | "archived";

/** User theme preference. */
export type ThemePreference = "light" | "dark" | "system";

/** Shape of a user profile (extends better-auth's User). */
export type UserProfile = {
  userId: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: ThemePreference;
    notifications: boolean;
  };
};

/** Shape of an Item (example CRUD entity). */
export type Item = {
  id: string;
  title: string;
  description?: string;
  status: ItemStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};
