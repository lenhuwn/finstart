/* =====================================================================
   TRANG: CỔNG ĐĂNG NHẬP / ĐĂNG KÝ (dang-nhap.html) + QUÊN MẬT KHẨU
   Mục lục:
     1. Điều hướng sau đăng nhập ("Đích đến")
     2. Tiện ích form (lỗi, hiện mật khẩu, độ mạnh)
     3. Tab Đăng nhập / Đăng ký
     4. Đăng nhập mạng xã hội
     5. Đăng nhập
     6. Đăng ký
     7. Quên mật khẩu
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const params = new URLSearchParams(location.search);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    /* ========== 1. ĐÍCH ĐẾN ========== */
    const DEST = {
        'tong-quan.html': 'Dashboard Tổng quan',
        'tai-khoan.html': 'Tài khoản & ví',
        'ghi-chep.html': 'Ghi chép thu chi',
        'lich-su.html': 'Lịch sử giao dịch',
        'cai-dat.html': 'Cài đặt'
    };
    const next = DEST[params.get('next')] ? params.get('next') : 'tong-quan.html';
    const afterLogin = 'app/' + next;
    document.querySelectorAll('.dest-name').forEach(el => { el.textContent = DEST[next]; });

    FS.ensureDemo();   // tạo sẵn tài khoản demo

    // Đã đăng nhập rồi → vào thẳng bảng điều khiển
    if (FS.auth.current() && document.body.dataset.page !== 'forgot') {
        location.replace(afterLogin);
        return;
    }

    /* ========== 2. TIỆN ÍCH FORM ========== */
    const alertBox = document.getElementById('formAlert');
    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = 'form-alert show ' + (type || 'error');
    }
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
        if (on) { btn.dataset.html = btn.innerHTML; btn.textContent = label || 'Đang xử lý...'; }
        else if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }

    // Nút hiện / ẩn mật khẩu
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            const use = btn.querySelector('use');
            if (use) use.setAttribute('href', show ? '#i-eye-off' : '#i-eye');
            else btn.textContent = show ? '🙈' : '👁';
        });
    });

    // Thanh độ mạnh mật khẩu
    const strength = document.getElementById('strength');
    const strengthInput = document.getElementById('regPassword') || document.getElementById('password');
    if (strength && strengthInput) {
        strengthInput.addEventListener('input', () => {
            const p = strengthInput.value;
            let s = 0;
            if (p.length >= 6) s++;
            if (p.length >= 10) s++;
            if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
            if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
            strength.dataset.level = p ? Math.max(1, s) : 0;
        });
    }

    /* ========== 3. TAB ĐĂNG NHẬP / ĐĂNG KÝ ========== */
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const TEXT = {
        login:    { title: 'Đăng nhập FinStart', lead: 'Truy cập bảng điều khiển tài chính cá nhân của bạn.',
                    asideT: 'Chào mừng bạn quay lại!', asideP: 'Tiếp tục hành trình làm chủ tài chính ngay từ giảng đường.', doc: 'Đăng nhập' },
        register: { title: 'Tạo tài khoản FinStart', lead: 'Miễn phí – không cần thẻ ngân hàng, chưa đầy 1 phút.',
                    asideT: 'Bắt đầu hành trình tự chủ tài chính', asideP: 'Gói Khởi đầu miễn phí trọn đời, thiết kế riêng cho sinh viên Việt Nam.', doc: 'Đăng ký' }
    };
    function setTab(tab, focus) {
        document.querySelectorAll('.auth-tabs [data-tab]').forEach(b => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
        loginForm.hidden = tab !== 'login';
        registerForm.hidden = tab !== 'register';
        const t = TEXT[tab];
        document.getElementById('authTitle').textContent = t.title;
        document.getElementById('authLead').textContent = t.lead;
        document.getElementById('asideTitle').textContent = t.asideT;
        document.getElementById('asideText').textContent = t.asideP;
        document.title = t.doc + ' | FinStart';
        hideAlert();
        // Cập nhật URL để có thể chia sẻ đúng tab
        const q = new URLSearchParams(location.search);
        if (tab === 'register') q.set('tab', 'register'); else q.delete('tab');
        q.delete('bye');
        history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
        if (focus) (tab === 'login' ? loginForm.elements.email : registerForm.elements.name).focus();
    }

    if (loginForm && registerForm) {
        document.querySelector('.auth-tabs').addEventListener('click', e => {
            const b = e.target.closest('[data-tab]');
            if (b) setTab(b.dataset.tab, true);
        });
        const startTab = params.get('tab') === 'register' ? 'register' : 'login';
        setTab(startTab);
        if (params.get('bye')) showAlert('Bạn đã đăng xuất thành công. Hẹn gặp lại!', 'success');
        else if (params.get('next')) showAlert('Vui lòng đăng nhập để vào ' + DEST[next] + '.', 'error');
    }

    /* ========== 4. MẠNG XÃ HỘI ========== */
    // Web tĩnh (GitHub Pages) chưa có máy chủ để xác thực OAuth với Google/Facebook/Apple
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showAlert('Đăng nhập bằng ' + btn.dataset.provider + ' sẽ có ở phiên bản có máy chủ. Hiện tại bạn vui lòng dùng email cá nhân bên dưới.', 'info');
        });
    });

    /* ========== 5. ĐĂNG NHẬP ========== */
    async function doLogin(email, password, remember) {
        busy(loginForm, true, 'Đang đăng nhập...');
        try {
            await FS.ensureDemo();
            const user = await FS.auth.login(email, password, remember);
            showAlert('Xin chào ' + user.name + '! Đang chuyển tới ' + DEST[next] + '...', 'success');
            setTimeout(() => location.replace(afterLogin), 500);
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
            if (ok) doLogin(f.email.value, f.password.value, f.remember.checked);
        });
        document.getElementById('demoBtn').addEventListener('click', () => {
            loginForm.elements.email.value = FS.DEMO.email;
            loginForm.elements.password.value = FS.DEMO.password;
            doLogin(FS.DEMO.email, FS.DEMO.password, true);
        });
    }

    /* ========== 6. ĐĂNG KÝ ========== */
    if (registerForm) {
        const plan = params.get('plan');
        if (plan === 'pro' || plan === 'expert') {
            const note = document.getElementById('planNote');
            note.hidden = false;
            note.textContent = 'Bạn đang đăng ký gói ' + (plan === 'pro' ? 'FinStart PRO' : 'Chuyên sâu') + ' – có thể đổi gói bất cứ lúc nào.';
        }
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            const f = registerForm.elements;
            const name = f.name.value.trim();
            const email = f.email.value.trim();
            const pass = f.password.value;
            let ok = setError(registerForm, 'name', name.length >= 2 ? '' : 'Vui lòng nhập họ tên (ít nhất 2 ký tự).');
            ok = setError(registerForm, 'email', EMAIL_RE.test(email) ? '' : 'Email không hợp lệ.') && ok;
            ok = setError(registerForm, 'password', pass.length >= 6 ? '' : 'Mật khẩu cần ít nhất 6 ký tự.') && ok;
            ok = setError(registerForm, 'confirm', f.confirm.value === pass ? '' : 'Mật khẩu nhập lại không khớp.') && ok;
            ok = setError(registerForm, 'agree', f.agree.checked ? '' : 'Bạn cần đồng ý với điều khoản dịch vụ.') && ok;
            if (!ok) return;

            busy(registerForm, true, 'Đang tạo tài khoản...');
            try {
                await FS.auth.register({ name, email, password: pass, school: f.school.value, sampleData: f.sample.checked });
                if (plan === 'pro' || plan === 'expert') FS.auth.updateProfile({ plan });
                showAlert('Tạo tài khoản thành công! Đang chuyển tới Dashboard Tổng quan...', 'success');
                setTimeout(() => location.replace('app/tong-quan.html'), 700);
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
            ok = setError(forgotForm, 'confirm', f.confirm.value === f.password.value ? '' : 'Mật khẩu nhập lại không khớp.') && ok;
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
