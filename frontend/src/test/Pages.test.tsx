import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import Discover from "../pages/Discover";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("Kiểm tra Render toàn bộ Pages", () => {
  const pages = [
    { name: "Landing", component: <Landing /> },
    { name: "Login", component: <Login /> },
    { name: "Register", component: <Register /> },
    { name: "Profile", component: <Profile /> },
    { name: "Discover", component: <Discover /> },
  ];

  pages.forEach(({ name, component }) => {
    it(`Trang ${name} phải render được`, () => {
      const { baseElement } = render(component, { wrapper: AllTheProviders });
      expect(baseElement).toBeTruthy();
    });
  });
});
