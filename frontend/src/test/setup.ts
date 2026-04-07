import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

vi.mock("@clerk/clerk-react", () => {
  return {
    useUser: () => ({
      isSignedIn: true,
      user: { id: "user_123", fullName: "Đăng IT" },
      isLoaded: true,
    }),
    useClerk: () => ({
      signOut: vi.fn(),
      openUserProfile: vi.fn(),
    }),
    useAuth: () => ({
      isSignedIn: true,
      userId: "user_123",
      sessionId: "session_123",
      getToken: vi.fn(async () => "mock_token"),
    }),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignIn: () => React.createElement("div", null, "Mock SignIn Component"),
    SignUp: () => React.createElement("div", null, "Mock SignUp Component"),
    UserButton: () => React.createElement("div", null, "Mock UserButton"),
    SignedIn: ({ children }: { children: React.ReactNode }) => children,
    SignedOut: ({ children }: { children: React.ReactNode }) => children,
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockObserver);
vi.stubGlobal("ResizeObserver", MockObserver);

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);

    if (url.includes("/api/notifications/unread-counts")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ notificationCount: 0, messageCount: 0 }),
        text: async () => "",
      };
    }

    if (url.includes("/api/notifications")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ notifications: [] }),
        text: async () => "",
      };
    }

    if (url.includes("/api/users/me")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ profile: null }),
        text: async () => "",
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    };
  }),
);
