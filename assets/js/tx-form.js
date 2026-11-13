/* =====================================================================
   FINSTART – TX-FORM.JS
   Popup THÊM / SỬA giao dịch dùng chung cho mọi trang trong bảng điều khiển.
   Gọi: FS.openTxModal()            → thêm mới
        FS.openTxModal(giaoDich)    → sửa
        FS.openTxModal({type:'thu'})→ thêm mới, chọn sẵn loại
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    if (!FS || !FS.auth.current()) return;

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'txModal';
    wrap.hidden = true;
    wrap.innerHTML = `
      <form class="modal" id="txForm" novalidate aria-labelledby="txTitle">
        <button type="button" class="icon-btn modal-close" data-close aria-label="Đóng">${FS.icon('close')}</button>
        <h2 id="txTitle">Thêm ghi chép</h2>
        <p>Ghi lại khoản thu hoặc chi của bạn. Có thể gõ nhanh: 50k, 1.5tr.</p>
        <input type="hidden" name="txId">
        <div class="segmented" role="radiogroup" aria-label="Loại giao dịch">
          <button type="button" data-value="chi" class="active" role="radio">Khoản chi</button>
          <button type="button" data-value="thu" role="radio">Khoản thu</button>
        </div>
        <div class="form-group mt-16">
          <label for="txAmount">Số tiền giao dịch</label>
          <input class="input" id="txAmount" name="amount" inputmode="decimal" placeholder="Ví dụ: 50.000" autocomplete="off" required>
          <span class="field-error" data-for="amount"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="txCategory">Hạng mục</label>
            <select class="select" id="txCategory" name="category"></select>
          </div>
          <div class="form-group">
            <label for="txAccount">Tài khoản / ví</label>
            <select class="select" id="txAccount" name="accountId"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="txDate">Ngày thực hiện</label>
            <input class="input" type="date" id="txDate" name="date" required>
          </div>
          <div class="form-group">
            <label for="txTime">Giờ</label>
            <input class="input" type="time" id="txTime" name="time">
          </div>
        </div>
        <div class="form-group mt-16">
          <label for="txNote">Nội dung ghi chú</label>
          <input class="input" id="txNote" name="note" maxlength="120" placeholder="Ví dụ: Phở bò sinh viên">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-close>Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu giao dịch</button>
        </div>
      </form>`;
    document.body.appendChild(wrap);

    const form = wrap.querySelector('#txForm');
    const seg = wrap.querySelector('.segmented');
    let type = 'chi';

    function fillCategories(selected) {
        form.category.innerHTML = FS.CATEGORIES[type].map(c =>
            `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${c.emoji} ${c.name}</option>`).join('');
    }
    function fillAccounts(selected) {
        const accs = FS.db.accounts();
        form.accountId.innerHTML = accs.map(a =>
            `<option value="${a.id}"${a.id === selected ? ' selected' : ''}>${FS.escape(a.name)}</option>`).join('');
    }
    function setType(t, category) {
        type = t;
        seg.querySelectorAll('button').forEach(b => {
            const on = b.dataset.value === t;
            b.classList.toggle('active', on);
            b.setAttribute('aria-checked', String(on));
        });
        fillCategories(category);
    }
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setType(b.dataset.value); });

    FS.openTxModal = function (tx) {
        tx = tx || {};
        const editing = !!tx.id;
        if (tx.type === 'chuyen') { FS.toast('Giao dịch chuyển khoản được sửa trong trang Tài khoản.', 'error'); return; }
        wrap.querySelector('#txTitle').textContent = editing ? 'Sửa ghi chép' : 'Thêm ghi chép';
        form.reset();
        form.txId.value = tx.id || '';
        setType(tx.type || 'chi', tx.category);
        fillAccounts(tx.accountId);
        form.amount.value = tx.amount ? Number(tx.amount).toLocaleString('vi-VN') : '';
        form.date.value = tx.date || FS.fmt.today();
        form.time.value = tx.time || FS.fmt.now();
        form.note.value = tx.note || '';
        form.querySelector('[data-for="amount"]').textContent = '';
        form.amount.classList.remove('is-invalid');
        FS.openModal('txModal');
    };

    // Tự thêm dấu chấm phân cách hàng nghìn khi gõ số
    form.amount.addEventListener('blur', () => {
        const n = FS.fmt.parseMoney(form.amount.value);
        if (!isNaN(n) && n > 0) form.amount.value = n.toLocaleString('vi-VN');
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        const amount = FS.fmt.parseMoney(form.amount.value);
        const err = form.querySelector('[data-for="amount"]');
        if (isNaN(amount) || amount <= 0) {
            err.textContent = 'Vui lòng nhập số tiền hợp lệ lớn hơn 0.';
            form.amount.classList.add('is-invalid');
            form.amount.focus();
            return;
        }
        if (!form.accountId.value) { FS.toast('Hãy tạo ít nhất một tài khoản / ví trước.', 'error'); return; }
        const editing = !!form.txId.value;
        FS.db.saveTx({
            id: form.txId.value || undefined,
            type,
            amount,
            category: form.category.value,
            accountId: form.accountId.value,
            date: form.date.value || FS.fmt.today(),
            time: form.time.value || FS.fmt.now(),
            note: form.note.value.trim()
        });
        FS.closeModal('txModal');
        FS.toast(editing ? 'Đã cập nhật giao dịch.' : 'Đã thêm giao dịch mới.', 'success');
    });

    // Mở sẵn popup khi URL có #them (ví dụ từ nút "Thêm ghi chép mới" ở trang khác)
    if (location.hash === '#them') setTimeout(() => FS.openTxModal(), 50);

    // Xóa giao dịch dùng chung
    FS.deleteTxConfirm = async function (id) {
        if (await FS.confirm('Bạn chắc chắn muốn xóa giao dịch này? Thao tác không thể hoàn tác.', 'Xóa')) {
            FS.db.deleteTx(id);
            FS.toast('Đã xóa giao dịch.', 'success');
        }
    };
})();
