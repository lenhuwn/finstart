/* =====================================================================
   TRANG: GHI CHÉP THU CHI – thống kê tháng, bảng, lọc, phân trang,
   thêm/sửa/xóa, ghi chép hàng loạt, xuất báo cáo
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    if (!FS.auth.current()) return;
    const $ = id => document.getElementById(id);
    const PER_PAGE = 10;
    let page = 1;
    let filtered = [];

    function accName(d, id) { return (d.accounts.find(a => a.id === id) || {}).name || '—'; }

    /* ---------- 1. Thống kê ---------- */
    function renderStats() {
        const list = FS.db.byMonth(FS.fmt.today().slice(0, 7));
        const s = FS.db.summary(list);
        $('sumIn').textContent = FS.fmt.money(s.thu);
        $('sumOut').textContent = FS.fmt.money(s.chi);
        $('sumBal').textContent = FS.fmt.money(FS.db.totalAssets());
        $('cntIn').textContent = list.filter(t => t.type === 'thu').length + ' khoản thu';
        $('cntOut').textContent = list.filter(t => t.type === 'chi').length + ' khoản chi';
    }

    /* ---------- 2. Bảng ---------- */
    function applyFilter() {
        const q = $('search').value.trim().toLowerCase();
        const from = $('fromDate').value, to = $('toDate').value;
        const d = FS.db.load();
        filtered = FS.db.transactions().filter(t => {
            if (from && t.date < from) return false;
            if (to && t.date > to) return false;
            if (!q) return true;
            const text = [t.note, FS.category(t.category).name, accName(d, t.accountId), accName(d, t.toAccountId), String(t.amount)].join(' ').toLowerCase();
            return text.includes(q);
        });
    }

    function renderTable() {
        const d = FS.db.load();
        const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
        page = Math.min(page, pages);
        const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

        $('rows').innerHTML = slice.map(t => {
            const c = FS.category(t.category);
            const cls = t.type === 'thu' ? 'money-in' : t.type === 'chi' ? 'money-out' : '';
            const acc = t.type === 'chuyen' ? accName(d, t.accountId) + ' → ' + accName(d, t.toAccountId) : accName(d, t.accountId);
            return `<tr>
              <td class="cell-time"><strong>${FS.fmt.date(t.date)}</strong>${t.time || ''}</td>
              <td><span class="cat-chip ${t.type === 'thu' ? 'thu' : ''}">${c.emoji} ${c.name}</span></td>
              <td>${FS.escape(acc)}</td>
              <td class="cell-note" title="${FS.escape(t.note)}">${FS.escape(t.note || '—')}</td>
              <td class="num ${cls}">${FS.fmt.signed(t.amount, t.type)}</td>
              <td class="actions">
                ${t.type !== 'chuyen' ? `<button class="icon-btn" data-act="edit" data-id="${t.id}" aria-label="Sửa">${FS.icon('edit')}</button>` : ''}
                <button class="icon-btn danger" data-act="delete" data-id="${t.id}" aria-label="Xóa">${FS.icon('trash')}</button>
              </td></tr>`;
        }).join('');
        $('empty').hidden = filtered.length > 0;
        $('pageInfo').textContent = 'Tổng số: ' + filtered.length + ' giao dịch';

        let html = `<span>Trang ${page} / ${pages}</span><button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Trước</button>`;
        for (let i = 1; i <= pages; i++) {
            if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) { if (!html.endsWith('…')) html += '…'; continue; }
            html += `<button data-p="${i}" class="${i === page ? 'current' : ''}">${i}</button>`;
        }
        html += `<button data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>Sau</button>`;
        $('pager').innerHTML = html;
    }

    function refresh(resetPage) {
        if (resetPage) page = 1;
        applyFilter(); renderStats(); renderTable();
    }

    $('pager').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { page = Number(b.dataset.p); renderTable(); } });
    ['search', 'fromDate', 'toDate'].forEach(id => $(id).addEventListener('input', () => refresh(true)));
    $('clearBtn').addEventListener('click', () => { $('search').value = ''; $('fromDate').value = ''; $('toDate').value = ''; refresh(true); });

    $('rows').addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const tx = FS.db.transactions().find(t => t.id === b.dataset.id);
        if (!tx) return;
        if (b.dataset.act === 'edit') FS.openTxModal(tx);
        if (b.dataset.act === 'delete') FS.deleteTxConfirm(tx.id);
    });

    $('addBtn').addEventListener('click', () => FS.openTxModal());
    $('exportBtn').addEventListener('click', () => {
        if (!filtered.length) { FS.toast('Không có dữ liệu để xuất.', 'error'); return; }
        FS.exportExcel(filtered, 'finstart-ghi-chep-' + FS.fmt.today());
        FS.toast('Đã xuất ' + filtered.length + ' giao dịch ra Excel.', 'success');
    });

    /* ---------- 3. Ghi chép hàng loạt ---------- */
    function bulkRow() {
        const accs = FS.db.accounts().map(a => `<option value="${a.id}">${FS.escape(a.name)}</option>`).join('');
        const cats = type => FS.CATEGORIES[type].map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
        const row = document.createElement('div');
        row.className = 'bulk-row';
        row.innerHTML = `
            <select class="select" data-f="type" aria-label="Loại"><option value="chi">Chi</option><option value="thu">Thu</option></select>
            <input class="input" data-f="amount" inputmode="decimal" placeholder="50k" aria-label="Số tiền">
            <select class="select" data-f="category" aria-label="Hạng mục">${cats('chi')}</select>
            <select class="select" data-f="accountId" aria-label="Tài khoản">${accs}</select>
            <input class="input" type="date" data-f="date" value="${FS.fmt.today()}" aria-label="Ngày">
            <input class="input" data-f="note" placeholder="Ghi chú" aria-label="Ghi chú">
            <button type="button" class="icon-btn danger" aria-label="Xóa dòng">${FS.icon('close')}</button>`;
        row.querySelector('[data-f="type"]').addEventListener('change', e => { row.querySelector('[data-f="category"]').innerHTML = cats(e.target.value); });
        row.querySelector('button').addEventListener('click', () => row.remove());
        $('bulkRows').appendChild(row);
    }
    $('bulkBtn').addEventListener('click', () => {
        $('bulkRows').innerHTML = '';
        for (let i = 0; i < 4; i++) bulkRow();
        FS.openModal('bulkModal');
    });
    $('bulkAddRow').addEventListener('click', bulkRow);
    $('bulkForm').addEventListener('submit', e => {
        e.preventDefault();
        const list = [];
        let bad = 0;
        $('bulkRows').querySelectorAll('.bulk-row').forEach(r => {
            const v = f => r.querySelector('[data-f="' + f + '"]').value;
            if (!v('amount').trim()) return;
            const amount = FS.fmt.parseMoney(v('amount'));
            if (isNaN(amount) || amount <= 0) { bad++; r.querySelector('[data-f="amount"]').classList.add('is-invalid'); return; }
            list.push({ type: v('type'), amount, category: v('category'), accountId: v('accountId'), date: v('date') || FS.fmt.today(), note: v('note').trim(), time: FS.fmt.now() });
        });
        if (bad) { FS.toast('Có ' + bad + ' dòng số tiền không hợp lệ.', 'error'); return; }
        if (!list.length) { FS.toast('Chưa nhập giao dịch nào.', 'error'); return; }
        FS.db.saveMany(list);
        FS.closeModal('bulkModal');
        FS.toast('Đã lưu ' + list.length + ' giao dịch.', 'success');
    });

    document.addEventListener('fs:change', () => refresh(false));
    refresh(true);
})();
