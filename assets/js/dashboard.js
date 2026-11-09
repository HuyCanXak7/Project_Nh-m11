/*
 * Dữ liệu mẫu cho Dashboard.
 * Khi BE xong, thay hàm loadDashboardData() bằng fetch API thật
 * (giữ nguyên cấu trúc object trả về là các hàm render không phải sửa).
 */

const MOCK_DATA = {
    user: { fullName: 'Nguyễn Văn A' },
    stats: {
        gpa: 3.42, gpaDelta: 0.12,
        credits: 78, creditsDelta: 4,
        passedCourses: 6, totalCourses: 8,
        termAverage: 8.3, termAverageDelta: 0.3,
    },
    chart: {
        current: { label: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'], values: [4.0, 5.8, 6.5, 7,4, 8.3] },
        previous: { labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'], values: [6.2, 7.1, 6.8, 7.6, 8.0] },
        all:      { labels: ['HK1', 'HK2', 'HK3', 'HK4', 'HK5'], values: [6.9, 7.3, 7.1, 8.0, 8.3] },
    },
    activities: [
        { type: 'grade',  text: 'Bạn đã cập nhật điểm môn Toán',   time: '2 giờ trước' },
        { type: 'course', text: 'Thêm lịch học: Cơ sở dữ liệu',    time: '1 ngày trước' },
        { type: 'goal',   text: 'Cập nhật mục tiêu: Đạt GPA 3.5',  time: '2 ngày trước' },
    ],
    schedule: [
        { weekday: 'Th 3', date: '11/11', name: 'Lập trình iOS', time: '08:00 - 10:00', color: '#7FA9F7' },
        { weekday: 'Th 4', date: '12/11', name: 'Cơ sở dữ liệu', time: '13:30 - 15:30', color: '#A989F2' },
    ],
};

async function loadDashboardData() {
    const data = { ...MOCK_DATA };
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser && currentUser.fullName) {
        data.user = { fullName: currentUser.fullName };
    }
    return data;
}

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function trendHtml(delta, digits = 2, unit = '') {
    if (delta === null || delta === undefined) return '';
    const up = delta >= 0;
    const sign = up? "+" : "-";
    const value = Math.abs(delta).toFixed(digits);
    return  `<span class="trend trend--${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${sign}${value}${unit}</span>`;
}

// header

function renderUser(user) {
    $('userName').textContent = user.fullName;
    $('userChipName').textContent = user.fullName;
    const lastWord = user.fullName.trim().split(/\s+/).pop() || '?';
    $('userAvatar').textContent = lastWord.charAt(0).toUpperCase();
}

// thong ke

function renderStats(s) {
    $('statGpa').textContent = s.gpa.toFixed(2);
    $('statGpaNote').innerHTML = `${trendHtml(s.gpaDelta)} so với kỳ trước`;

    $('statCredits').textContent = s.credits;
    $('statCreditsNote').innerHTML = trendHtml(s.creditsDelta, 0, ' tín chỉ');

    $('statPassed').textContent = `${s.passedCourses} / ${s.totalCourses}`;
    const percent = s.totalCourses ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0;
    $('statPassedNote').textContent = `${percent}% hoàn thành`;

    $('statTermAvg').textContent = s.termAverage.toFixed(1);
    $('statTermAvgNote').innerHTML = `${trendHtml(s.termAverageDelta, 1)} so với kỳ trước`;
}

// Bieu do

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART = { min: 0, max: 10, step: 2, padLeft: 46, padRight: 24, padTop: 30, padBottom: 32 };

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
    }
    return d;
}

