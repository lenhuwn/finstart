/* =====================================================================
   TRANG: BLOG – lọc theo danh mục, tìm kiếm, đọc nhiều, đăng ký bản tin
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const posts = FS.POSTS.slice().sort((a, b) => b.date.localeCompare(a.date));
    const params = new URLSearchParams(location.search);
    let cat = FS.CATS[params.get('cat')] ? params.get('cat') : 'all';
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

    function render() {
        const list = posts.filter(p =>
            (cat === 'all' || p.cat === cat) &&
            (!keyword || norm(p.title + ' ' + p.excerpt + ' ' + p.author).includes(norm(keyword))));

        // Bài nổi bật chỉ hiện khi xem "Tất cả" và không tìm kiếm
        const featured = posts.find(p => p.featured);
        const showFeatured = cat === 'all' && !keyword && featured;
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
