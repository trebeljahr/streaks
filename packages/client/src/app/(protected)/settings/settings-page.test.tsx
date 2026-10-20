// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: {
      // What a brand-new account's profile looks like.
      get: {
        useQuery: () => ({
          data: {
            userId: "u1",
            preferences: { theme: "system", timezone: "UTC", dayStartHour: 4 },
          },
          refetch: vi.fn(),
        }),
      },
      update: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    billing: { status: { useQuery: () => ({ data: { enabled: false } }) } },
  },
}));

import SettingsPage from "./page";

afterEach(cleanup);

describe("Settings", () => {
  it("shows a new account no email notification setting", () => {
    render(<SettingsPage />);
    expect(screen.queryByTestId("notifications-toggle")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/email notifications/i)).toBeNull();
    expect(screen.getByTestId("sign-out")).toBeTruthy();
  });
});
