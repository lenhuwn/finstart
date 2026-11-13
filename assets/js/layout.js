/* =====================================================================
   FINSTART – LAYOUT.JS
   Sinh các phần DÙNG CHUNG để mọi trang luôn đồng bộ:
     • Header + Footer   (trang công khai)   → <body data-layout="public">
     • Sidebar + Topbar  (khu bảng điều khiển) → <body data-layout="app">
   Mỗi trang khai báo:
     data-root  = đường dẫn tới thư mục gốc ("" | "../" | "../../")
     data-page  = mã trang để tô sáng menu
   Mục lục:
     1. Bộ icon SVG
     2. Danh sách trang (đổi tên file chỉ cần sửa ở đây)
     3. Header + Footer
     4. Sidebar + Topbar
     5. UI dùng chung: toast, modal, confirm
     6. Khởi chạy
   ===================================================================== */
(function () {
    'use strict';
    const FS = (window.FS = window.FS || {});
    const body = document.body;
    const ROOT = body.dataset.root || '';
    const PAGE = body.dataset.page || '';
    const LAYOUT = body.dataset.layout || 'public';

    /* ========== 1. ICON ========== */
    const ICONS = {
        home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/>',
        edit: '<path d="m15 5 4 4M4 20l4-1L20 7l-4-4L4 15Z"/>',
        note: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
        piggy: '<path d="M19 9c1 0 2 .5 2 2v2h-2l-1 3h-2v2h-3v-2H9v2H6v-2.5A6 6 0 0 1 9 5h4a6 6 0 0 1 5 3z"/><circle cx="15" cy="10" r="1"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        logout: '<path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        close: '<path d="M6 6l12 12M18 6 6 18"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
        upload: '<path d="M12 20V9m-5 5 5-5 5 5M5 4h14"/>',
        filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
        transfer: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
        eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        check: '<path d="m5 12 5 5 9-10"/>',
        shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
        chevron: '<path d="m9 6 6 6-6 6"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
    };
    FS.icon = function (name, cls) {
        return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
    };
    FS.logo = function (href) {
        return '<a class="logo" href="' + href + '" aria-label="FinStart – Trang chủ">' +
            '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#006C49"/><path d="M8 22.5l5.5-6 4 3.5L23 11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="11" r="2.2" fill="#C9F9E7"/></svg>' +
            '<span>Fin<b>Start</b></span></a>';
    };

    /* ========== 2. DANH SÁCH TRANG ========== */
    const P = FS.PATHS = {
        home:        ROOT + 'index.html',
        features:    ROOT + 'pages/tinh-nang.html',
        products:    ROOT + 'pages/san-pham.html',
        blog:        ROOT + 'pages/blog.html',
        login:       ROOT + 'pages/dang-nhap.html',
        register:    ROOT + 'pages/dang-nhap.html?tab=register',
        forgot:      ROOT + 'pages/quen-mat-khau.html',
        privacy:     ROOT + 'pages/chinh-sach-bao-mat.html',
        terms:       ROOT + 'pages/dieu-khoan-dich-vu.html',
        encryption:  ROOT + 'pages/quy-chuan-ma-hoa.html',
        support:     ROOT + 'pages/ho-tro.html',
        dashboard:   ROOT + 'pages/app/tong-quan.html',
        accounts:    ROOT + 'pages/app/tai-khoan.html',
        record:      ROOT + 'pages/app/ghi-chep.html',
        history:     ROOT + 'pages/app/lich-su.html',
        settings:    ROOT + 'pages/app/cai-dat.html'
    };
    FS.asset = path => ROOT + 'assets/' + path;

    const PUBLIC_NAV = [
        { id: 'about',    label: 'Về dự án',  href: P.home },
        { id: 'features', label: 'Tính năng', href: P.features },
        { id: 'products', label: 'Sản phẩm',  href: P.products },
        { id: 'blog',     label: 'Blog',      href: P.blog }
    ];
    const APP_NAV = [
        { id: 'dashboard', label: 'Tổng quan',          href: P.dashboard, icon: 'home' },
        { id: 'accounts',  label: 'Tài khoản',          href: P.accounts,  icon: 'wallet' },
        { id: 'record',    label: 'Ghi chép thu chi',   href: P.record,    icon: 'note' },
        { id: 'history',   label: 'Lịch sử giao dịch',  href: P.history,   icon: 'history' },
        { id: 'products',  label: 'Sản phẩm tài chính', href: P.products,  icon: 'piggy' }
    ];

    const initial = name => (String(name || '?').trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();
    FS.initial = initial;

    /* ========== 3. HEADER + FOOTER ========== */
    function renderHeader() {
        const el = document.getElementById('site-header');
        if (!el) return;
        const me = FS.auth && FS.auth.current();
        const actions = me
            ? '<a class="btn btn-primary btn-sm" href="' + P.dashboard + '">Bảng điều khiển</a>' +
              '<a class="user-chip" href="' + P.settings + '" title="Tài khoản của tôi"><span class="avatar">' + initial(me.name) + '</span><span>' + FS.escape(me.name) + '</span></a>'
            : '<a class="link-login" href="' + P.login + '">Đăng nhập</a><a class="btn btn-dark" href="' + P.register + '">Đăng ký</a>';

        el.className = 'site-header';
        el.innerHTML =
            '<div class="container">' + FS.logo(P.home) +
            '<nav class="site-nav" aria-label="Menu chính">' +
            PUBLIC_NAV.map(n => '<a href="' + n.href + '"' + (n.id === PAGE ? ' class="active" aria-current="page"' : '') + '>' + n.label + '</a>').join('') +
            '</nav>' +
            '<div class="header-actions">' + actions +
            '<button class="icon-btn menu-toggle" type="button" aria-label="Mở menu" aria-expanded="false">' + FS.icon('menu') + '</button></div>' +
            '</div>';

        const toggle = el.querySelector('.menu-toggle');
        toggle.addEventListener('click', () => {
            const open = el.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
        });
    }

    function renderFooter() {
        const el = document.getElementById('site-footer');
        if (!el) return;
        el.className = 'site-footer';
        el.innerHTML =
            '<div class="container"><div class="footer-grid">' +
            '<div>' + FS.logo(P.home) + '<p>Đồng hành cùng thế hệ trẻ Việt Nam xây dựng nền tảng tài chính vững vàng ngay từ giảng đường đại học.</p></div>' +
            '<div><h3>Giới thiệu</h3><nav class="footer-links">' +
            PUBLIC_NAV.map(n => '<a href="' + n.href + '">' + n.label + '</a>').join('') + '</nav></div>' +
            '<div><h3>Chính sách &amp; bảo mật</h3><nav class="footer-links">' +
            '<a href="' + P.privacy + '">Chính sách bảo mật</a>' +
            '<a href="' + P.terms + '">Điều khoản dịch vụ</a>' +
            '<a href="' + P.encryption + '">Quy chuẩn mã hóa tài chính</a>' +
            '<a href="' + P.support + '">Hỗ trợ 24/7</a></nav></div>' +
            '<div class="footer-contact"><h3>Liên hệ</h3><nav class="footer-links">' +
            '<span>Hotline: <a href="tel:19006868">1900 6868</a></span>' +
            '<span>Email: <a href="mailto:hotro@finstart.vn">hotro@finstart.vn</a></span>' +
            '<span>Tòa nhà FinTech Hub, TP. Hồ Chí Minh</span></nav></div>' +
            '</div><div class="footer-bottom"><span>© 2026 FinStart. Bảo lưu mọi quyền.</span><span>Đồ án môn Thiết kế Web</span></div></div>';
    }

    /* ========== 4. SIDEBAR + TOPBAR ========== */
    function renderSidebar(me) {
        const el = document.getElementById('sidebar');
        if (!el) return;
        el.className = 'sidebar';
        el.innerHTML =
            FS.logo(P.home) +
            '<a class="profile-card" href="' + P.settings + '">' +
            '<span class="avatar avatar-lg">' + initial(me.name) + '</span>' +
            '<span><strong>' + FS.escape(me.name) + '</strong><small>' + FS.escape(me.school || 'Sinh viên') + '</small></span>' +
            '<img class="verified" src="' + FS.asset('icons/tick.svg') + '" alt="Đã xác thực"></a>' +
            '<button class="btn btn-primary btn-block" type="button" data-action="quick-add">' + FS.icon('plus') + ' Thêm ghi chép mới</button>' +
            '<nav class="sidebar-nav" aria-label="Điều hướng bảng điều khiển">' +
            '<span class="sidebar-label">Quản lý</span>' +
            APP_NAV.map(n => '<a href="' + n.href + '"' + (n.id === PAGE ? ' class="active" aria-current="page"' : '') + '>' + FS.icon(n.icon) + n.label + '</a>').join('') +
            '</nav>' +
            '<nav class="sidebar-nav sidebar-bottom" aria-label="Tài khoản">' +
            '<a href="' + P.settings + '"' + (PAGE === 'settings' ? ' class="active"' : '') + '>' + FS.icon('settings') + 'Cài đặt</a>' +
            '<a href="#" class="logout" data-action="logout">' + FS.icon('logout') + 'Đăng xuất</a>' +
            '</nav>';
    }

    function renderTopbar(me) {
        const el = document.getElementById('topbar');
        if (!el) return;
        el.className = 'topbar';
        const notes = FS.notifications ? FS.notifications() : [];
        el.innerHTML =
            '<button class="icon-btn sidebar-toggle" type="button" aria-label="Mở menu">' + FS.icon('menu') + '</button>' +
            '<form class="search-box" role="search" action="' + P.history + '">' + FS.icon('search') +
            '<input class="input" type="search" name="q" placeholder="Tìm khoản chi, ghi chú..." aria-label="Tìm giao dịch"></form>' +
            '<div class="topbar-right">' +
            '<span class="status-pill"><i class="dot"></i>' + semester() + ' • Đang hoạt động</span>' +
            '<button class="icon-btn bell" type="button" aria-label="Thông báo" aria-expanded="false">' + FS.icon('bell') + (notes.length ? '<i class="bell-dot"></i>' : '') + '</button>' +
            '<a href="' + P.settings + '" class="avatar" title="' + FS.escape(me.name) + '">' + initial(me.name) + '</a>' +
            '</div>' +
            '<div class="notify-panel" hidden><h4>Thông báo</h4>' +
            (notes.length ? notes.map(n => '<div class="notify-item"><span>' + n.icon + '</span><div><p>' + n.text + '</p><small>' + n.time + '</small></div></div>').join('')
                : '<div class="notify-item"><p>Không có thông báo mới.</p></div>') + '</div>';

        el.querySelector('.sidebar-toggle').addEventListener('click', () => body.classList.toggle('sidebar-open'));
        const bell = el.querySelector('.bell');
        const panel = el.querySelector('.notify-panel');
        bell.addEventListener('click', e => {
            e.stopPropagation();
            panel.hidden = !panel.hidden;
            bell.setAttribute('aria-expanded', String(!panel.hidden));
        });
        document.addEventListener('click', e => { if (!panel.contains(e.target)) panel.hidden = true; });
    }

    function semester() {
        const m = new Date().getMonth() + 1;
        return m >= 8 ? 'Học kỳ I' : m >= 2 && m <= 6 ? 'Học kỳ II' : 'Học kỳ hè';
    }

    /* ========== 5. UI DÙNG CHUNG ========== */
    FS.toast = function (message, type) {
        let stack = document.querySelector('.toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'toast-stack';
            stack.setAttribute('role', 'status');
            stack.setAttribute('aria-live', 'polite');
            document.body.appendChild(stack);
        }
        const t = document.createElement('div');
        t.className = 'toast ' + (type || '');
        t.innerHTML = FS.icon(type === 'error' ? 'close' : 'check') + '<span>' + FS.escape(message) + '</span>';
        t.querySelector('svg').style.cssText = 'width:18px;height:18px;flex-shrink:0';
        stack.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    };

    // Mở / đóng modal: phần tử .modal-backdrop có id
    FS.openModal = function (id) {
        const m = document.getElementById(id);
        if (!m) return;
        m.hidden = false;
        body.style.overflow = 'hidden';
        const first = m.querySelector('input:not([type=hidden]), select, textarea, button:not(.modal-close)');
        if (first) setTimeout(() => first.focus(), 30);
    };
    FS.closeModal = function (id) {
        const m = typeof id === 'string' ? document.getElementById(id) : id;
        if (!m) return;
        m.hidden = true;
        body.style.overflow = '';
    };
    document.addEventListener('click', e => {
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) FS.closeModal(closeBtn.closest('.modal-backdrop'));
        else if (e.target.classList && e.target.classList.contains('modal-backdrop')) FS.closeModal(e.target);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(m => FS.closeModal(m));
    });

    FS.confirm = function (message, okLabel) {
        return new Promise(resolve => {
            const wrap = document.createElement('div');
            wrap.className = 'modal-backdrop';
            wrap.innerHTML = '<div class="modal" role="alertdialog" aria-modal="true" style="width:min(100%,420px)">' +
                '<h2>Xác nhận</h2><p>' + FS.escape(message) + '</p>' +
                '<div class="modal-actions"><button class="btn btn-outline" data-r="0">Hủy</button>' +
                '<button class="btn btn-danger" data-r="1">' + (okLabel || 'Đồng ý') + '</button></div></div>';
            document.body.appendChild(wrap);
            wrap.querySelector('[data-r="1"]').focus();
            wrap.addEventListener('click', e => {
                const b = e.target.closest('[data-r]');
                if (b || e.target === wrap) { wrap.remove(); resolve(!!(b && b.dataset.r === '1')); }
            });
        });
    };

    // Thông báo trong topbar – tính từ dữ liệu thật của người dùng
    FS.notifications = function () {
        if (!FS.db) return [];
        const list = [];
        const d = FS.db.load();
        const ym = FS.fmt.today().slice(0, 7);
        const s = FS.db.summary(FS.db.byMonth(ym));
        const budget = d.settings.monthlyBudget;
        if (budget && s.chi > budget) list.push({ icon: '⚠️', text: 'Bạn đã chi vượt ngân sách tháng (' + FS.fmt.money(s.chi) + ' / ' + FS.fmt.money(budget) + ').', time: 'Tháng này' });
        else if (budget && s.chi > budget * 0.8) list.push({ icon: '🔔', text: 'Đã dùng ' + Math.round(s.chi / budget * 100) + '% ngân sách tháng. Chi tiêu chậm lại nhé!', time: 'Tháng này' });
        if (!FS.db.transactions().some(t => t.date === FS.fmt.today())) list.push({ icon: '✍️', text: 'Hôm nay bạn chưa ghi chép khoản nào.', time: 'Hôm nay' });
        return list;
    };

    /* ========== 6. KHỞI CHẠY ========== */
    function boot() {
        if (LAYOUT === 'app') {
            const me = FS.auth && FS.auth.current();
            if (!me) {
                location.replace(P.login + '?next=' + encodeURIComponent(location.pathname.split('/').pop()));
                return;
            }
            renderSidebar(me);
            renderTopbar(me);
            body.addEventListener('click', e => {
                const a = e.target.closest('[data-action]');
                if (!a) return;
                if (a.dataset.action === 'logout') {
                    e.preventDefault();
                    FS.auth.logout();
                    location.href = P.login + '?bye=1';
                }
                if (a.dataset.action === 'quick-add') {
                    if (FS.openTxModal) FS.openTxModal();
                    else location.href = P.record + '#them';
                }
            });
        } else {
            renderHeader();
            renderFooter();
        }
        body.classList.add('ready');
    }
    boot();
})();
