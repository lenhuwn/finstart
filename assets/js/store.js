/* =====================================================================
   FINSTART – STORE.JS
   "Cơ sở dữ liệu" phía trình duyệt (localStorage) + Đăng nhập / Đăng ký.
   Website là web tĩnh (HTML/CSS/JS, chạy được trên GitHub Pages) nên dữ
   liệu được lưu trong trình duyệt của người dùng.
   Mục lục:
     1. Hằng số (danh mục, loại tài khoản)
     2. Hàm tiện ích (đọc/ghi, mã hóa mật khẩu, định dạng tiền/ngày)
     3. FS.auth  – Đăng ký, đăng nhập, CHẾ ĐỘ KHÁCH, đăng xuất, hồ sơ
     4. FS.db    – Tài khoản & giao dịch của người dùng
     5. Dữ liệu mẫu + tài khoản demo
     6. Xuất dữ liệu (CSV / Excel)
   ===================================================================== */
(function () {
    'use strict';
    const FS = (window.FS = window.FS || {});

    /* ========== 1. HẰNG SỐ ========== */
    FS.CATEGORIES = {
        chi: [
            { id: 'an-uong',   name: 'Ăn uống',     emoji: '🍜', group: 'thiet-yeu' },
            { id: 'nha-tro',   name: 'Nhà trọ',     emoji: '🏠', group: 'thiet-yeu' },
            { id: 'hoc-tap',   name: 'Học tập',     emoji: '📚', group: 'thiet-yeu' },
            { id: 'di-lai',    name: 'Đi lại',      emoji: '🛵', group: 'thiet-yeu' },
            { id: 'cafe',      name: 'Cafe',        emoji: '☕', group: 'ca-nhan' },
            { id: 'mua-sam',   name: 'Mua sắm',     emoji: '🛍️', group: 'ca-nhan' },
            { id: 'giai-tri',  name: 'Giải trí',    emoji: '🎮', group: 'ca-nhan' },
            { id: 'chi-khac',  name: 'Chi khác',    emoji: '📦', group: 'ca-nhan' }
        ],
        thu: [
            { id: 'tro-cap',   name: 'Trợ cấp gia đình', emoji: '🏡' },
            { id: 'luong',     name: 'Lương part-time',  emoji: '💼' },
            { id: 'hoc-bong',  name: 'Học bổng',         emoji: '🎓' },
            { id: 'thu-khac',  name: 'Thu khác',         emoji: '💰' }
        ]
    };
    FS.ACCOUNT_TYPES = ['Tiền mặt', 'Tài khoản ngân hàng', 'Ví điện tử', 'Sổ tiết kiệm'];

    FS.category = function (id) {
        if (id === 'chuyen-khoan') return { id, name: 'Chuyển khoản', emoji: '🔁' };
        return FS.CATEGORIES.chi.concat(FS.CATEGORIES.thu).find(c => c.id === id) || { id, name: 'Khác', emoji: '📦' };
    };

    /* ========== 2. TIỆN ÍCH ========== */
    const KEY_USERS = 'fs_users';
    const KEY_SESSION = 'fs_session';
    const dataKey = uid => 'fs_data_' + uid;
    const GUEST_ID = 'guest';

    /* Lưu trữ có DỰ PHÒNG:
       - Bình thường: localStorage (lâu dài) + sessionStorage (theo tab).
       - Nếu trình duyệt / khung xem trước chặn bộ nhớ: dùng window.name –
         vẫn giữ được dữ liệu khi chuyển trang trong cùng một tab. */
    const tabMemory = (function () {
        let obj = {};
        try { if (window.name && window.name.indexOf('FS:') === 0) obj = JSON.parse(window.name.slice(3)); } catch (e) { obj = {}; }
        const flush = () => { try { window.name = 'FS:' + JSON.stringify(obj); } catch (e) { /* bỏ qua */ } };
        return {
            getItem: k => (Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null),
            setItem: (k, v) => { obj[k] = String(v); flush(); },
            removeItem: k => { delete obj[k]; flush(); }
        };
    })();
    function usable(getStorage) {
        try {
            const st = getStorage();
            st.setItem('__fs_test', '1');
            st.removeItem('__fs_test');
            return st;
        } catch (e) { return null; }
    }
    const LOCAL = usable(() => window.localStorage) || usable(() => window.sessionStorage) || tabMemory;
    const SESSION = usable(() => window.sessionStorage) || tabMemory;
    FS.storageMode = LOCAL === tabMemory ? 'tab' : 'browser';

    function read(key, fallback, storage) {
        try {
            const raw = (storage || LOCAL).getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function write(key, value, storage) {
        try { (storage || LOCAL).setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }
    function remove(key, storage) { try { (storage || LOCAL).removeItem(key); } catch (e) { /* bỏ qua */ } }

    FS.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    // Mã hóa mật khẩu một chiều (SHA-256) trước khi lưu – không bao giờ lưu mật khẩu gốc.
    async function hashPassword(password, salt) {
        const text = salt + ':' + password;
        try {
            if (window.crypto && crypto.subtle) {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
                return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) { /* dùng cách dự phòng bên dưới */ }
        // Dự phòng khi trình duyệt không hỗ trợ crypto.subtle
        let h = 5381;
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
        return 'x' + h.toString(16);
    }

    FS.fmt = {
        money(n) { return Math.round(Number(n) || 0).toLocaleString('vi-VN') + ' đ'; },
        signed(n, type) {
            const s = FS.fmt.money(Math.abs(n));
            if (type === 'thu') return '+' + s;
            if (type === 'chi') return '-' + s;
            return s;
        },
        short(n) {
            n = Number(n) || 0;
            const a = Math.abs(n);
            if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
            if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
            if (a >= 1e3) {
                const k = Math.round(n / 1e3);
                // 999.999đ làm tròn thành 1000k → hiển thị "1 tr" cho đúng
                if (Math.abs(k) >= 1000) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
                return k + 'k';
            }
            return String(n);
        },
        date(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
        month(ym) { const [y, m] = ym.split('-'); return `Tháng ${m}/${y}`; },
        today() { const d = new Date(); return FS.fmt.iso(d); },
        iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
        now() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
        // Đọc số tiền người dùng gõ: "50.000", "50,000", "50k", "1.5tr"
        parseMoney(str) {
            if (typeof str === 'number') return str;
            let s = String(str || '').trim().toLowerCase().replace(/\s|đ|vnd/g, '');
            let mul = 1;
            if (/(tr|m)$/.test(s)) { mul = 1e6; s = s.replace(/(tr|m)$/, ''); }
            else if (/k$/.test(s)) { mul = 1e3; s = s.slice(0, -1); }
            if (mul > 1) s = s.replace(',', '.');
            else s = s.replace(/[.,]/g, '');
            const n = parseFloat(s);
            return isNaN(n) ? NaN : Math.round(n * mul);
        }
    };

    FS.escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ========== 3. ĐĂNG KÝ / ĐĂNG NHẬP ========== */
    FS.auth = {
        users() { return read(KEY_USERS, []); },

        async register({ name, email, password, school, sampleData }) {
            email = String(email).trim().toLowerCase();
            const users = this.users();
            if (users.some(u => u.email === email)) throw new Error('Email này đã được đăng ký. Hãy đăng nhập.');
            const salt = FS.uid();
            const user = {
                id: FS.uid(),
                name: String(name).trim(),
                email,
                school: String(school || '').trim(),
                salt,
                passHash: await hashPassword(password, salt),
                plan: 'free',
                createdAt: new Date().toISOString()
            };
            users.push(user);
            write(KEY_USERS, users);
            write(dataKey(user.id), sampleData ? buildSampleData() : emptyData());
            this._startSession(user.id, true);
            return user;
        },

        async login(email, password, remember) {
            email = String(email).trim().toLowerCase();
            const user = this.users().find(u => u.email === email);
            if (!user) throw new Error('Không tìm thấy tài khoản với email này.');
            if ((await hashPassword(password, user.salt)) !== user.passHash) throw new Error('Mật khẩu không đúng.');
            this._startSession(user.id, remember);
            return user;
        },

        _startSession(userId, remember) {
            const s = { userId, at: Date.now() };
            this.logout();
            write(KEY_SESSION, s, remember ? LOCAL : SESSION);
        },

        /* ----- CHẾ ĐỘ KHÁCH: dùng thử mọi tính năng, KHÔNG lưu lâu dài -----
           Dữ liệu mẫu nằm trong bộ nhớ của tab, đóng tab là mất. */
        startGuest() {
            this.logout();
            write(dataKey(GUEST_ID), buildSampleData(), SESSION);
            write(KEY_SESSION, { userId: GUEST_ID, guest: true, name: 'Khách', school: 'Chế độ dùng thử', plan: 'free', at: Date.now() }, SESSION);
        },
        isGuest() { const me = this.current(); return !!(me && me.guest); },

        logout() {
            const s = read(KEY_SESSION, null, SESSION);
            if (s && s.guest) remove(dataKey(GUEST_ID), SESSION);
            remove(KEY_SESSION, LOCAL); remove(KEY_SESSION, SESSION);
        },

        current() {
            const s = read(KEY_SESSION, null, SESSION) || read(KEY_SESSION, null, LOCAL);
            if (!s) return null;
            if (s.guest) {
                return { id: GUEST_ID, guest: true, name: s.name || 'Khách', school: s.school || 'Chế độ dùng thử',
                         email: 'khach@finstart.vn', plan: s.plan || 'free', createdAt: new Date(s.at || Date.now()).toISOString() };
            }
            return this.users().find(u => u.id === s.userId) || null;
        },

        updateProfile(changes) {
            const me = this.current(); if (!me) return null;
            if (me.guest) {   // khách: chỉ đổi trong phiên hiện tại
                const s = read(KEY_SESSION, null, SESSION) || {};
                write(KEY_SESSION, Object.assign(s, { name: changes.name || s.name, school: changes.school != null ? changes.school : s.school, plan: changes.plan || s.plan }), SESSION);
                return this.current();
            }
            const users = this.users().map(u => (u.id === me.id ? Object.assign({}, u, changes) : u));
            write(KEY_USERS, users);
            return this.current();
        },

        async changePassword(oldPass, newPass) {
            const me = this.current();
            if (me.guest) throw new Error('Chế độ khách không có mật khẩu. Hãy tạo tài khoản để dùng tính năng này.');
            if ((await hashPassword(oldPass, me.salt)) !== me.passHash) throw new Error('Mật khẩu hiện tại không đúng.');
            const salt = FS.uid();
            this.updateProfile({ salt, passHash: await hashPassword(newPass, salt) });
        },

        // Quên mật khẩu (bản demo): đặt lại mật khẩu khi email + họ tên khớp.
        async resetPassword(email, name, newPass) {
            email = String(email).trim().toLowerCase();
            const users = this.users();
            const u = users.find(x => x.email === email);
            if (!u || u.name.trim().toLowerCase() !== String(name).trim().toLowerCase()) {
                throw new Error('Email hoặc họ tên không khớp với tài khoản nào.');
            }
            u.salt = FS.uid();
            u.passHash = await hashPassword(newPass, u.salt);
            write(KEY_USERS, users);
        },

        deleteAccount() {
            const me = this.current(); if (!me) return;
            if (me.guest) { this.logout(); return; }
            write(KEY_USERS, this.users().filter(u => u.id !== me.id));
            remove(dataKey(me.id));
            this.logout();
        }
    };

    /* ========== 4. DỮ LIỆU NGƯỜI DÙNG ========== */
    function emptyData() {
        return {
            accounts: [{ id: FS.uid(), name: 'Ví tiền mặt', type: 'Tiền mặt', initial: 0, status: 'Đang hoạt động', inReport: true, note: '' }],
            transactions: [],
            settings: { monthlyBudget: 5000000, savingGoal: 3000000, savingGoalName: 'Quỹ dự phòng' }
        };
    }

    FS.db = {
        load() {
            const me = FS.auth.current();
            if (!me) return emptyData();
            const d = read(dataKey(me.id), null, me.guest ? SESSION : LOCAL) || emptyData();
            d.settings = Object.assign(emptyData().settings, d.settings || {});
            return d;
        },
        save(data) {
            const me = FS.auth.current(); if (!me) return;
            write(dataKey(me.id), data, me.guest ? SESSION : LOCAL);
            document.dispatchEvent(new CustomEvent('fs:change'));
        },
        replace(data) { this.save(data); },
        reset(withSample) { this.save(withSample ? buildSampleData() : emptyData()); },

        /* --- Tài khoản / ví --- */
        accounts() { return this.load().accounts; },
        account(id) { return this.accounts().find(a => a.id === id); },
        balance(accountId, data) {
            data = data || this.load();
            const acc = data.accounts.find(a => a.id === accountId);
            if (!acc) return 0;
            return data.transactions.reduce((sum, t) => {
                if (t.type === 'thu' && t.accountId === accountId) return sum + t.amount;
                if (t.type === 'chi' && t.accountId === accountId) return sum - t.amount;
                if (t.type === 'chuyen') {
                    if (t.accountId === accountId) return sum - t.amount;
                    if (t.toAccountId === accountId) return sum + t.amount;
                }
                return sum;
            }, Number(acc.initial) || 0);
        },
        totalAssets() {
            const d = this.load();
            return d.accounts.filter(a => a.inReport !== false).reduce((s, a) => s + this.balance(a.id, d), 0);
        },
        saveAccount(acc) {
            const d = this.load();
            if (!acc.id) delete acc.id;
            if (acc.id) d.accounts = d.accounts.map(a => (a.id === acc.id ? Object.assign({}, a, acc) : a));
            else d.accounts.push(Object.assign({ id: FS.uid(), status: 'Đang hoạt động', inReport: true }, acc));
            this.save(d);
        },
        deleteAccount(id) {
            const d = this.load();
            const used = d.transactions.some(t => t.accountId === id || t.toAccountId === id);
            if (used) throw new Error('Tài khoản đã có giao dịch. Hãy xóa các giao dịch liên quan trước, hoặc chuyển trạng thái sang "Tạm khóa".');
            d.accounts = d.accounts.filter(a => a.id !== id);
            this.save(d);
        },
        transfer(fromId, toId, amount, note, date) {
            if (fromId === toId) throw new Error('Tài khoản nguồn và đích phải khác nhau.');
            this.saveTx({ type: 'chuyen', accountId: fromId, toAccountId: toId, amount, category: 'chuyen-khoan', note: note || 'Chuyển tiền nội bộ', date: date || FS.fmt.today(), time: FS.fmt.now() });
        },

        /* --- Giao dịch --- */
        transactions() {
            return this.load().transactions.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        },
        saveTx(tx) {
            const d = this.load();
            tx.amount = Math.abs(Math.round(Number(tx.amount) || 0));
            if (!tx.id) delete tx.id;
            if (tx.id) d.transactions = d.transactions.map(t => (t.id === tx.id ? Object.assign({}, t, tx) : t));
            else d.transactions.push(Object.assign({ id: FS.uid(), time: FS.fmt.now(), createdAt: Date.now() }, tx));
            this.save(d);
        },
        saveMany(list) {
            const d = this.load();
            list.forEach(tx => d.transactions.push(Object.assign({ id: FS.uid(), time: FS.fmt.now(), createdAt: Date.now() }, tx, { amount: Math.abs(Math.round(tx.amount)) })));
            this.save(d);
        },
        deleteTx(id) {
            const d = this.load();
            d.transactions = d.transactions.filter(t => t.id !== id);
            this.save(d);
        },

        /* --- Thống kê --- */
        summary(list) {
            const s = { thu: 0, chi: 0, count: list.length };
            list.forEach(t => { if (t.type === 'thu') s.thu += t.amount; if (t.type === 'chi') s.chi += t.amount; });
            s.net = s.thu - s.chi;
            return s;
        },
        byMonth(ym) { return this.transactions().filter(t => t.date.slice(0, 7) === ym); },
        months() {
            const set = new Set(this.transactions().map(t => t.date.slice(0, 7)));
            set.add(FS.fmt.today().slice(0, 7));
            return Array.from(set).sort().reverse();
        }
    };

    /* ========== 5. DỮ LIỆU MẪU & TÀI KHOẢN DEMO ========== */
    // Dữ liệu mẫu lấy theo nội dung nhóm đã thiết kế (Ví tiền mặt, Vietcombank, MoMo, Quỹ tiết kiệm...)
    function buildSampleData() {
        const acc = {
            cash:   { id: FS.uid(), name: 'Ví tiền mặt tiêu dùng',        type: 'Tiền mặt',            initial: 800000,  status: 'Đang hoạt động', inReport: true, note: 'Hạn mức gợi ý: 2.000.000 đ' },
            vcb:    { id: FS.uid(), name: 'Vietcombank Thẻ sinh viên',    type: 'Tài khoản ngân hàng', initial: 2500000, status: 'Đang hoạt động', inReport: true, note: 'Thẻ liên kết sinh viên' },
            momo:   { id: FS.uid(), name: 'Ví điện tử MoMo',              type: 'Ví điện tử',          initial: 300000,  status: 'Đang hoạt động', inReport: true, note: 'Hoàn tiền hằng tháng' },
            saving: { id: FS.uid(), name: 'Quỹ tiết kiệm dự phòng cá nhân', type: 'Sổ tiết kiệm',      initial: 0,       status: 'Đang tích lũy',  inReport: true, note: 'Mục tiêu 3.000.000 đ' }
        };
        const tx = [];
        const today = new Date();
        const todayIso = FS.fmt.iso(today);
        const add = (date, type, amount, category, accountId, note, time, toAccountId) => {
            const iso = FS.fmt.iso(date);
            if (iso > todayIso) return;
            tx.push({ id: FS.uid(), type, amount, category, accountId, toAccountId, note, date: iso, time: time || '12:00', createdAt: Date.now() });
        };
        for (let back = 2; back >= 0; back--) {
            const y = today.getFullYear(), m = today.getMonth() - back;
            const D = d => new Date(y, m, d);
            add(D(1),  'thu', 3000000, 'tro-cap', acc.vcb.id,  'Gia đình gửi tiền', '08:00');
            add(D(2),  'chi', 1200000, 'nha-tro', acc.vcb.id,  'Tiền trọ + điện nước', '09:30');
            add(D(3),  'chi', 35000,   'an-uong', acc.cash.id, 'Phở bò sinh viên', '07:15');
            add(D(4),  'chi', 120000,  'hoc-tap', acc.vcb.id,  'Mua giáo trình', '11:00');
            add(D(2),  'chuyen', 1100000, 'chuyen-khoan', acc.vcb.id, 'Rút tiền ATM', '10:00', acc.cash.id);
            add(D(3),  'chuyen', 300000, 'chuyen-khoan', acc.vcb.id, 'Nạp ví MoMo', '10:05', acc.momo.id);
            add(D(5),  'chuyen', 500000, 'chuyen-khoan', acc.vcb.id, 'Trích quỹ dự phòng', '20:00', acc.saving.id);
            add(D(6),  'chi', 45000,   'cafe',    acc.momo.id, 'Cafe học nhóm', '14:20');
            add(D(8),  'chi', 70000,   'di-lai',  acc.cash.id, 'Đổ xăng', '17:40');
            add(D(9),  'chi', 55000,   'an-uong', acc.cash.id, 'Cơm trưa căng tin', '12:05');
            add(D(10), 'thu', 1500000, 'luong',   acc.vcb.id,  'Lương trợ giảng part-time', '14:20');
            add(D(12), 'chi', 85000,   'mua-sam', acc.momo.id, 'Đồ dùng sinh hoạt trọ', '18:40');
            add(D(14), 'chi', 150000,  'giai-tri', acc.momo.id, 'Xem phim cùng bạn', '19:30');
            add(D(16), 'chi', 420000,  'an-uong', acc.cash.id, 'Đi chợ cả tuần', '07:50');
            add(D(18), 'chi', 39000,   'cafe',    acc.momo.id, 'Trà sữa', '15:10');
            add(D(20), 'chi', 70000,   'di-lai',  acc.cash.id, 'Đổ xăng', '17:00');
            add(D(22), 'chi', 250000,  'mua-sam', acc.vcb.id,  'Áo khoác mới', '20:15');
            add(D(24), 'chi', 380000,  'an-uong', acc.cash.id, 'Đi chợ cả tuần', '08:10');
            add(D(26), 'chi', 60000,   'hoc-tap', acc.cash.id, 'In tài liệu ôn thi', '10:00');
            if (back === 1) add(D(15), 'thu', 3000000, 'hoc-bong', acc.vcb.id, 'Học bổng khuyến khích học tập', '18:30');
        }
        // Luôn có vài giao dịch trong ngày hôm nay để Tổng quan sinh động
        add(today, 'chi', 35000, 'an-uong', acc.cash.id, 'Ăn sáng', '07:30');
        add(today, 'chi', 45000, 'cafe', acc.momo.id, 'Cafe làm bài nhóm', '09:15');
        return {
            accounts: [acc.cash, acc.vcb, acc.momo, acc.saving],
            transactions: tx,
            settings: { monthlyBudget: 4500000, savingGoal: 3000000, savingGoalName: 'Quỹ dự phòng' }
        };
    }

    FS.DEMO = { email: 'demo@finstart.vn', password: 'finstart123' };

    // Tạo sẵn tài khoản demo (để giảng viên / người xem chấm thử nhanh).
    // Dùng chung một promise để tránh tạo trùng khi nhiều nơi gọi cùng lúc.
    let demoPromise = null;
    FS.ensureDemo = function () {
        if (FS.auth.users().some(u => u.email === FS.DEMO.email)) return Promise.resolve();
        if (demoPromise) return demoPromise;
        demoPromise = (async () => {
            const salt = FS.uid();
            const demo = {
                id: 'demo', name: 'Nguyễn Văn A', email: FS.DEMO.email, school: 'SV ĐHQG • K65',
                salt, passHash: await hashPassword(FS.DEMO.password, salt), plan: 'free', createdAt: new Date().toISOString()
            };
            // Kiểm tra lại sau khi băm mật khẩu (tránh 2 lần gọi đồng thời tạo 2 tài khoản demo)
            if (FS.auth.users().some(u => u.email === FS.DEMO.email)) return;
            write(KEY_USERS, FS.auth.users().concat(demo));
            write(dataKey(demo.id), buildSampleData());
        })().finally(() => { demoPromise = null; });
        return demoPromise;
    };

    /* ========== 6. XUẤT DỮ LIỆU ========== */
    function download(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }
    FS.download = download;

    function txRows(list) {
        const d = FS.db.load();
        const accName = id => (d.accounts.find(a => a.id === id) || {}).name || '';
        return list.map(t => ({
            'Ngày': FS.fmt.date(t.date),
            'Giờ': t.time || '',
            'Loại': t.type === 'thu' ? 'Thu' : t.type === 'chi' ? 'Chi' : 'Chuyển khoản',
            'Hạng mục': FS.category(t.category).name,
            'Tài khoản': t.type === 'chuyen' ? accName(t.accountId) + ' → ' + accName(t.toAccountId) : accName(t.accountId),
            'Diễn giải': t.note || '',
            'Số tiền (VND)': t.type === 'chi' ? -t.amount : t.amount
        }));
    }

    FS.exportCSV = function (list, filename) {
        const rows = txRows(list);
        const head = Object.keys(rows[0] || { 'Ngày': '', 'Giờ': '', 'Loại': '', 'Hạng mục': '', 'Tài khoản': '', 'Diễn giải': '', 'Số tiền (VND)': '' });
        const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
        const csv = [head.map(esc).join(',')].concat(rows.map(r => head.map(h => esc(r[h])).join(','))).join('\r\n');
        download('﻿' + csv, (filename || 'finstart-giao-dich') + '.csv', 'text/csv;charset=utf-8');
    };

    // Excel đọc được bảng HTML lưu dưới đuôi .xls
    FS.exportExcel = function (list, filename) {
        const rows = txRows(list);
        const head = rows.length ? Object.keys(rows[0]) : ['Ngày', 'Giờ', 'Loại', 'Hạng mục', 'Tài khoản', 'Diễn giải', 'Số tiền (VND)'];
        const html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">' +
            '<tr>' + head.map(h => '<th style="background:#006c49;color:#fff">' + FS.escape(h) + '</th>').join('') + '</tr>' +
            rows.map(r => '<tr>' + head.map(h => '<td>' + FS.escape(r[h]) + '</td>').join('') + '</tr>').join('') +
            '</table></body></html>';
        download(html, (filename || 'finstart-giao-dich') + '.xls', 'application/vnd.ms-excel;charset=utf-8');
    };
})();
