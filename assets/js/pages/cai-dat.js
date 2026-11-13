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
        const joined = me.createdAt ? new Date(me.createdAt) : null;
        $('pSince').textContent = joined && !isNaN(joined)
            ? 'Thành viên từ ' + joined.toLocaleDateString('vi-VN')
            : 'Thành viên FinStart';
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

    /* Chuẩn hóa file sao lưu trước khi ghi vào máy: loại bỏ giá trị lạ
       (id chứa ký tự đặc biệt, loại/trạng thái không hợp lệ, số tiền NaN…)
       để dữ liệu hỏng không làm vỡ giao diện các trang. */
    function sanitizeBackup(data) {
        const usedIds = new Set();
        const uniqueId = (raw, prefix) => {
            let id = String(raw == null ? '' : raw).replace(/[^A-Za-z0-9_-]/g, '');
            if (!id) id = prefix + Math.random().toString(36).slice(2, 8);
            while (usedIds.has(id)) id += '-' + Math.random().toString(36).slice(2, 5);
            usedIds.add(id);
            return id;
        };
        const num = (v, fallback) => {
            const n = Number(v);
            return isFinite(n) && n >= 0 ? n : fallback;
        };

        const accounts = data.accounts.map((raw, i) => {
            const a = raw && typeof raw === 'object' ? raw : {};
            return {
                id: uniqueId(a.id, 'acc'),
                name: String(a.name || 'Tài khoản ' + (i + 1)).slice(0, 120),
                type: FS.ACCOUNT_TYPES.includes(a.type) ? a.type : 'Tiền mặt',
                initial: num(a.initial, 0),
                status: ['Đang hoạt động', 'Đang tích lũy', 'Tạm khóa'].includes(a.status) ? a.status : 'Đang hoạt động',
                inReport: a.inReport !== false,
                note: String(a.note == null ? '' : a.note).slice(0, 300)
            };
        });
        if (!accounts.length) {
            accounts.push({ id: uniqueId('', 'acc'), name: 'Ví tiền mặt', type: 'Tiền mặt', initial: 0,
                status: 'Đang hoạt động', inReport: true, note: '' });
        }

        const accIds = new Set(accounts.map(a => a.id));
        const today = FS.fmt.today();
        const transactions = data.transactions.map(raw => {
            const t = raw && typeof raw === 'object' ? raw : {};
            let type = ['thu', 'chi', 'chuyen'].includes(t.type) ? t.type : 'chi';
            const accountId = accIds.has(t.accountId) ? t.accountId : accounts[0].id;
            let toAccountId;
            if (type === 'chuyen') {
                toAccountId = accIds.has(t.toAccountId) ? t.toAccountId : null;
                if (!toAccountId || toAccountId === accountId) type = 'chi'; // chuyển khoản không hợp lệ → ghi là chi
            }
            return {
                id: uniqueId(t.id, 'tx'),
                type,
                amount: isFinite(Math.abs(Number(t.amount))) ? Math.abs(Number(t.amount)) : 0,
                category: String(t.category == null ? 'chi-khac' : t.category).slice(0, 40),
                accountId,
                toAccountId,
                note: String(t.note == null ? '' : t.note).slice(0, 300),
                date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today,
                time: /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) ? t.time : '12:00',
                createdAt: num(t.createdAt, Date.now())
            };
        });

        const s = data.settings && typeof data.settings === 'object' ? data.settings : {};
        return {
            accounts,
            transactions,
            settings: {
                monthlyBudget: num(s.monthlyBudget, 5000000),
                savingGoal: num(s.savingGoal, 3000000),
                savingGoalName: String(s.savingGoalName || 'Quỹ dự phòng').slice(0, 80)
            }
        };
    }

    $('restoreFile').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const json = JSON.parse(reader.result);
                const data = json.data || json;
                if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) throw new Error('File không đúng định dạng sao lưu FinStart.');
                const clean = sanitizeBackup(data);
                if (!(await FS.confirm('Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại bằng ' + clean.transactions.length + ' giao dịch trong file. Tiếp tục?', 'Khôi phục'))) return;
                FS.db.replace(clean);
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

    /* ---------- 6. Chế độ khách: ẩn phần chỉ dành cho tài khoản thật ---------- */
    if (FS.auth.isGuest()) {
        $('bao-mat').hidden = true;
        $('deleteBtn').textContent = 'Thoát chế độ khách';
    }

    document.addEventListener('fs:change', () => { renderStats(); renderBudget(); });
    renderProfile(); renderBudget(); renderStats();
    if (FS.auth.isGuest()) $('sEmail').value = 'Chế độ khách – chưa có email';
})();
