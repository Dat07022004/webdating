import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// 1. Mock toàn bộ Clerk React
vi.mock("@clerk/clerk-react", () => {
  return {
    // Mock các Hook
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
