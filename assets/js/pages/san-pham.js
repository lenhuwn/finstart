/* =====================================================================
   TRANG: SẢN PHẨM – tính mục tiêu tiết kiệm + nâng cấp gói
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;

    /* ---------- 1. Tính mục tiêu tiết kiệm ---------- */
    const amountEl = document.getElementById('goalAmount');
    const monthsEl = document.getElementById('goalMonths');
    function calc() {
        const amount = FS.fmt.parseMoney(amountEl.value) || 0;
        const months = Math.max(1, parseInt(monthsEl.value, 10) || 1);
        const perMonth = amount / months;
        const perDay = amount / (months * 365 / 12);
        document.getElementById('goalPerDay').textContent = FS.fmt.money(perDay);
        document.getElementById('goalPerMonth').textContent = '≈ ' + FS.fmt.money(perMonth) + ' / tháng';
    }
    amountEl.addEventListener('input', calc);
    monthsEl.addEventListener('input', calc);
    amountEl.addEventListener('blur', () => { const n = FS.fmt.parseMoney(amountEl.value); if (n > 0) amountEl.value = n.toLocaleString('vi-VN'); });
    calc();

    /* ---------- 2. Nâng cấp gói ---------- */
    const PLANS = { free: 'Sinh viên Khởi đầu', pro: 'FinStart PRO', expert: 'Gói Chuyên sâu' };
    const me = FS.auth.current();
    let chosen = null;

    if (me) {
        const current = document.querySelector('[data-plan="' + (me.plan || 'free') + '"]');
        if (current) {
            current.closest('.plan').classList.add('is-current');
            current.textContent = 'Gói hiện tại của bạn';
            current.setAttribute('aria-disabled', 'true');
        }
    }

    document.querySelectorAll('[data-plan]').forEach(btn => {
        btn.addEventListener('click', e => {
            if (!me) return; // chưa đăng nhập → đi tới trang Đăng ký như bình thường
            e.preventDefault();
            chosen = btn.dataset.plan;
            // Gói hiện tại: không mở popup, cũng không chuyển trang
            if (chosen === (me.plan || 'free')) return;
            document.getElementById('planText').textContent =
                'Chuyển sang gói "' + PLANS[chosen] + '". Đây là bản demo của đồ án nên không phát sinh thanh toán thật.';
            FS.openModal('planModal');
        });
    });

    document.getElementById('planConfirm').addEventListener('click', () => {
        FS.auth.updateProfile({ plan: chosen });
        FS.closeModal('planModal');
        FS.toast('Đã chuyển sang gói ' + PLANS[chosen] + '!', 'success');
        setTimeout(() => location.reload(), 900);
    });
})();
