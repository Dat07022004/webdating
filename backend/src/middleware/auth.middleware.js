import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { ENV } from '../config/env.js';

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Không có quyền truy cập, vui lòng đăng nhập" });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Token không hợp lệ" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xác thực", error: error.message });
  }
};