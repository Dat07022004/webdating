# Appointments Module - Deliverable Checklist

## 1) Chuc nang da lam duoc (CRUD + auth + authorization + transaction)

- Create appointment: `POST /api/appointments`
- Read appointments by user: `GET /api/appointments/:userId`
- Update appointment: `PATCH /api/appointments/:id`
- Cancel appointment (soft delete): `DELETE /api/appointments/:id`
- Suggest slots: `POST /api/appointments/suggest`

AuthN/AuthZ hien tai:
- Protected by `requireActiveUser` middleware at server level (`/api/appointments`).
- Ownership check in update/cancel/get-by-user: user chi thao tac duoc lich cua chinh minh.

Transaction:
- `createAppointment` su dung MongoDB session transaction cho check xung dot + tao lich atomically.

## 2) File ma nguon chinh

- Route: `backend/src/routes/appointments.routes.js`
- Service: `backend/src/services/appointment.service.js`
- Model: `backend/src/models/appointments.model.js`

## 3) Anh Postman can chup de nop

Chup toi thieu 6 anh:
- [1] Create thanh cong (201) + response co `_id`, `userId`, `locationId`, `startTime`.
- [2] Get by user (200) + danh sach lich hen.
- [3] Update thanh cong (200) doi `startTime` hoac `status`.
- [4] Cancel thanh cong (200) status `cancelled`.
- [5] Authorization fail (403): dung token user A, thao tac appointment cua user B.
- [6] Conflict (409): tao lich trung khung gio/cung dia diem.

Khuyen nghi them 2 anh bonus:
- [7] Unauthorized (401): bo Authorization header.
- [8] Suggest appointments (200): tra ve toi da 3 de xuat.

## 4) Git history can nop

Yeu cau bao cao:
- Co commit ro rang theo tien trinh.
- Message format: `<type>: <mo ta ngan>`.

Lenh goi y:

```powershell
git log --oneline --decorate --graph -n 20
git show --name-only --stat HEAD
```

## 5) Mau commit cho phan dat lich

- `fix: bao ve ownership cho appointments routes`
- `fix: them transaction khi tao lich hen`
- `docs: bo sung checklist va postman collection appointments`

## 6) Postman collection

- File import: `backend/postman/appointments.postman_collection.json`
- Set bien truoc khi chay:
  - `baseUrl`
  - `token`
  - `userId`
  - `locationId`
  - `appointmentId`
