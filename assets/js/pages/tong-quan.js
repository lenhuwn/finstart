/* =====================================================================
   TRANG: TỔNG QUAN – số liệu tháng, ghi chép nhanh, 50/30/20,
   biểu đồ 6 tháng, hạng mục, giao dịch gần đây, mục tiêu tiết kiệm
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const me = FS.auth.current();
    if (!me) return;
    const $ = id => document.getElementById(id);
    const money = FS.fmt.money;
    let month = FS.fmt.today().slice(0, 7);

    /* ---------- Lời chào theo giờ ---------- */
    const h = new Date().getHours();
    const buoi = h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    $('greeting').textContent = buoi + ', ' + me.name.split(' ').pop() + '! Bạn đã sẵn sàng tiết kiệm chưa?';

    function prevMonth(ym, n) {
        const [y, m] = ym.split('-').map(Number);
        // n = 0 phải giữ nguyên tháng hiện tại (trước đây dùng (n || 1) nên bị lùi 1 tháng)
        const step = n === undefined ? 1 : n;
        const d = new Date(y, m - 1 - step, 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    function fillMonths() {
        $('monthSelect').innerHTML = FS.db.months().map(m => `<option value="${m}"${m === month ? ' selected' : ''}>${FS.fmt.month(m)}</option>`).join('');
    }

    /* ---------- 1. Thẻ tóm tắt ---------- */
    function renderStats() {
        const d = FS.db.load();
        const list = FS.db.byMonth(month);
        const s = FS.db.summary(list);
        const prev = FS.db.summary(FS.db.byMonth(prevMonth(month)));
        $('periodBadge').textContent = 'Kỳ ' + FS.fmt.month(month);

        $('incomeValue').innerHTML = money(s.thu).replace(' đ', '') + ' <small>VNĐ</small>';
        const sources = {};
        list.filter(t => t.type === 'thu').forEach(t => { sources[t.category] = (sources[t.category] || 0) + t.amount; });
        $('incomeDesc').textContent = Object.keys(sources).length
            ? 'Nguồn: ' + Object.entries(sources).map(([c, v]) => FS.category(c).name + ' (' + FS.fmt.short(v) + ')').join(', ')
            : 'Chưa có khoản thu nào trong tháng.';
        trend($('incomeTrend'), s.thu, prev.thu, false);

        $('expenseValue').innerHTML = money(s.chi).replace(' đ', '') + ' <small>VNĐ</small>';
        const budget = d.settings.monthlyBudget || 0;
        const pct = budget ? s.chi / budget * 100 : 0;
        $('expenseDesc').textContent = budget ? 'Đã dùng ' + pct.toFixed(1) + '% ngân sách ' + money(budget) : 'Chưa đặt ngân sách tháng (vào Cài đặt).';
        $('budgetBar').style.width = Math.min(100, pct) + '%';
        $('budgetBar').style.background = pct > 100 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : 'var(--primary)';
        trend($('expenseTrend'), s.chi, prev.chi, true);

        const total = FS.db.totalAssets();
        $('balanceValue').innerHTML = money(total).replace(' đ', '') + ' <small>VNĐ</small>';
        const tag = $('balanceTag');
        const safe = total >= (budget || 0) * 0.5;
        tag.textContent = safe ? 'An toàn' : total > 0 ? 'Cần chú ý' : total < 0 ? 'Âm quỹ' : 'Chưa có số dư';
        tag.className = 'badge ' + (safe ? 'badge-green' : total > 0 ? 'badge-yellow' : 'badge-red');
    }

    function trend(el, cur, prev, lowerIsGood) {
        if (!prev) { el.textContent = 'Tháng đầu'; el.className = 'badge'; return; }
        const p = Math.round((cur - prev) / prev * 100);
        const good = lowerIsGood ? p <= 0 : p >= 0;
        el.textContent = (p > 0 ? '+' : '') + p + '% so với tháng trước';
        el.className = 'badge ' + (good ? 'badge-green' : 'badge-red');
    }

    /* ---------- 2. Ghi chép nhanh ---------- */
    const qf = $('quickForm');
    let qType = 'chi';
    function fillQuick() {
        qf.category.innerHTML = FS.CATEGORIES[qType].map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
        const sel = qf.accountId.value;
        qf.accountId.innerHTML = FS.db.accounts().map(a => `<option value="${a.id}"${a.id === sel ? ' selected' : ''}>${FS.escape(a.name)}</option>`).join('');
        if (!qf.date.value) qf.date.value = FS.fmt.today();
    }
    $('quickType').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        qType = b.dataset.value;
        $('quickType').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        fillQuick();
    });
    qf.addEventListener('submit', e => {
        e.preventDefault();
        const amount = FS.fmt.parseMoney(qf.amount.value);
        if (isNaN(amount) || amount <= 0) { FS.toast('Vui lòng nhập số tiền hợp lệ.', 'error'); qf.amount.focus(); return; }
        if (!qf.accountId.value) { FS.toast('Hãy tạo tài khoản / ví trước.', 'error'); return; }
        FS.db.saveTx({ type: qType, amount, category: qf.category.value, accountId: qf.accountId.value, note: qf.note.value.trim(), date: qf.date.value || FS.fmt.today(), time: FS.fmt.now() });
        qf.amount.value = ''; qf.note.value = '';
        FS.toast('Đã thêm giao dịch ' + FS.fmt.signed(amount, qType), 'success');
    });

    /* ---------- 3. Phân bổ 50/30/20 ---------- */
    function renderAlloc() {
        const list = FS.db.byMonth(month);
        const s = FS.db.summary(list);
        const needs = list.filter(t => t.type === 'chi' && FS.category(t.category).group === 'thiet-yeu').reduce((a, t) => a + t.amount, 0);
        const wants = s.chi - needs;
        const save = Math.max(0, s.thu - s.chi);
        const base = s.thu || 1;
        $('allocMonth').textContent = FS.fmt.month(month);
        $('allocSpent').textContent = money(s.chi);
        const rows = [
            { name: 'Thiết yếu (Trọ, Ăn, Học, Đi lại)', value: needs, target: 50, color: 'var(--ink)' },
            { name: 'Giải trí & Bản thân', value: wants, target: 30, color: '#3a3f9a' },
            { name: 'Tích lũy & Mục tiêu', value: save, target: 20, color: 'var(--primary-light)' }
        ];
        $('allocList').innerHTML = rows.map(r => {
            const p = s.thu ? r.value / base * 100 : 0;
            return `<div class="alloc-item">
                <div class="alloc-title"><span>${r.name}</span><small><b>${p.toFixed(0)}%</b> / mục tiêu ${r.target}% • ${money(r.value)}</small></div>
                <div class="progress" title="Mục tiêu ${r.target}%"><span style="width:${Math.min(100, p)}%;background:${r.color}"></span><i class="target" style="left:${r.target}%"></i></div>
              </div>`;
        }).join('');

        const box = $('allocAlert');
        if (!s.thu) {
            box.className = 'alert-box warning';
            box.innerHTML = '<strong>Chưa có thu nhập trong tháng</strong><p>Ghi lại khoản thu (trợ cấp, lương part-time...) để FinStart tính tỷ lệ phân bổ.</p>';
        } else if (needs / base <= 0.55 && wants / base <= 0.32 && save / base >= 0.18) {
            box.className = 'alert-box success';
            box.innerHTML = '<strong>Bạn đang duy trì tỷ lệ 50-30-20 rất chuẩn xác!</strong><p>Giữ vững phong độ này thêm 3 tháng để hoàn thành Quỹ Dự phòng.</p>';
        } else {
            const tip = wants / base > 0.32 ? 'Khoản giải trí & mua sắm đang vượt 30% – thử áp dụng quy tắc 48 giờ trước khi mua.'
                : needs / base > 0.55 ? 'Chi thiết yếu đang cao – cân nhắc nấu ăn theo tuần hoặc ở ghép để giảm chi phí.'
                : 'Phần tích lũy dưới 20% – hãy trích tiết kiệm ngay khi nhận tiền.';
            box.className = 'alert-box warning';
            box.innerHTML = '<strong>Tỷ lệ chưa cân bằng</strong><p>' + tip + '</p>';
        }
    }

    /* ---------- 4. Biểu đồ 6 tháng ---------- */
    function renderChart() {
        const months = [];
        for (let i = 5; i >= 0; i--) months.push(prevMonth(month, i));
        const data = months.map(m => Object.assign({ m }, FS.db.summary(FS.db.byMonth(m))));
        const max = Math.max(1, ...data.map(x => Math.max(x.thu, x.chi)));
        const chart = $('barChart');
        chart.innerHTML = data.map((x, i) => `
            <div class="bar-group" tabindex="0" data-i="${i}" aria-label="${FS.fmt.month(x.m)}: thu ${money(x.thu)}, chi ${money(x.chi)}">
              <div class="bar in" style="height:${x.thu / max * 100}%"></div>
              <div class="bar out" style="height:${x.chi / max * 100}%"></div>
              <span class="bar-label">T${x.m.slice(5)}</span>
            </div>`).join('');

        const tip = $('chartTip');
        const show = (el, e) => {
            const x = data[el.dataset.i];
            tip.innerHTML = `<b>${FS.fmt.month(x.m)}</b>Thu: ${money(x.thu)}<br>Chi: ${money(x.chi)}<br>Chênh lệch: ${FS.fmt.signed(x.net, x.net >= 0 ? 'thu' : 'chi')}`;
            tip.hidden = false;
            const r = el.getBoundingClientRect();
            const px = e && e.clientX ? e.clientX : r.left + r.width / 2;
            tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, px + 12) + 'px';
            tip.style.top = (e && e.clientY ? e.clientY : r.top) - tip.offsetHeight - 12 + 'px';
        };
        chart.querySelectorAll('.bar-group').forEach(g => {
            g.addEventListener('mousemove', e => show(g, e));
            g.addEventListener('focus', () => show(g));
            g.addEventListener('mouseleave', () => { tip.hidden = true; });
            g.addEventListener('blur', () => { tip.hidden = true; });
        });
    }

    /* ---------- 5. Hạng mục ---------- */
    function renderCats() {
        const sums = {};
        FS.db.byMonth(month).filter(t => t.type === 'chi').forEach(t => { sums[t.category] = (sums[t.category] || 0) + t.amount; });
        const rows = Object.entries(sums).sort((a, b) => b[1] - a[1]);
        const total = rows.reduce((a, r) => a + r[1], 0) || 1;
        $('catList').innerHTML = rows.length ? rows.map(([c, v]) => {
            const cat = FS.category(c);
            return `<li><span class="emoji">${cat.emoji}</span><span class="name">${cat.name}</span><span class="amt">${money(v)} <small class="text-muted">${Math.round(v / total * 100)}%</small></span>
                <div class="progress"><span style="width:${v / rows[0][1] * 100}%"></span></div></li>`;
        }).join('') : '<li class="empty-state" style="display:block"><strong>Chưa có khoản chi</strong>Tháng này bạn chưa ghi khoản chi nào.</li>';
    }

    /* ---------- 6. Giao dịch gần đây ---------- */
    function renderRecent() {
        const d = FS.db.load();
        const name = id => (d.accounts.find(a => a.id === id) || {}).name || '—';
        const list = FS.db.transactions().slice(0, 6);
        $('recentList').innerHTML = list.length ? list.map(t => {
            const c = FS.category(t.category);
            const cls = t.type === 'thu' ? 'money-in' : t.type === 'chi' ? 'money-out' : '';
            return `<li><span class="emoji">${c.emoji}</span>
                <div class="info"><strong>${FS.escape(t.note || c.name)}</strong><small>${FS.fmt.date(t.date)} ${t.time || ''} • ${FS.escape(t.type === 'chuyen' ? name(t.accountId) + ' → ' + name(t.toAccountId) : name(t.accountId))}</small></div>
                <b class="${cls}">${FS.fmt.signed(t.amount, t.type)}</b></li>`;
        }).join('') : '<li class="empty-state" style="display:block"><strong>Chưa có giao dịch</strong>Dùng form "Ghi chép mới" để bắt đầu.</li>';
    }

    /* ---------- 7. Mục tiêu tiết kiệm ---------- */
    function renderGoal() {
        const d = FS.db.load();
        const goal = d.settings.savingGoal || 0;
        const saved = d.accounts.filter(a => a.type === 'Sổ tiết kiệm').reduce((s, a) => s + FS.db.balance(a.id, d), 0);
        const pct = goal ? Math.min(100, Math.round(saved / goal * 100)) : 0;
        $('goalName').textContent = d.settings.savingGoalName || 'Quỹ dự phòng';
        $('goalRing').style.setProperty('--p', pct);
        $('goalPct').textContent = pct + '%';
        $('goalDesc').textContent = goal
            ? 'Đã tích lũy ' + money(saved) + ' / ' + money(goal) + (saved < goal ? ' – còn ' + money(goal - saved) + '.' : ' – hoàn thành! 🎉')
            : 'Đặt mục tiêu trong trang Cài đặt.';
    }

    /* ---------- Nút tiêu đề ---------- */
    $('monthSelect').addEventListener('change', e => { month = e.target.value; renderAll(); });
    $('syncBtn').addEventListener('click', () => { renderAll(); FS.toast('Dữ liệu đã được đồng bộ.', 'success'); });
    $('statementBtn').addEventListener('click', () => {
        const list = FS.db.byMonth(month);
        if (!list.length) { FS.toast('Tháng này chưa có giao dịch để sao kê.', 'error'); return; }
        FS.exportCSV(list, 'sao-ke-' + month);
        FS.toast('Đã tải sao kê ' + FS.fmt.month(month) + '.', 'success');
    });

    function renderAll() {
        fillMonths(); fillQuick(); renderStats(); renderAlloc(); renderChart(); renderCats(); renderRecent(); renderGoal();
    }
    document.addEventListener('fs:change', renderAll);
    renderAll();
})();
