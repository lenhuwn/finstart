/* =====================================================================
   TRANG: ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU
   Mục lục:
     1. Tiện ích kiểm tra form
     2. Đăng nhập
     3. Đăng ký
     4. Quên mật khẩu
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const params = new URLSearchParams(location.search);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Trang sẽ chuyển tới sau khi đăng nhập (chỉ cho phép trang nội bộ trong app/)
    const next = params.get('next');
    const afterLogin = next && /^[a-z-]+\.html$/.test(next) ? 'app/' + next : 'app/tong-quan.html';

    // Tạo sẵn tài khoản demo
    FS.ensureDemo();

    // Đã đăng nhập rồi → vào thẳng bảng điều khiển
    if (FS.auth.current() && document.body.dataset.page !== 'forgot') {
        location.replace(afterLogin);
        return;
    }

    /* ========== 1. TIỆN ÍCH ========== */
    const alertBox = document.getElementById('formAlert');
    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = 'form-alert show ' + (type || 'error');
    }
    function setError(form, name, msg) {
        const el = form.querySelector('[data-for="' + name + '"]');
        if (el) el.textContent = msg || '';
        const input = form.elements[name];
        if (input && input.classList) input.classList.toggle('is-invalid', !!msg);
        return !msg;
    }
    function strengthLevel(p) {
        let s = 0;
        if (p.length >= 6) s++;
        if (p.length >= 10) s++;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
        if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
        return p ? Math.max(1, s) : 0;
    }

    // Nút hiện / ẩn mật khẩu
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            btn.textContent = show ? '🙈' : '👁';
        });
    });

    const strength = document.getElementById('strength');
    const passInput = document.getElementById('password');
    if (strength && passInput) {
        passInput.addEventListener('input', () => { strength.dataset.level = strengthLevel(passInput.value); });
    }

    function busy(form, on, label) {
        const btn = form.querySelector('[type=submit]');
        btn.disabled = on;
        if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Đang xử lý...'; }
        else if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }

    /* ========== 2. ĐĂNG NHẬP ========== */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if (params.get('bye')) showAlert('Bạn đã đăng xuất thành công. Hẹn gặp lại!', 'success');
        if (params.get('next')) showAlert('Vui lòng đăng nhập để tiếp tục.', 'error');

        async function doLogin(email, password, remember) {
            busy(loginForm, true, 'Đang đăng nhập...');
            try {
                await FS.ensureDemo();
                const user = await FS.auth.login(email, password, remember);
                showAlert('Xin chào ' + user.name + '! Đang chuyển tới bảng điều khiển...', 'success');
                setTimeout(() => location.replace(afterLogin), 500);
            } catch (err) {
                showAlert(err.message);
                busy(loginForm, false);
            }
        }

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

    /* ========== 3. ĐĂNG KÝ ========== */
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const plan = params.get('plan');
        if (plan === 'pro' || plan === 'expert') {
            document.getElementById('planNote').textContent =
                'Bạn đang đăng ký gói ' + (plan === 'pro' ? 'FinStart PRO' : 'Chuyên sâu') + '. Có thể đổi gói bất cứ lúc nào.';
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
                showAlert('Tạo tài khoản thành công! Đang chuyển tới bảng điều khiển...', 'success');
                setTimeout(() => location.replace('app/tong-quan.html'), 700);
            } catch (err) {
                showAlert(err.message);
                busy(registerForm, false);
            }
        });
    }

    /* ========== 4. QUÊN MẬT KHẨU ========== */
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
