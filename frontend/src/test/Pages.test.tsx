import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import Discover from "../pages/Discover";

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("Kiểm tra Render toàn bộ Pages", () => {
  it("Trang Landing phải render được", () => {
    render(<Landing />, { wrapper: AllTheProviders });
    expect(true).toBe(true);
  });

  it("Trang Login phải render được", () => {
    render(<Login />, { wrapper: AllTheProviders });
    expect(true).toBe(true);
  });

  it("Trang Register phải render được", () => {
    render(<Register />, { wrapper: AllTheProviders });
    expect(true).toBe(true);
  });

  it("Trang Profile phải render được", () => {
    render(<Profile />, { wrapper: AllTheProviders });
    expect(true).toBe(true);
  });

  it("Trang Discover phải render được", () => {
    render(<Discover />, { wrapper: AllTheProviders });
    expect(true).toBe(true);
  });
});
