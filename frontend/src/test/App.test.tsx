import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App Component", () => {
  it("nên hiển thị ứng dụng mà không bị crash", () => {
    render(<App />);
    expect(true).toBe(true);
  });
});
