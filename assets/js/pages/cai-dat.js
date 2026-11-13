/* =====================================================================
   TRANG: CÀI ĐẶT – hồ sơ, ngân sách, mật khẩu, sao lưu, xóa tài khoản
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    if (!FS.auth.current()) return;
    const $ = id => document.getElementById(id);
    const PLAN = { free: 'Gói Khởi đầu', pro: 'FinStart PRO', expert: 'Gói Chuyên sâu' };
    const fmtNum = n => Number(n || 0).toLocaleString('vi-VN');

    /* ---------- 1. Hồ sơ ---------- */
    function renderProfile() {
        const me = FS.auth.current();
        $('bigAvatar').textContent = FS.initial(me.name);
        $('pName').textContent = me.name;
        $('pSince').textContent = 'Thành viên từ ' + new Date(me.createdAt).toLocaleDateString('vi-VN');
        $('planBadge').textContent = PLAN[me.plan || 'free'];
        const f = $('profileForm');
        f.fullName.value = me.name;
        f.school.value = me.school || '';
        $('sEmail').value = me.email;
    }
    $('profileForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        const name = f.fullName.value.trim();
        if (name.length < 2) { FS.toast('Họ tên cần ít nhất 2 ký tự.', 'error'); return; }
        FS.auth.updateProfile({ name, school: f.school.value.trim() });
        FS.toast('Đã lưu hồ sơ.', 'success');
        setTimeout(() => location.reload(), 600); // cập nhật tên trên sidebar
    });

    /* ---------- 2. Ngân sách & mục tiêu ---------- */
    function renderBudget() {
        const s = FS.db.load().settings;
        const f = $('budgetForm');
        f.budget.value = fmtNum(s.monthlyBudget);
        f.goal.value = fmtNum(s.savingGoal);
        f.goalName.value = s.savingGoalName || '';
    }
    $('budgetForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        const budget = FS.fmt.parseMoney(f.budget.value || '0');
        const goal = FS.fmt.parseMoney(f.goal.value || '0');
        if (isNaN(budget) || isNaN(goal) || budget < 0 || goal < 0) { FS.toast('Số tiền không hợp lệ.', 'error'); return; }
        const d = FS.db.load();
        d.settings.monthlyBudget = budget;
        d.settings.savingGoal = goal;
        d.settings.savingGoalName = f.goalName.value.trim() || 'Quỹ dự phòng';
        FS.db.save(d);
        renderBudget();
        FS.toast('Đã lưu ngân sách & mục tiêu.', 'success');
    });

    /* ---------- 3. Mật khẩu ---------- */
    $('passForm').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        if (f.newPass.value.length < 6) return FS.toast('Mật khẩu mới cần ít nhất 6 ký tự.', 'error');
        if (f.newPass.value !== f.newPass2.value) return FS.toast('Mật khẩu nhập lại không khớp.', 'error');
        try {
            await FS.auth.changePassword(f.oldPass.value, f.newPass.value);
            f.reset();
            FS.toast('Đổi mật khẩu thành công.', 'success');
        } catch (err) { FS.toast(err.message, 'error'); }
    });

    /* ---------- 4. Dữ liệu ---------- */
    function renderStats() {
        const d = FS.db.load();
        $('dataStats').textContent = 'Bạn đang có ' + d.accounts.length + ' tài khoản và ' + d.transactions.length +
            ' giao dịch. Dữ liệu được lưu trên trình duyệt này – hãy tải bản sao lưu định kỳ.';
    }
    $('backupBtn').addEventListener('click', () => {
        const me = FS.auth.current();
        const payload = { app: 'FinStart', version: 1, exportedAt: new Date().toISOString(), user: { name: me.name, email: me.email }, data: FS.db.load() };
        FS.download(JSON.stringify(payload, null, 2), 'finstart-sao-luu-' + FS.fmt.today() + '.json', 'application/json');
        FS.toast('Đã tải bản sao lưu.', 'success');
    });
    $('restoreFile').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const json = JSON.parse(reader.result);
                const data = json.data || json;
                if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) throw new Error('File không đúng định dạng sao lưu FinStart.');
                if (!(await FS.confirm('Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại bằng ' + data.transactions.length + ' giao dịch trong file. Tiếp tục?', 'Khôi phục'))) return;
                FS.db.replace(data);
                FS.toast('Khôi phục dữ liệu thành công.', 'success');
            } catch (err) { FS.toast(err.message || 'Không đọc được file.', 'error'); }
            e.target.value = '';
        };
        reader.readAsText(file);
    });
    $('exportAllBtn').addEventListener('click', () => {
        const list = FS.db.transactions();
        if (!list.length) return FS.toast('Chưa có giao dịch để xuất.', 'error');
        FS.exportExcel(list, 'finstart-toan-bo-giao-dich');
        FS.toast('Đã xuất ' + list.length + ' giao dịch.', 'success');
    });
    $('sampleBtn').addEventListener('click', async () => {
        if (!(await FS.confirm('Thay dữ liệu hiện tại bằng dữ liệu mẫu (3 tháng gần nhất)?', 'Nạp dữ liệu mẫu'))) return;
        FS.db.reset(true);
        FS.toast('Đã nạp dữ liệu mẫu.', 'success');
    });

    /* ---------- 5. Vùng nguy hiểm ---------- */
    $('clearBtn').addEventListener('click', async () => {
        if (!(await FS.confirm('Xóa TOÀN BỘ giao dịch? Các tài khoản / ví vẫn được giữ lại.', 'Xóa tất cả'))) return;
        const d = FS.db.load();
        d.transactions = [];
        FS.db.save(d);
        FS.toast('Đã xóa toàn bộ giao dịch.', 'success');
    });
    $('deleteBtn').addEventListener('click', async () => {
        if (!(await FS.confirm('Xóa vĩnh viễn tài khoản FinStart và mọi dữ liệu? Không thể hoàn tác.', 'Xóa tài khoản'))) return;
        FS.auth.deleteAccount();
        location.replace('../../index.html');
    });

    document.addEventListener('fs:change', () => { renderStats(); renderBudget(); });
    renderProfile(); renderBudget(); renderStats();
})();
