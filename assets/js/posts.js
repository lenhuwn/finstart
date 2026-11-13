/* =====================================================================
   FINSTART – POSTS.JS
   Danh sách bài viết Blog (dùng cho trang Blog + mục "Bài viết liên quan").
   Thêm bài mới: tạo file pages/bai-viet-N.html rồi thêm 1 dòng vào đây.
   ===================================================================== */
window.FS = window.FS || {};
window.FS.CATS = {
    'meo-tiet-kiem': 'Mẹo tiết kiệm',
    'viec-lam': 'Việc làm & Part-time',
    'hoc-bong': 'Học bổng',
    'giang-duong': 'Chuyện giảng đường'
};
window.FS.POSTS = [
    {
        id: 1, cat: 'meo-tiet-kiem', featured: true, views: 3120,
        title: 'Bí quyết sống thoải mái với 3 triệu/tháng',
        excerpt: 'Chia sẻ thực tế cách chia tiền nhà, tiền ăn, đi lại và vẫn để dành được tiền mỗi tháng chỉ với 3 triệu đồng.',
        author: 'Độc giả VietNamNet', date: '2026-10-02', read: 6,
        image: 'https://cafefcdn.com/thumb_w/1200/203337114487263232/2023/10/10/680102046-16895799278471917433353-1691306399394-16913064001931013067454-1691308374474-1691308375004138969037711zon-1696919-39-0-1289-2000-crop-16969197753441933566221.png'
    },
    {
        id: 2, cat: 'viec-lam', views: 2480,
        title: 'Top 5 công việc part-time vừa có thu nhập vừa tích lũy kinh nghiệm',
        excerpt: 'Tránh xa các việc làm chân tay không tạo giá trị lâu dài. Khám phá cơ hội Content, Trợ lý dữ liệu, Quản trị fanpage...',
        author: 'Minh Trang', date: '2026-10-08', read: 5,
        image: '../assets/img/sinh-vien.png'
    },
    {
        id: 3, cat: 'giang-duong', views: 1960,
        title: 'Giảng đường không chỉ có hoa hồng',
        excerpt: 'Áp lực đồng trang lứa, những đêm thức trắng giành giật cơ hội học bổng và cuộc chiến định vị bản thân tuổi 20.',
        author: 'Thảo Nguyên', date: '2026-10-15', read: 4,
        image: 'https://thanhnien.mediacdn.vn/Uploaded/ngoclong/2022_12_20/img-0088-4-9505.jpg'
    },
    {
        id: 4, cat: 'meo-tiet-kiem', views: 1720,
        title: '20 cách tiết kiệm tiền hiệu quả cho học sinh, sinh viên',
        excerpt: 'Từ quy tắc 50/30/20, nấu ăn theo tuần đến săn ưu đãi sinh viên – danh sách mẹo dễ áp dụng ngay hôm nay.',
        author: 'Ban biên tập FinStart', date: '2026-10-20', read: 7,
        image: 'https://timo.vn/wp-content/uploads/cach-tiet-kiem-tien-cho-hoc-sinh.png'
    },
    {
        id: 5, cat: 'hoc-bong', views: 1340,
        title: 'Cách săn học bổng toàn phần đại học cho sinh viên',
        excerpt: 'Chuẩn bị hồ sơ, viết bài luận và lên lịch nộp đơn – lộ trình 6 tháng giúp bạn tăng cơ hội nhận học bổng.',
        author: 'Ban biên tập FinStart', date: '2026-10-27', read: 6,
        image: 'https://thanhdo.edu.vn/wp-content/uploads/2025/07/san-hoc-bong-toan-phan-1.jpg'
    }
];