function renderChart(dataset) {
    const container = $('chart');
    container.innerHTML = '';

    if (!dataset || !dataset.values.length) {
        container.innerHTML = '<p class="chart__empty">Chưa có dữ liệu điểm để hiển thị</p>';
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const { min, max, step, padLeft, padRight, padTop, padBottom } = CHART;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const n = dataset.values.length;

    const xAt = (i) => padLeft + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const yAt = (v) => padTop + plotH - ((v - min) / (max - min)) * plotH;

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'chartArea', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(
        svgEl('stop', { offset: 0, 'stop-color': '#3B6EF5', 'stop-opacity': 0.18 }),
        svgEl('stop', { offset: 1, 'stop-color': '#3B6EF5', 'stop-opacity': 0 }),
    );
    defs.append(grad);
    svg.append(defs);

    // Nhãn trục Y
    for (let v = min; v <= max; v += step) {
        const label = svgEl('text', { x: padLeft - 22, y: yAt(v) + 4, 'text-anchor': 'end', class: 'chart__label' });
        label.textContent = v;
        svg.append(label);
    }

    // Lưới dọc + nhãn trục X
    dataset.labels.forEach((text, i) => {
        svg.append(svgEl('line', { x1: xAt(i), x2: xAt(i), y1: padTop, y2: padTop + plotH, class: 'chart__grid' }));
        const label = svgEl('text', { x: xAt(i), y: height - 6, 'text-anchor': 'middle', class: 'chart__label' });
        label.textContent = text;
        svg.append(label);
    });
    svg.append(svgEl('line', { x1: padLeft - 5, x2: width - padRight + 18, y1: padTop + plotH, y2: padTop + plotH, class: 'chart__axis' }));

    // Vùng tô + đường
    const points = dataset.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    const line = smoothPath(points);
    const baseY = padTop + plotH;
    svg.append(svgEl('path', { d: `${line} V${baseY} H${points[0].x} Z`, class: 'chart__area' }));
    svg.append(svgEl('path', { d: line, class: 'chart__line' }));

    // Điểm + tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'chart__tooltip';

    const dots = points.map((p) => {
        const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 5.5, class: 'chart__point' });
        svg.append(dot);
        return dot;
    });

    const showTooltip = (i) => {
        dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
        tooltip.textContent = dataset.values[i].toFixed(1);
        tooltip.style.left = `${points[i].x}px`;
        tooltip.style.top = `${points[i].y}px`;
    };

    // Vùng bắt chuột rộng hơn chấm tròn cho dễ rê
    points.forEach((p, i) => {
        const hit = svgEl('circle', { cx: p.x, cy: p.y, r: 16, class: 'chart__hit' });
        hit.addEventListener('mouseenter', () => showTooltip(i));
        hit.addEventListener('click', () => showTooltip(i));
        svg.append(hit);
    });

    container.append(svg, tooltip);
    showTooltip(n - 1); // mặc định hiện điểm mới nhất như design
}

function setupChartTabs(chartData) {
    const tabs = document.querySelectorAll('.tabs__btn');
    let currentRange = 'current';

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            currentRange = tab.dataset.range;
            tabs.forEach((t) => {
                const active = t === tab;
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', active);
            });
            renderChart(chartData[currentRange]);
        });
    });

    // Vẽ lại khi đổi kích thước màn hình
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderChart(chartData[currentRange]), 150);
    });

    renderChart(chartData[currentRange]);
}

/* ===== Hoạt động gần đây ===== */
const ACTIVITY_ICONS = {
    grade:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
    goal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
};

function renderActivities(list) {
    const ul = $('activityList');
    if (!list.length) {
        ul.innerHTML = '<li class="list-empty">Chưa có hoạt động nào</li>';
        return;
    }
    ul.innerHTML = list.map((a) => `
        <li class="activity">
            <span class="activity__icon activity__icon--${a.type}">${ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.grade}</span>
            <span class="activity__text">${escapeHtml(a.text)}</span>
            <span class="activity__time">${escapeHtml(a.time)}</span>
        </li>`).join('');
}

/* ===== Lịch học sắp tới ===== */
function renderSchedule(list) {
    const ul = $('scheduleList');
    if (!list.length) {
        ul.innerHTML = '<li class="list-empty">Không có lịch học sắp tới</li>';
        return;
    }
    ul.innerHTML = list.map((l) => `
        <li class="lesson">
            <span class="lesson__date"><span>${escapeHtml(l.weekday)}</span><span>${escapeHtml(l.date)}</span></span>
            <span class="lesson__bar" style="background:${escapeHtml(l.color)}"></span>
            <span>
                <p class="lesson__name">${escapeHtml(l.name)}</p>
                <p class="lesson__time">${escapeHtml(l.time)}</p>
            </span>
        </li>`).join('');
}

/* ===== Sidebar trên mobile ===== */
function setupSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    const toggle = $('menuToggle');

    const setOpen = (open) => {
        sidebar.classList.toggle('is-open', open);
        overlay.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ===== Menu tài khoản (Xem thông tin / Đăng xuất) ===== */
function setupUserMenu() {
    const menu = $('userMenu');
    const toggle = $('userMenuToggle');
    const list = $('userMenuList');

    const setOpen = (open) => {
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
        if (open) list.querySelector('[role="menuitem"]')?.focus();
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(list.hidden);
    });

    // Click ra ngoài menu thì đóng
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !list.hidden) {
            setOpen(false);
            toggle.focus();
        }
    });

    $('logoutBtn').addEventListener('click', logout);
}

async function logout() {
    // Khi có API: gọi thu hồi refresh token trước (PB-03)
    // await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

    // Xóa token và thông tin phiên phía client
    ['accessToken', 'refreshToken', 'user'].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // replace(): không cho bấm Back quay lại dashboard
    window.location.replace('index.html');
}

/* ===== Khởi chạy ===== */
async function initDashboard() {
    setupSidebar();
    setupUserMenu();
    try {
        const data = await loadDashboardData();
        renderUser(data.user);
        renderStats(data.stats);
        setupChartTabs(data.chart);
        renderActivities(data.activities);
        renderSchedule(data.schedule);
    } catch (err) {
        console.error('Dashboard - dashboard.js:327', err);
        $('chart').innerHTML = '<p class="chart__empty">Không tải được dữ liệu. Vui lòng thử lại.</p>';
    }
}

initDashboard();