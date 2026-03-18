import Appointment from '../models/appointment.model.js';

// Gợi ý lịch hẹn (địa điểm, thời gian, chi phí dự kiến)
export const suggestAppointmentDetails = async (req, res) => {
  try {
    const suggestions = {
      locations: [
        { name: "Highlands Coffee - Hồ Gươm", address: "1-3-5 Đinh Tiên Hoàng, Hà Nội", estimatedCost: { amount: 150000, currency: "VND" } },
        { name: "Cộng Cà Phê - Nhà Thờ Lớn", address: "27 Nhà Thờ, Hoàn Kiếm, Hà Nội", estimatedCost: { amount: 120000, currency: "VND" } },
        { name: "The Coffee House - Cầu Giấy", address: "Số 2 Tôn Thất Thuyết, Cầu Giấy, Hà Nội", estimatedCost: { amount: 100000, currency: "VND" } },
        { name: "CGV - Vincom Bà Triệu", address: "191 Bà Triệu, Lê Đại Hành, Hà Nội", estimatedCost: { amount: 300000, currency: "VND" } },
        { name: "Lotte Observation Deck", address: "54 Liễu Giai, Ba Đình, Hà Nội", estimatedCost: { amount: 460000, currency: "VND" } },
      ],
      times: [
        "19:00", "20:00", "15:00", "10:00"
      ]
    };
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// Tạo lịch hẹn
export const createAppointment = async (req, res) => {
  try {
    const { receiverId, date, location, estimatedCost, notes } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !date || !location || !estimatedCost) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp đầy đủ thông tin: receiverId, date, location, estimatedCost" });
    }

    const newAppointment = await Appointment.create({
      senderId,
      receiverId,
      date,
      location,
      estimatedCost,
      notes
    });

    res.status(201).json({ success: true, message: "Tạo lịch hẹn thành công", data: newAppointment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// Lấy danh sách lịch hẹn của user
export const getAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const appointments = await Appointment.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).populate('senderId', 'name avatar').populate('receiverId', 'name avatar').sort({ date: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// Lấy chi tiết lịch hẹn
export const getAppointmentDetails = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId)
      .populate('senderId', 'name avatar')
      .populate('receiverId', 'name avatar');
      
    if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// Cập nhật lịch hẹn
export const updateAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { date, location, estimatedCost, status, notes } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

    // Cập nhật các trường
    if (date) appointment.date = date;
    if (location) appointment.location = location;
    if (estimatedCost) appointment.estimatedCost = estimatedCost;
    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;

    const updatedAppointment = await appointment.save();

    res.status(200).json({ success: true, message: "Cập nhật lịch hẹn thành công", data: updatedAppointment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// Hủy/Xóa lịch hẹn (nếu status = cancelled hoặc có thể delete)
export const deleteAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

    res.status(200).json({ success: true, message: "Xóa lịch hẹn thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};