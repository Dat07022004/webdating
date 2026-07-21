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

describe("Backend API smoke tests", () => {
  it("GET /api/health returns 200 OK", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("OK");
  });

  it("GET /api/health/db returns 503 when the test app has no real DB connection", async () => {
    const res = await request(app).get("/api/health/db");

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toBe("Database is not connected");
  });

  it("GET /api/users reaches the users route surface", async () => {
    const res = await request(app).get("/api/users");
    expect([200, 401, 404]).toContain(res.statusCode);
  });
});
