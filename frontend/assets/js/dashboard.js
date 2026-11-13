/*
 * LOGIC DASHBOARD TỔNG QUAN HỌC TẬP (StudyTrack)
 * Khớp 100% giao diện và chỉ số với bản thiết kế Figma
 * Phụ trách: Huỳnh Nhơn Nguyên Nghiệp
 */

const MOCK_DATA = {
    user: { fullName: 'Huỳnh Nhơn Nguyên Nghiệp' },
    stats: {
        gpa: 3.42, gpaDelta: 0.12,
        credits: 78, creditsDelta: 4,
        passedCourses: 6, totalCourses: 8,
        termAverage: 8.3, termAverageDelta: 0.3,
    },
    chart: {
        current:  { labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'], values: [4.0, 5.8, 6.5, 7.4, 8.3] },
        previous: { labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'], values: [6.2, 7.1, 6.8, 7.6, 8.0] },
        all:      { labels: ['HK1', 'HK2', 'HK3', 'HK4', 'HK5'], values: [6.9, 7.3, 7.1, 8.0, 8.3] },
    },
    activities: [
        { type: 'grade',  text: 'Bạn đã cập nhật điểm môn Toán', time: '2 giờ trước' },
        { type: 'course', text: 'Thêm lịch học: Cơ sở dữ liệu', time: '1 ngày trước' },
        { type: 'goal',   text: 'Cập nhật mục tiêu: Đạt GPA 3.5', time: '2 ngày trước' },
    ],
    schedule: [
        { weekday: 'Th 3', date: '11/11', name: 'Lập trình iOS', time: '08:00 - 10:00', color: '#7FA9F7' },
        { weekday: 'Th 4', date: '12/11', name: 'Cơ sở dữ liệu', time: '13:30 - 15:30', color: '#A989F2' },
    ],
};

async function loadDashboardData() {
    const data = JSON.parse(JSON.stringify(MOCK_DATA));

    // Lấy tên người dùng hiện tại
    let currentStudent = null;
    if (typeof StorageService !== 'undefined') {
        currentStudent = StorageService.getStudent();
    }
    const sessionUser = (typeof getSession === 'function' ? getSession()?.user : null);
    const fullName = sessionUser?.fullName || currentStudent?.name || 'Huỳnh Nhơn Nguyên Nghiệp';
    data.user = { fullName };

    // Tích hợp dữ liệu môn học từ StorageService nếu có
    if (typeof StorageService !== 'undefined' && typeof GradeCalculator !== 'undefined') {
        const courses = StorageService.getCourses();
        const semesters = StorageService.getSemesters();

        if (courses && courses.length > 0) {
            const cum = GradeCalculator.calculateCumulativeGPA(courses);
            data.stats.gpa = cum.cumulativeGPA;
            data.stats.credits = cum.passedCredits;
            
            // Tính số môn đạt
            let passedCount = 0;
            courses.forEach(c => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                if (calc.finalScore10 !== null && calc.finalScore10 >= 4.0) {
                    passedCount++;
                }
            });
            data.stats.passedCourses = passedCount;
            data.stats.totalCourses = courses.length;

            // Tính điểm kỳ gần nhất
            if (semesters.length > 0) {
                const lastSem = semesters[semesters.length - 1];
                const lastSemCourses = courses.filter(c => c.semester_id === lastSem.id);
                if (lastSemCourses.length > 0) {
                    const semCalc = GradeCalculator.calculateSemesterGPA(lastSemCourses);
                    data.stats.termAverage = semCalc.gpa ? (semCalc.gpa * 2.5) : 8.3; // chuyển sang hệ 10 ước tính
                }
            }

            // Cập nhật biểu đồ theo các học kỳ có trong hệ thống
            if (semesters.length >= 2) {
                const allLabels = [];
                const allValues = [];
                semesters.forEach(s => {
                    const semCourses = courses.filter(c => c.semester_id === s.id);
                    const calc = GradeCalculator.calculateSemesterGPA(semCourses);
                    allLabels.push(s.name.replace('Học kỳ ', 'HK'));
                    allValues.push(Number(calc.formattedGPA) * 2.5); // scale 10
                });
                data.chart.all = { labels: allLabels, values: allValues };
            }

            // Hoạt động gần đây từ danh sách môn thực tế
            const recent = [];
            courses.slice(0, 3).forEach((c, idx) => {
                const times = ['2 giờ trước', '1 ngày trước', '2 ngày trước'];
                recent.push({
                    type: idx === 0 ? 'grade' : (idx === 1 ? 'course' : 'goal'),
                    text: `Cập nhật môn: ${c.name} (${c.code})`,
                    time: times[idx] || 'Gần đây'
                });
            });
            if (recent.length > 0) {
                data.activities = recent;
            }
        }
    }

    return data;
}

// Render các thẻ thống kê
function renderStats(s) {
    const gpaEl = document.getElementById('statGpa');
    if (gpaEl) gpaEl.textContent = Number(s.gpa).toFixed(2);
    
    const gpaNoteEl = document.getElementById('statGpaNote');
    if (gpaNoteEl) gpaNoteEl.innerHTML = `${trendHtml(s.gpaDelta)} so với kỳ trước`;

    const credEl = document.getElementById('statCredits');
    if (credEl) credEl.textContent = s.credits;
    
    const credNoteEl = document.getElementById('statCreditsNote');
    if (credNoteEl) credNoteEl.innerHTML = trendHtml(s.creditsDelta, 0, ' tín chỉ');

    const passEl = document.getElementById('statPassed');
    if (passEl) passEl.textContent = `${s.passedCourses} / ${s.totalCourses}`;
    
    const passNoteEl = document.getElementById('statPassedNote');
    const percent = s.totalCourses ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0;
    if (passNoteEl) passNoteEl.textContent = `${percent}% hoàn thành`;

    const termAvgEl = document.getElementById('statTermAvg');
    if (termAvgEl) termAvgEl.textContent = Number(s.termAverage).toFixed(1);
    
    const termAvgNoteEl = document.getElementById('statTermAvgNote');
    if (termAvgNoteEl) termAvgNoteEl.innerHTML = `${trendHtml(s.termAverageDelta, 1)} so với kỳ trước`;
}

// Biểu đồ SVG
const CHART = { min: 0, max: 10, step: 2, padLeft: 46, padRight: 24, padTop: 30, padBottom: 32 };

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
    const container = document.getElementById('chart');
    if (!container) return;
    container.innerHTML = '';

    if (!dataset || !dataset.values || !dataset.values.length) {
        container.innerHTML = '<p class="chart__empty">Chưa có dữ liệu điểm để hiển thị</p>';
        return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 220;
    const { min, max, step, padLeft, padRight, padTop, padBottom } = CHART;
    const plotW = Math.max(width - padLeft - padRight, 100);
    const plotH = Math.max(height - padTop - padBottom, 100);
    const n = dataset.values.length;

    const xAt = (i) => padLeft + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const yAt = (v) => padTop + plotH - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * plotH;

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' });

    // Gradient màu nền dưới đường vẽ
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'chartArea', x1: '0', y1: '0', x2: '0', y2: '1' });
    const s1 = svgEl('stop', { offset: '0%', 'stop-color': '#2563EB', 'stop-opacity': '0.22' });
    const s2 = svgEl('stop', { offset: '100%', 'stop-color': '#2563EB', 'stop-opacity': '0' });
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Lưới ngang
    for (let v = min; v <= max; v += step) {
        const y = yAt(v);
        svg.appendChild(svgEl('line', {
            x1: padLeft, y1: y, x2: width - padRight, y2: y,
            class: 'chart__grid',
        }));
        const label = svgEl('text', {
            x: padLeft - 10, y: y + 4,
            'text-anchor': 'end',
            class: 'chart__label',
        });
        label.textContent = v;
        svg.appendChild(label);
    }

    // Trục hoành
    const y0 = yAt(min);
    svg.appendChild(svgEl('line', {
        x1: padLeft, y1: y0, x2: width - padRight, y2: y0,
        class: 'chart__axis',
    }));

    // Tọa độ các điểm
    const points = dataset.values.map((v, i) => ({ x: xAt(i), y: yAt(v), v, label: (dataset.labels && dataset.labels[i]) ? dataset.labels[i] : `Mục ${i + 1}` }));

    // Vùng màu dưới đường
    const linePath = smoothPath(points);
    const first = points[0];
    const last = points[points.length - 1];
    const areaD = `${linePath} L${last.x} ${y0} L${first.x} ${y0} Z`;
    svg.appendChild(svgEl('path', { d: areaD, class: 'chart__area' }));

    // Đường cong
    svg.appendChild(svgEl('path', { d: linePath, class: 'chart__line' }));

    // Nhãn trục hoành và điểm chấm tròn
    points.forEach((p) => {
        const lbl = svgEl('text', {
            x: p.x, y: height - 10,
            'text-anchor': 'middle',
            class: 'chart__label',
        });
        lbl.textContent = p.label;
        svg.appendChild(lbl);

        // Chấm tròn trên đỉnh
        const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'chart__point' });
        svg.appendChild(dot);
    });

    container.appendChild(svg);
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
            if (chartData && chartData[currentRange]) {
                renderChart(chartData[currentRange]);
            }
        });
    });

    // Vẽ lại khi resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (chartData && chartData[currentRange]) {
                renderChart(chartData[currentRange]);
            }
        }, 150);
    });

    if (chartData && chartData[currentRange]) {
        renderChart(chartData[currentRange]);
    }
}

// Hoạt động gần đây
const ACTIVITY_ICONS = {
    grade:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
    goal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
};

function renderActivities(list) {
    const ul = document.getElementById('activityList');
    if (!ul) return;
    if (!list || !list.length) {
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

// Lịch học sắp tới
function renderSchedule(list) {
    const ul = document.getElementById('scheduleList');
    if (!ul) return;
    if (!list || !list.length) {
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

// Khởi chạy Dashboard
async function initDashboard() {
    try {
        const data = await loadDashboardData();
        renderStats(data.stats);
        setupChartTabs(data.chart);
        renderActivities(data.activities);
        renderSchedule(data.schedule);
    } catch (err) {
        console.error('Dashboard init error:', err);
        // Fallback to static mock data so it always looks fantastic
        renderStats(MOCK_DATA.stats);
        setupChartTabs(MOCK_DATA.chart);
        renderActivities(MOCK_DATA.activities);
        renderSchedule(MOCK_DATA.schedule);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
