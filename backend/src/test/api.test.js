import { jest } from "@jest/globals";

jest.unstable_mockModule("../config/db.js", () => ({
  connectDB: jest.fn(() => Promise.resolve()),
}));

jest.unstable_mockModule("@clerk/express", () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  requireAuth: () => (req, res, next) => next(),
  verifyToken: jest.fn(async () => ({ sub: "test-user" })),
  createClerkClient: () => ({
    users: {
      deleteUser: jest.fn(),
    },
  }),
}));

const { default: app } = await import("../server.js");
const { default: request } = await import("supertest");

describe("Kiểm tra API Backend", () => {
  it("GET /api/health - Trả về 200 OK", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    console.log("Health Check Body:", res.body);
  });

  it("GET /api/users - Kiểm tra kết nối Route User", async () => {
    const res = await request(app).get("/api/users");
    expect([200, 401, 404]).toContain(res.statusCode);
  });
});
