/* =====================================================================
   TRANG: TÀI KHOẢN – danh sách, lọc, thêm/sửa/xóa, chuyển tiền, sao kê
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    if (!FS.auth.current()) return;
    const $ = id => document.getElementById(id);
    const ICON = { 'Tiền mặt': '💵', 'Tài khoản ngân hàng': '🏦', 'Ví điện tử': '📱', 'Sổ tiết kiệm': '🐷' };
    let tab = 'all';

    $('typeFilter').innerHTML += FS.ACCOUNT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    $('accType').innerHTML = FS.ACCOUNT_TYPES.map(t => `<option>${t}</option>`).join('');

    /* ---------- 1. Hiển thị bảng ---------- */
    function render() {
        const d = FS.db.load();
        const q = $('accSearch').value.trim().toLowerCase();
        const type = $('typeFilter').value;
        const rep = $('reportFilter').value;
        const all = d.accounts;

        $('countAll').textContent = all.filter(a => a.status !== 'Tạm khóa').length;
        $('countSaving').textContent = all.filter(a => a.type === 'Sổ tiết kiệm').length;
        $('countLocked').textContent = all.filter(a => a.status === 'Tạm khóa').length;
        $('totalAssets').innerHTML = FS.fmt.money(FS.db.totalAssets()).replace(' đ', '') + ' <small>đ</small>';

        const list = all.filter(a =>
            (tab === 'all' ? a.status !== 'Tạm khóa' : tab === 'saving' ? a.type === 'Sổ tiết kiệm' : a.status === 'Tạm khóa') &&
            (type === 'all' || a.type === type) &&
            (rep === 'all' || (rep === 'yes') === (a.inReport !== false)) &&
            (!q || (a.name + ' ' + (a.note || '')).toLowerCase().includes(q)));

        $('accRows').innerHTML = list.map(a => {
            const bal = FS.db.balance(a.id, d);
            const statusCls = a.status === 'Đang hoạt động' ? 'badge-green' : a.status === 'Đang tích lũy' ? 'badge-blue' : 'badge-red';
            const count = d.transactions.filter(t => t.accountId === a.id || t.toAccountId === a.id).length;
            return `<tr class="${a.inReport === false ? 'is-muted' : ''}">
              <td><div class="acc-name"><span class="acc-icon">${ICON[a.type] || '💳'}</span><div><strong>${FS.escape(a.name)}</strong><small>${FS.escape(a.note || count + ' giao dịch')}</small></div></div></td>
              <td class="num balance ${bal < 0 ? 'negative' : ''}"><strong>${FS.fmt.money(bal)}</strong><small>Ban đầu: ${FS.fmt.money(a.initial)}</small></td>
              <td><span class="badge ${statusCls}">${a.status}</span></td>
              <td>${a.type}</td>
              <td class="actions"><div class="row-actions">
                <button class="btn btn-light" data-act="transfer" data-id="${a.id}">${a.type === 'Sổ tiết kiệm' ? 'Nạp tiền' : 'Chuyển'}</button>
                <button class="btn btn-outline" data-act="statement" data-id="${a.id}">Sao kê</button>
                <button class="btn btn-outline" data-act="edit" data-id="${a.id}">Sửa</button>
                <button class="icon-btn danger" data-act="delete" data-id="${a.id}" aria-label="Xóa ${FS.escape(a.name)}">${FS.icon('trash')}</button>
              </div></td>
            </tr>`;
        }).join('');
        $('accEmpty').hidden = list.length > 0;
        $('accCount').textContent = 'Tổng số: ' + list.length + ' tài khoản';
    }

    /* ---------- 2. Lọc & tab ---------- */
    document.querySelector('.tabs').addEventListener('click', e => {
        const b = e.target.closest('.tab'); if (!b) return;
        tab = b.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => { t.classList.toggle('active', t === b); t.setAttribute('aria-selected', String(t === b)); });
        render();
    });
    ['accSearch', 'typeFilter', 'reportFilter'].forEach(id => $(id).addEventListener('input', render));
    $('resetBtn').addEventListener('click', () => {
        $('accSearch').value = ''; $('typeFilter').value = 'all'; $('reportFilter').value = 'all';
        render();
    });

    /* ---------- 3. Thêm / sửa ---------- */
    const form = $('accForm');
    function openAcc(acc) {
        acc = acc || {};
        form.reset();
        $('accTitle').textContent = acc.id ? 'Sửa tài khoản' : 'Thêm tài khoản';
        form.accId.value = acc.id || '';
        form.accName.value = acc.name || '';
        form.accType.value = acc.type || 'Tiền mặt';
        form.accStatus.value = acc.status || 'Đang hoạt động';
        form.accInitial.value = acc.initial ? Number(acc.initial).toLocaleString('vi-VN') : '';
        form.accNote.value = acc.note || '';
        form.accReport.checked = acc.inReport !== false;
        FS.openModal('accModal');
    }
    $('addBtn').addEventListener('click', () => openAcc());
    form.accType.addEventListener('change', () => { if (form.accType.value === 'Sổ tiết kiệm' && !form.accId.value) form.accStatus.value = 'Đang tích lũy'; });

    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = form.accName.value.trim();
        const initial = form.accInitial.value.trim() ? FS.fmt.parseMoney(form.accInitial.value) : 0;
        if (!name) { FS.toast('Vui lòng nhập tên tài khoản.', 'error'); form.accName.focus(); return; }
        if (isNaN(initial)) { FS.toast('Số dư ban đầu không hợp lệ.', 'error'); return; }
        FS.db.saveAccount({
            id: form.accId.value || undefined, name, initial,
            type: form.accType.value, status: form.accStatus.value,
            note: form.accNote.value.trim(), inReport: form.accReport.checked
        });
        FS.closeModal('accModal');
        FS.toast(form.accId.value ? 'Đã cập nhật tài khoản.' : 'Đã thêm tài khoản mới.', 'success');
    });

    /* ---------- 4. Chuyển tiền ---------- */
    const tf = $('transferForm');
    function openTransfer(fromId) {
        const accs = FS.db.accounts().filter(a => a.status !== 'Tạm khóa');
        if (accs.length < 2) { FS.toast('Cần ít nhất 2 tài khoản để chuyển tiền.', 'error'); return; }
        const opts = accs.map(a => `<option value="${a.id}">${FS.escape(a.name)} (${FS.fmt.money(FS.db.balance(a.id))})</option>`).join('');
        tf.from.innerHTML = opts; tf.to.innerHTML = opts;
        tf.reset();
        const target = FS.db.account(fromId);
        if (target && target.type === 'Sổ tiết kiệm') {   // "Nạp tiền" vào sổ tiết kiệm
            tf.to.value = fromId;
            tf.from.value = accs.find(a => a.id !== fromId).id;
            tf.note.value = 'Trích quỹ tiết kiệm';
        } else {
            if (fromId) tf.from.value = fromId;
            tf.to.value = (accs.find(a => a.id !== tf.from.value) || {}).id;
        }
        tf.date.value = FS.fmt.today();
        FS.openModal('transferModal');
    }
    $('transferBtn').addEventListener('click', () => openTransfer());
    tf.addEventListener('submit', e => {
        e.preventDefault();
        const amount = FS.fmt.parseMoney(tf.amount.value);
        if (isNaN(amount) || amount <= 0) { FS.toast('Số tiền không hợp lệ.', 'error'); return; }
        try {
            FS.db.transfer(tf.from.value, tf.to.value, amount, tf.note.value.trim(), tf.date.value);
            FS.closeModal('transferModal');
            FS.toast('Đã chuyển ' + FS.fmt.money(amount) + '.', 'success');
        } catch (err) { FS.toast(err.message, 'error'); }
    });

    /* ---------- 5. Hành động trên từng dòng ---------- */
    $('accRows').addEventListener('click', async e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const acc = FS.db.account(b.dataset.id);
        if (!acc) return;
        if (b.dataset.act === 'edit') openAcc(acc);
        if (b.dataset.act === 'transfer') openTransfer(acc.id);
        if (b.dataset.act === 'statement') {
            const list = FS.db.transactions().filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
            if (!list.length) { FS.toast('Tài khoản chưa có giao dịch.', 'error'); return; }
            FS.exportCSV(list, 'sao-ke-' + acc.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-'));
            FS.toast('Đã tải sao kê ' + acc.name + '.', 'success');
        }
        if (b.dataset.act === 'delete') {
            if (!(await FS.confirm('Xóa tài khoản "' + acc.name + '"?', 'Xóa'))) return;
            try { FS.db.deleteAccount(acc.id); FS.toast('Đã xóa tài khoản.', 'success'); }
            catch (err) { FS.toast(err.message, 'error'); }
        }
    });

    document.addEventListener('fs:change', render);
    render();
})();
