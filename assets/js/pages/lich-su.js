/* =====================================================================
   TRANG: LỊCH SỬ GIAO DỊCH – lọc nhiều tiêu chí, nhóm theo ngày
   (thu gọn / mở rộng), phân trang, xuất CSV / Excel
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    if (!FS.auth.current()) return;
    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const collapsed = new Set();
    let page = 1;
    let filtered = [];

    /* ---------- 1. Đổ dữ liệu cho bộ lọc ---------- */
    function fillFilters() {
        const keep = { m: $('monthFilter').value, a: $('accFilter').value };
        $('monthFilter').innerHTML = '<option value="all">Tất cả các tháng</option>' +
            FS.db.months().map(m => `<option value="${m}">${FS.fmt.month(m)}</option>`).join('');
        $('monthFilter').value = keep.m || (params.get('q') ? 'all' : FS.fmt.today().slice(0, 7));
        $('accFilter').innerHTML = '<option value="all">Tất cả tài khoản</option>' +
            FS.db.accounts().map(a => `<option value="${a.id}">${FS.escape(a.name)}</option>`).join('');
        $('accFilter').value = keep.a && $('accFilter').querySelector(`option[value="${keep.a}"]`) ? keep.a : 'all';
    }
    $('catFilter').innerHTML += '<optgroup label="Khoản chi">' + FS.CATEGORIES.chi.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('') + '</optgroup>' +
        '<optgroup label="Khoản thu">' + FS.CATEGORIES.thu.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('') + '</optgroup>';
    if (params.get('q')) $('search').value = params.get('q');

    /* ---------- 2. Lọc ---------- */
    function applyFilter() {
        const d = FS.db.load();
        const name = id => (d.accounts.find(a => a.id === id) || {}).name || '';
        const q = $('search').value.trim().toLowerCase();
        const m = $('monthFilter').value, type = $('typeFilter').value, cat = $('catFilter').value, acc = $('accFilter').value;
        filtered = FS.db.transactions().filter(t =>
            (m === 'all' || t.date.slice(0, 7) === m) &&
            (type === 'all' || t.type === type) &&
            (cat === 'all' || t.category === cat) &&
            (acc === 'all' || t.accountId === acc || t.toAccountId === acc) &&
            (!q || [t.note, FS.category(t.category).name, name(t.accountId), name(t.toAccountId), t.amount].join(' ').toLowerCase().includes(q)));
    }

    /* ---------- 3. Vẽ bảng nhóm theo ngày ---------- */
    function render() {
        const d = FS.db.load();
        const name = id => (d.accounts.find(a => a.id === id) || {}).name || '—';
        const per = Number($('perPage').value);
        const pages = Math.max(1, Math.ceil(filtered.length / per));
        page = Math.min(page, pages);
        const slice = filtered.slice((page - 1) * per, page * per);

        const s = FS.db.summary(filtered);
        $('tIn').textContent = '+' + FS.fmt.money(s.thu);
        $('tOut').textContent = '-' + FS.fmt.money(s.chi);
        $('tNet').textContent = FS.fmt.signed(s.net, s.net >= 0 ? 'thu' : 'chi');
        $('tNet').className = s.net >= 0 ? 'money-in' : 'money-out';
        $('count').textContent = 'Tổng số: ' + filtered.length + ' giao dịch';

        // Nhóm theo ngày
        const groups = [];
        slice.forEach(t => {
            let g = groups[groups.length - 1];
            if (!g || g.date !== t.date) { g = { date: t.date, items: [] }; groups.push(g); }
            g.items.push(t);
        });

        const table = $('historyTable');
        table.querySelectorAll('tbody').forEach(b => b.remove());
        groups.forEach(g => {
            const day = FS.db.summary(filtered.filter(t => t.date === g.date));
            const tb = document.createElement('tbody');
            if (collapsed.has(g.date)) tb.classList.add('collapsed');
            tb.innerHTML = `<tr class="day-row"><th colspan="6" scope="rowgroup"><div class="day-group">
                <button class="day-toggle" type="button" data-date="${g.date}" aria-expanded="${!collapsed.has(g.date)}">${FS.icon('chevron')}<time datetime="${g.date}">${dayLabel(g.date)}</time></button>
                <p>Thu: <span class="money-in">${FS.fmt.money(day.thu)}</span> | Chi: <span class="money-out">-${FS.fmt.money(day.chi)}</span></p>
              </div></th></tr>` +
                g.items.map(t => {
                    const c = FS.category(t.category);
                    const cls = t.type === 'thu' ? 'money-in' : t.type === 'chi' ? 'money-out' : '';
                    return `<tr>
                      <td><span class="cat-chip ${t.type === 'thu' ? 'thu' : ''}">${c.emoji} ${c.name}</span></td>
                      <td class="num ${cls}">${FS.fmt.signed(t.amount, t.type)}</td>
                      <td>${FS.escape(t.type === 'chuyen' ? name(t.accountId) + ' → ' + name(t.toAccountId) : name(t.accountId))}</td>
                      <td class="cell-note">${FS.escape(t.note || '—')}</td>
                      <td class="cell-time">${t.time || ''}</td>
                      <td class="actions">
                        ${t.type !== 'chuyen' ? `<button class="icon-btn" data-act="edit" data-id="${t.id}" aria-label="Sửa">${FS.icon('edit')}</button>` : ''}
                        <button class="icon-btn danger" data-act="delete" data-id="${t.id}" aria-label="Xóa">${FS.icon('trash')}</button>
                      </td></tr>`;
                }).join('');
            table.appendChild(tb);
        });
        $('empty').hidden = filtered.length > 0;

        $('pager').innerHTML = `<span>Trang ${page} / ${pages}</span>` +
            `<button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Trước</button>` +
            `<button class="current">${page}</button>` +
            `<button data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>Sau</button>`;
    }

    function dayLabel(iso) {
        const today = FS.fmt.today();
        const y = new Date(); y.setDate(y.getDate() - 1);
        if (iso === today) return 'Hôm nay – ' + FS.fmt.date(iso);
        if (iso === FS.fmt.iso(y)) return 'Hôm qua – ' + FS.fmt.date(iso);
        return FS.fmt.date(iso);
    }

    function refresh(resetPage) {
        if (resetPage) page = 1;
        applyFilter(); render();
    }

    /* ---------- 4. Sự kiện ---------- */
    ['search', 'monthFilter', 'typeFilter', 'catFilter', 'accFilter', 'perPage'].forEach(id => $(id).addEventListener('input', () => refresh(true)));
    $('pager').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { page = Number(b.dataset.p); render(); } });

    $('historyTable').addEventListener('click', e => {
        const tog = e.target.closest('.day-toggle');
        if (tog) {
            const date = tog.dataset.date;
            const isCollapsed = tog.closest('tbody').classList.toggle('collapsed');
            if (isCollapsed) collapsed.add(date); else collapsed.delete(date);
            tog.setAttribute('aria-expanded', String(!isCollapsed));
            return;
        }
        const b = e.target.closest('[data-act]'); if (!b) return;
        const tx = FS.db.transactions().find(t => t.id === b.dataset.id);
        if (!tx) return;
        if (b.dataset.act === 'edit') FS.openTxModal(tx);
        if (b.dataset.act === 'delete') FS.deleteTxConfirm(tx.id);
    });

    $('addBtn').addEventListener('click', () => FS.openTxModal());
    function fileName() { const m = $('monthFilter').value; return 'finstart-lich-su-' + (m === 'all' ? 'tat-ca' : m); }
    $('csvBtn').addEventListener('click', () => {
        if (!filtered.length) return FS.toast('Không có dữ liệu để xuất.', 'error');
        FS.exportCSV(filtered, fileName()); FS.toast('Đã xuất file CSV.', 'success');
    });
    $('xlsBtn').addEventListener('click', () => {
        if (!filtered.length) return FS.toast('Không có dữ liệu để xuất.', 'error');
        FS.exportExcel(filtered, fileName()); FS.toast('Đã xuất file Excel.', 'success');
    });

    document.addEventListener('fs:change', () => { fillFilters(); refresh(false); });
    fillFilters();
    refresh(true);
})();
