/* =====================================================================
   TRANG: BÀI VIẾT – điền tiêu đề/tác giả/ảnh từ posts.js + bài liên quan
   Mỗi trang bài viết khai báo: <body data-post="1">
   ===================================================================== */
(function () {
    'use strict';
    const FS = window.FS;
    const id = Number(document.body.dataset.post);
    const post = FS.POSTS.find(p => p.id === id);
    if (!post) return;
    const esc = FS.escape;

    document.title = post.title + ' | Blog FinStart';
    document.getElementById('articleCat').textContent = FS.CATS[post.cat];
    document.getElementById('articleCat').href = 'blog.html?cat=' + post.cat;
    document.getElementById('articleTitle').textContent = post.title;
    document.getElementById('articleMeta').innerHTML =
        '<span class="avatar">' + esc(post.author.charAt(0)) + '</span><strong>' + esc(post.author) + '</strong>' +
        '<span>•</span><span>' + FS.fmt.date(post.date) + '</span><span>•</span><span>' + post.read + ' phút đọc</span>';
    const cover = document.getElementById('articleCover');
    cover.innerHTML = `<img src="${esc(post.image)}" alt="" onerror="this.onerror=null;this.src='../assets/img/sinh-vien.png'">`;

    const related = FS.POSTS.filter(p => p.id !== id)
        .sort((a, b) => (b.cat === post.cat) - (a.cat === post.cat) || b.date.localeCompare(a.date))
        .slice(0, 3);
    document.getElementById('relatedGrid').innerHTML = related.map(p => `
        <article class="post-card">
          <a class="post-thumb" href="bai-viet-${p.id}.html"><img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='../assets/img/sinh-vien.png'"></a>
          <div class="post-body">
            <span class="post-cat">${FS.CATS[p.cat]}</span>
            <h3><a href="bai-viet-${p.id}.html">${esc(p.title)}</a></h3>
            <small>${esc(p.author)} • ${p.read} phút đọc</small>
          </div>
        </article>`).join('');
})();
