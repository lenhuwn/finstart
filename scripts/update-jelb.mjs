// =====================================================================
// FINSTART – CẬP NHẬT TIN TỪ "TẠP CHÍ KINH TẾ - LUẬT VÀ NGÂN HÀNG" (JELB)
// Nguồn: https://jelb.hvnh.edu.vn (Học viện Ngân hàng) – nguồn Atom chính thức của tạp chí.
//
// Chạy:   node scripts/update-jelb.mjs
// Tự động: GitHub Actions chạy mỗi giờ (.github/workflows/update-jelb.yml)
// Kết quả: assets/data/jelb.js  →  window.FS_JELB = { ... }
//   (dùng file .js thay vì .json để trang web đọc được cả khi mở file trực tiếp)
//
// Lưu ý quyền riêng tư: KHÔNG lưu email tác giả có trong nguồn tin.
// =====================================================================
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'data', 'jelb.js');
const SITE = 'https://jelb.hvnh.edu.vn/index.php/jelb';
const FEED = SITE + '/gateway/plugin/WebFeedGatewayPlugin/atom';
const MAX_ITEMS = 40;           // giữ tối đa 40 bài (gộp dần qua các số tạp chí)
const UA = 'FinStart-StudentProject/1.0 (+https://github.com/lenhuwn/finstart)';

/* ---------- Tiện ích ---------- */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(str) {
    return String(str || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const stripTags = html => decode(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (xml, tag) => { const m = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return m ? m[1] : ''; };
function shorten(text, max) {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

async function get(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/atom+xml, text/html;q=0.9' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(url + ' → HTTP ' + res.status);
    return res.text();
}

/* ---------- 1. Đọc nguồn Atom ---------- */
function parseFeed(xml) {
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
        const link = (e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) || [])[1] || stripTags(pick(e, 'id'));
        const authors = [...e.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map(m => stripTags(m[1])).filter(Boolean);
        return {
            id: (link.match(/article\/view\/(\d+)/) || [])[1] || link,
            title: stripTags(pick(e, 'title')),
            authors,                                   // chỉ tên, không lấy email
            summary: shorten(stripTags(pick(e, 'summary')), 320),
            published: stripTags(pick(e, 'published')) || null,
            updated: stripTags(pick(e, 'updated')) || null,
            link
        };
    }).filter(it => it.title && /^https:\/\/jelb\.hvnh\.edu\.vn\//.test(it.link));
}

/* ---------- 2. Thông tin số tạp chí hiện hành ---------- */
async function currentIssue() {
    try {
        const html = await get(SITE + '/issue/current');
        const title = stripTags(pick(html, 'title')).split('|')[0].trim();
        const cover = (html.match(/<img[^>]+src="(https:\/\/jelb\.hvnh\.edu\.vn\/public\/journals\/[^"]+cover[^"]*)"/i) || [])[1] || null;
        return { title, url: SITE + '/issue/current', cover };
    } catch (err) {
        console.warn('Không lấy được số hiện hành:', err.message);
        return null;
    }
}

/* ---------- 3. Gộp với dữ liệu cũ & ghi file ---------- */
async function previous() {
    try {
        const txt = await readFile(OUT, 'utf8');
        return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    } catch { return null; }
}

const xml = await get(FEED);
const fresh = parseFeed(xml);
if (!fresh.length) throw new Error('Nguồn tin không có bài nào – giữ nguyên dữ liệu cũ.');
const issue = await currentIssue();
const old = await previous();

const byId = new Map();
for (const it of (old?.items || [])) byId.set(it.id, it);
for (const it of fresh) byId.set(it.id, { ...byId.get(it.id), ...it, issue: issue?.title || byId.get(it.id)?.issue || null });
const items = [...byId.values()]
    .sort((a, b) => String(b.updated || b.published).localeCompare(String(a.updated || a.published)))
    .slice(0, MAX_ITEMS);

const changed = JSON.stringify(items) !== JSON.stringify(old?.items) || issue?.title !== old?.issue?.title;
const data = {
    source: { name: 'Tạp chí Kinh tế - Luật và Ngân hàng', publisher: 'Học viện Ngân hàng', url: SITE, feed: FEED },
    issue: issue || old?.issue || null,
    fetchedAt: new Date().toISOString(),
    items
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT,
    '/* Tự động tạo bởi scripts/update-jelb.mjs – KHÔNG sửa tay.\n' +
    '   Nguồn: ' + FEED + ' */\n' +
    'window.FS_JELB = ' + JSON.stringify(data, null, 2) + ';\n', 'utf8');

console.log((changed ? 'CÓ BÀI MỚI / THAY ĐỔI' : 'Không có bài mới') + ' – ' + items.length + ' bài, số: ' + (data.issue?.title || '?'));
