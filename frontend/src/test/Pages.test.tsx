import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom"; // Thay đổi ở đây
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import Discover from "../pages/Discover";

// Nếu mày có dùng Toaster của Shadcn/ui hoặc React Query, hãy nhét vào đây luôn
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
  // Tao gom lại thành một mảng cho mày dễ quản lý và scannable
  const pages = [
    { name: "Landing", component: <Landing /> },
    { name: "Login", component: <Login /> },
    { name: "Register", component: <Register /> },
    { name: "Profile", component: <Profile /> },
    { name: "Discover", component: <Discover /> },
  ];

  pages.forEach(({ name, component }) => {
    it(`Trang ${name} phải render được`, () => {
      // Render mà không bị crash là thành công bước đầu
      const { baseElement } = render(component, { wrapper: AllTheProviders });
      expect(baseElement).toBeTruthy();
    });
  });
});
