import { describe, it, expect } from "@jest/globals";
import { connectDB } from "../config/db.js";

describe("Test API Endpoints", () => {
  it("GET /api/users - Nên trả về danh sách user", async () => {
    const res = await request(app).get("/api/users");
    // Khi gọi dòng này, code trong controller và service sẽ được chạy
    // Coverage sẽ nhảy số ở mấy file controller/service đó
    expect(res.statusCode).toEqual(200);
  });
});
describe("Kiểm tra Logic", () => {
  it("Hàm kết nối DB phải tồn tại", () => {
    expect(connectDB).toBeDefined();
  });
});
