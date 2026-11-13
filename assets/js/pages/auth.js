/* =====================================================================
   TRANG: ĐĂNG NHẬP / ĐĂNG KÝ (dang-nhap.html) + QUÊN MẬT KHẨU
   Mục lục:
     1. Chuẩn bị (trang đích sau đăng nhập)
     2. Tiện ích form
     3. Chế độ khách
     4. Tab Đăng nhập / Đăng ký
     5. Đăng nhập
     6. Đăng ký
     7. Quên mật khẩu
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const params = new URLSearchParams(location.search);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    /* ========== 1. CHUẨN BỊ ========== */
    // Chỉ cho phép chuyển tới các trang trong thư mục app/
    const APP_PAGES = ['tong-quan.html', 'tai-khoan.html', 'ghi-chep.html', 'lich-su.html', 'cai-dat.html'];
    const afterLogin = 'app/' + (APP_PAGES.includes(params.get('next')) ? params.get('next') : 'tong-quan.html');
    const go = () => location.replace(afterLogin);

    FS.ensureDemo();   // tạo sẵn tài khoản mẫu

    // Đã đăng nhập (kể cả khách) → vào thẳng bảng điều khiển
    if (FS.auth.current() && document.body.dataset.page !== 'forgot') { go(); return; }

    /* ========== 2. TIỆN ÍCH FORM ========== */
    const alertBox = document.getElementById('formAlert');
    function showAlert(msg, type) { alertBox.textContent = msg; alertBox.className = 'form-alert show ' + (type || 'error'); }
    function hideAlert() { alertBox.className = 'form-alert'; }
    function setError(form, name, msg) {
        const el = form.querySelector('[data-for="' + name + '"]');
        if (el) el.textContent = msg || '';
        const input = form.elements[name];
        if (input && input.classList) input.classList.toggle('is-invalid', !!msg);
        return !msg;
    }
    function busy(form, on, label) {
        const btn = form.querySelector('[type=submit]');
        btn.disabled = on;
        if (on) { btn.dataset.text = btn.textContent; btn.textContent = label || 'Đang xử lý...'; }
        else if (btn.dataset.text) btn.textContent = btn.dataset.text;
    }

    /* ========== 3. CHẾ ĐỘ KHÁCH ========== */
    const guestBtn = document.getElementById('guestBtn');
    if (guestBtn) {
        guestBtn.addEventListener('click', () => {
            FS.auth.startGuest();
            go();
        });
    }

    /* ========== 4. TAB ========== */
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    function setTab(tab) {
        document.querySelectorAll('.auth-tabs [data-tab]').forEach(b => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
        loginForm.hidden = tab !== 'login';
        registerForm.hidden = tab !== 'register';
        document.getElementById('authTitle').textContent = tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản';
        document.getElementById('authLead').textContent = tab === 'login'
            ? 'Đăng nhập để vào bảng điều khiển tài chính của bạn.'
            : 'Miễn phí, chưa đầy 1 phút. Dữ liệu được lưu lại cho lần sau.';
        document.title = (tab === 'login' ? 'Đăng nhập' : 'Đăng ký') + ' | FinStart';
        hideAlert();
    }
    if (loginForm && registerForm) {
        document.querySelector('.auth-tabs').addEventListener('click', e => {
            const b = e.target.closest('[data-tab]');
            if (b) setTab(b.dataset.tab);
        });
        setTab(params.get('tab') === 'register' ? 'register' : 'login');
        if (params.get('bye')) showAlert('Bạn đã đăng xuất. Hẹn gặp lại!', 'success');
    }

    /* ========== 5. ĐĂNG NHẬP ========== */
    async function doLogin(email, password) {
        busy(loginForm, true, 'Đang đăng nhập...');
        try {
            await FS.ensureDemo();
            await FS.auth.login(email, password, true);
            go();
        } catch (err) {
            showAlert(err.message);
            busy(loginForm, false);
        }
    }
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const f = loginForm.elements;
            let ok = setError(loginForm, 'email', EMAIL_RE.test(f.email.value.trim()) ? '' : 'Email không hợp lệ.');
            ok = setError(loginForm, 'password', f.password.value ? '' : 'Vui lòng nhập mật khẩu.') && ok;
            if (ok) doLogin(f.email.value, f.password.value);
        });
        document.getElementById('demoBtn').addEventListener('click', () => {
            loginForm.elements.email.value = FS.DEMO.email;
            loginForm.elements.password.value = FS.DEMO.password;
            doLogin(FS.DEMO.email, FS.DEMO.password);
        });
    }

    /* ========== 6. ĐĂNG KÝ ========== */
    if (registerForm) {
        const plan = params.get('plan');
        if (plan === 'pro' || plan === 'expert') {
            const note = document.getElementById('planNote');
            note.hidden = false;
            note.textContent = 'Bạn đang chọn gói ' + (plan === 'pro' ? 'FinStart PRO' : 'Chuyên sâu') + '.';
        }
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            const f = registerForm.elements;
            const name = f.name.value.trim();
            const email = f.email.value.trim();
            let ok = setError(registerForm, 'name', name.length >= 2 ? '' : 'Vui lòng nhập họ tên.');
            ok = setError(registerForm, 'email', EMAIL_RE.test(email) ? '' : 'Email không hợp lệ.') && ok;
            ok = setError(registerForm, 'password', f.password.value.length >= 6 ? '' : 'Mật khẩu cần ít nhất 6 ký tự.') && ok;
            if (!ok) return;
            busy(registerForm, true, 'Đang tạo tài khoản...');
            try {
                // Tài khoản mới có sẵn dữ liệu mẫu để dễ làm quen (xóa được trong Cài đặt)
                await FS.auth.register({ name, email, password: f.password.value, sampleData: true });
                if (plan === 'pro' || plan === 'expert') FS.auth.updateProfile({ plan });
                location.replace('app/tong-quan.html');
            } catch (err) {
                showAlert(err.message);
                busy(registerForm, false);
            }
        });
    }

    /* ========== 7. QUÊN MẬT KHẨU ========== */
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async e => {
            e.preventDefault();
            const f = forgotForm.elements;
            let ok = setError(forgotForm, 'email', EMAIL_RE.test(f.email.value.trim()) ? '' : 'Email không hợp lệ.');
            ok = setError(forgotForm, 'name', f.name.value.trim() ? '' : 'Vui lòng nhập họ tên.') && ok;
            ok = setError(forgotForm, 'password', f.password.value.length >= 6 ? '' : 'Mật khẩu cần ít nhất 6 ký tự.') && ok;
            if (!ok) return;
            busy(forgotForm, true);
            try {
                await FS.auth.resetPassword(f.email.value, f.name.value, f.password.value);
                showAlert('Đặt lại mật khẩu thành công! Đang chuyển tới trang đăng nhập...', 'success');
                setTimeout(() => location.replace('dang-nhap.html'), 1200);
            } catch (err) {
                showAlert(err.message);
                busy(forgotForm, false);
            }
        });
    }
})();
