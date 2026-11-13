# FinStart – Website quản lý tài chính cho sinh viên

Đồ án môn **Thiết kế Web** · GVHD: **TS. Ngô Văn Bình**
Nhóm: Phạm Thu Hương · Đinh Minh Thư · Đỗ Thị Lan Hương · Võ Hải Sơn Trà · Tạ Thị Ánh Hồng

Website tĩnh (HTML + CSS + JavaScript thuần), không cần cài đặt, chạy được trên GitHub Pages.

## Chạy thử

- **Cách 1:** mở `index.html` bằng VS Code → chuột phải → **Open with Live Server**.
- **Cách 2:** bật GitHub Pages (Settings → Pages → Branch `main` / root) rồi mở link được cấp.
- **Tài khoản demo:** `demo@finstart.vn` / `finstart123` (có sẵn dữ liệu mẫu 3 tháng), hoặc tự đăng ký tài khoản mới.

## Cấu trúc thư mục

```
index.html                    Trang chủ – Về dự án
pages/
├── tinh-nang.html            Tính năng
├── san-pham.html             Sản phẩm & bảng giá
├── blog.html                 Blog (lọc danh mục + tìm kiếm)
├── bai-viet-1..5.html        Các bài viết
├── dang-nhap.html            Đăng nhập
├── dang-ky.html              Đăng ký
├── quen-mat-khau.html        Quên mật khẩu
├── chinh-sach-bao-mat.html   Chính sách bảo mật dữ liệu
├── dieu-khoan-dich-vu.html   Điều khoản dịch vụ
├── quy-chuan-ma-hoa.html     Quy chuẩn mã hóa tài chính
├── ho-tro.html               Hỗ trợ 24/7 (FAQ + form liên hệ)
└── app/                      KHU VỰC SAU ĐĂNG NHẬP
    ├── tong-quan.html        Tổng quan (thẻ số liệu, 50/30/20, biểu đồ, mục tiêu)
    ├── tai-khoan.html        Tài khoản / ví (thêm, sửa, xóa, chuyển tiền, sao kê)
    ├── ghi-chep.html         Ghi chép thu chi (thêm, sửa, xóa, ghi hàng loạt)
    ├── lich-su.html          Lịch sử giao dịch (lọc, nhóm theo ngày, xuất CSV/Excel)
    └── cai-dat.html          Cài đặt (hồ sơ, ngân sách, mật khẩu, sao lưu)
assets/
├── css/
│   ├── base.css              Biến màu, nút, form, card, bảng, modal (dùng chung)
│   ├── public.css            Header, footer, section – trang công khai
│   ├── app.css               Sidebar, topbar – khu bảng điều khiển
│   └── pages/*.css           CSS riêng từng trang
├── js/
│   ├── store.js              Dữ liệu (localStorage) + đăng ký/đăng nhập + xuất file
│   ├── layout.js             Sinh header/footer/sidebar dùng chung, toast, modal
│   ├── tx-form.js            Popup thêm/sửa giao dịch dùng chung
│   ├── posts.js              Danh sách bài viết blog
│   └── pages/*.js            JS riêng từng trang
├── icons/                    Icon nhóm thiết kế (FINSTARTicons + Material)
└── img/                      Ảnh, favicon
ban-goc-nhom/                 Toàn bộ code gốc của nhóm (giữ nguyên để đối chiếu)
```

## Quy ước để cả nhóm sửa dễ dàng

- **Màu sắc / font / bo góc:** chỉ sửa biến trong `assets/css/base.css` (mục 1). Màu chủ đạo `#006C49` lấy từ thiết kế Stitch.
- **Menu, header, footer, sidebar:** sửa **một chỗ** trong `assets/js/layout.js` – mọi trang tự cập nhật.
- **Thêm trang mới:** copy một trang cùng thư mục, đổi `data-page`, `<title>` và nội dung trong `<main>`.
- **Thêm bài blog:** tạo `pages/bai-viet-6.html` (copy từ bài 1) và thêm 1 dòng vào `assets/js/posts.js`.
- Mỗi file CSS/JS có **mục lục ở đầu file** và chia phần bằng `/* ===== */`.

## Lưu ý kỹ thuật

- Dữ liệu người dùng lưu trong **localStorage của trình duyệt** (không có máy chủ). Mật khẩu được băm SHA-256 + salt trước khi lưu. Dùng *Cài đặt → Tải bản sao lưu* để mang dữ liệu sang máy khác.
- Tên file không dấu, không khoảng trắng để chạy ổn định trên GitHub Pages / mọi hệ điều hành.
