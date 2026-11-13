/* =====================================================================
   TRANG: BLOG – lọc theo danh mục, tìm kiếm, đọc nhiều, đăng ký bản tin
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const posts = FS.POSTS.slice().sort((a, b) => b.date.localeCompare(a.date));
    const params = new URLSearchParams(location.search);
    let cat = FS.CATS[params.get('cat')] || params.get('cat') === 'jelb' ? params.get('cat') : 'all';
    let jelbExpanded = false;
    let keyword = params.get('q') || '';

    const $ = id => document.getElementById(id);
    const esc = FS.escape;
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

    function card(p) {
        return `<article class="post-card">
            <a class="post-thumb" href="bai-viet-${p.id}.html"><img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='../assets/img/sinh-vien.png'"></a>
            <div class="post-body">
              <a class="post-cat" href="?cat=${p.cat}">${FS.CATS[p.cat]}</a>
              <h3><a href="bai-viet-${p.id}.html">${esc(p.title)}</a></h3>
              <p>${esc(p.excerpt)}</p>
              <small>${esc(p.author)} • ${FS.fmt.date(p.date)} • ${p.read} phút đọc</small>
            </div>
          </article>`;
    }

    /* ---------- Tin từ Tạp chí Kinh tế - Luật và Ngân hàng (assets/data/jelb.js) ---------- */
    const timeAgo = iso => {
        const mins = Math.round((Date.now() - new Date(iso)) / 60000);
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return mins + ' phút trước';
        if (mins < 1440) return Math.round(mins / 60) + ' giờ trước';
        return Math.round(mins / 1440) + ' ngày trước';
    };
    const viDate = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '';

    function renderJelb() {
        const data = window.FS_JELB;
        const box = $('jelb');
        const show = (cat === 'all' || cat === 'jelb') && data && data.items && data.items.length;
        box.hidden = !show;
        $('blogContent').hidden = cat === 'jelb';
        if (!show) return;

        if (data.issue) {
            $('jelbIssue').textContent = data.issue.title;
            if (data.issue.url) $('jelbIssueLink').href = data.issue.url;
        }
        const t = new Date(data.fetchedAt);
        const hhmm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
        $('jelbUpdated').textContent = 'Đồng bộ ' + timeAgo(data.fetchedAt) + ' (' + hhmm + ' ' + viDate(data.fetchedAt) + ')';

        const list = data.items.filter(it => !keyword || norm(it.title + ' ' + it.summary + ' ' + it.authors.join(' ')).includes(norm(keyword)));
        const limit = cat === 'jelb' || jelbExpanded || keyword ? list.length : 4;
        $('jelbGrid').innerHTML = list.slice(0, limit).map(it => `
            <article class="jelb-card">
              <div class="jelb-card-top"><span class="badge badge-blue">${esc(it.issue || 'Tạp chí KT-Luật-NH')}</span><small>${viDate(it.published || it.updated)}</small></div>
              <h3><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
              <p class="jelb-authors">${esc(it.authors.join(', '))}</p>
              <p class="jelb-summary">${esc(it.summary)}</p>
              <a class="jelb-read" href="${esc(it.link)}" target="_blank" rel="noopener">Đọc toàn văn trên tạp chí ↗</a>
            </article>`).join('');
        $('jelbEmpty').hidden = list.length > 0;
        $('jelbMore').hidden = limit >= list.length;
        $('jelbMore').textContent = 'Xem thêm ' + (list.length - limit) + ' bài từ tạp chí';
    }
    $('jelbMore').addEventListener('click', () => { jelbExpanded = true; renderJelb(); });

    // Trang mở lâu: cứ 10 phút tải lại file dữ liệu (GitHub Actions cập nhật mỗi giờ) – không cần F5
    setInterval(() => {
        const s = document.createElement('script');
        s.src = '../assets/data/jelb.js?t=' + Date.now();
        s.onload = () => { renderJelb(); s.remove(); };
        s.onerror = () => s.remove();
        document.body.appendChild(s);
    }, 10 * 60 * 1000);

    function render() {
        renderJelb();
        const list = posts.filter(p =>
            (cat === 'all' || p.cat === cat) &&
            (!keyword || norm(p.title + ' ' + p.excerpt + ' ' + p.author).includes(norm(keyword))));

        // Bài nổi bật chỉ hiện khi xem "Tất cả" và không tìm kiếm
        const featured = posts.find(p => p.featured);
        const showFeatured = cat === 'all' && !keyword && !!featured;
        $('featured').hidden = !showFeatured;
        if (showFeatured) {
            $('featured').innerHTML = `
              <a class="featured-img" href="bai-viet-${featured.id}.html"><img src="${esc(featured.image)}" alt="" onerror="this.onerror=null;this.src='../assets/img/sinh-vien.png'"></a>
              <div class="featured-body">
                <span class="badge badge-green">Nổi bật • ${FS.CATS[featured.cat]}</span>
                <h2><a href="bai-viet-${featured.id}.html">${esc(featured.title)}</a></h2>
                <p>${esc(featured.excerpt)}</p>
                <a class="btn btn-dark" href="bai-viet-${featured.id}.html">Đọc bài viết →</a>
              </div>`;
        }
        const grid = showFeatured ? list.filter(p => p.id !== featured.id) : list;
        $('postGrid').innerHTML = grid.map(card).join('');
        $('postEmpty').hidden = list.length > 0;
        $('postCount').textContent = list.length + ' bài viết';

        document.querySelectorAll('.categories button').forEach(b => {
            const on = b.dataset.cat === cat;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
    }

    document.querySelector('.categories').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        cat = b.dataset.cat;
        history.replaceState(null, '', cat === 'all' ? location.pathname : '?cat=' + cat);
        render();
    });
    $('postSearch').value = keyword;
    $('postSearch').addEventListener('input', e => { keyword = e.target.value.trim(); render(); });

    $('mostRead').innerHTML = FS.POSTS.slice().sort((a, b) => b.views - a.views).slice(0, 3)
        .map(p => `<li><a href="bai-viet-${p.id}.html">${esc(p.title)}</a><small>${p.views.toLocaleString('vi-VN')} lượt đọc</small></li>`).join('');

    $('newsletterForm').addEventListener('submit', e => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { FS.toast('Email chưa hợp lệ.', 'error'); return; }
        try {
            const list = JSON.parse(localStorage.getItem('fs_newsletter') || '[]');
            if (!list.includes(email)) list.push(email);
            localStorage.setItem('fs_newsletter', JSON.stringify(list));
        } catch (err) { /* bỏ qua */ }
        e.target.reset();
        FS.toast('Đăng ký nhận tin thành công!', 'success');
    });

    render();
})();
