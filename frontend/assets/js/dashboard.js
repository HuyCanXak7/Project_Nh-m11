/*
 * LOGIC DASHBOARD TỔNG QUAN HỌC TẬP (StudyTrack)
 * Đọc trực tiếp dữ liệu của người dùng hiện tại từ localStorage (StorageService)
 * Có đầy đủ trạng thái Loading, Empty State và Error State (PB-40 / [T0694ED])
 */

async function loadDashboardData() {
    let currentStudent = null;
    if (typeof StorageService !== 'undefined') {
        currentStudent = StorageService.getStudent();
    }
    const sessionUser = (typeof getSession === 'function' ? getSession()?.user : null);
    const fullName = sessionUser?.fullName || currentStudent?.name || 'Sinh viên';

    const data = {
        user: { fullName },
        stats: {
            gpa: 0,
            gpaDelta: 0,
            credits: 0,
            creditsDelta: 0,
            passedCourses: 0,
            totalCourses: 0,
            termAverage: 0,
            termAverageDelta: 0,
            hasData: false
        },
        chart: {
            current:  { labels: [], values: [] },
            previous: { labels: [], values: [] },
            all:      { labels: [], values: [] }
        },
        activities: [],
        schedule: []
    };

    if (typeof StorageService !== 'undefined' && typeof GradeCalculator !== 'undefined') {
        const courses = StorageService.getCourses();
        const semesters = StorageService.getSemesters();

        if (courses && courses.length > 0) {
            data.stats.hasData = true;
            const cum = GradeCalculator.calculateCumulativeGPA(courses);
            data.stats.gpa = cum.cumulativeGPA;
            data.stats.credits = cum.passedCredits;

            let passedCount = 0;
            courses.forEach(c => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                if (calc.isComplete && calc.finalScore10 !== null && calc.finalScore10 >= 4.0) {
                    passedCount++;
                }
            });
            data.stats.passedCourses = passedCount;
            data.stats.totalCourses = courses.length;

            // Tính điểm học kỳ gần nhất và kỳ trước đó
            if (semesters.length > 0) {
                const lastSem = semesters[semesters.length - 1];
                const lastSemCourses = courses.filter(c => c.semester_id === lastSem.id);
                const lastSemCalc = GradeCalculator.calculateSemesterGPA(lastSemCourses);
                data.stats.termAverage = lastSemCalc.avg10 || 0;
                data.stats.creditsDelta = lastSemCalc.passedCredits || 0;

                if (semesters.length >= 2) {
                    const prevSem = semesters[semesters.length - 2];
                    const prevSemCourses = courses.filter(c => c.semester_id === prevSem.id);
                    const prevSemCalc = GradeCalculator.calculateSemesterGPA(prevSemCourses);
                    data.stats.gpaDelta = Number(((lastSemCalc.gpa || 0) - (prevSemCalc.gpa || 0)).toFixed(2));
                    data.stats.termAverageDelta = Number(((lastSemCalc.avg10 || 0) - (prevSemCalc.avg10 || 0)).toFixed(1));

                    // Biểu đồ kỳ trước: điểm các môn trong học kỳ trước
                    const prevCompleted = prevSemCourses
                        .map(c => ({ code: c.course_code, calc: GradeCalculator.calculateCourseFinalScore(c.components) }))
                        .filter(item => item.calc.isComplete);
                    data.chart.previous = {
                        labels: prevCompleted.map(i => i.code),
                        values: prevCompleted.map(i => i.calc.finalScore10)
                    };
                }

                // Biểu đồ kỳ này: điểm các môn trong học kỳ gần nhất
                const currCompleted = lastSemCourses
                    .map(c => ({ code: c.course_code, calc: GradeCalculator.calculateCourseFinalScore(c.components) }))
                    .filter(item => item.calc.isComplete);
                data.chart.current = {
                    labels: currCompleted.map(i => i.code),
                    values: currCompleted.map(i => i.calc.finalScore10)
                };

                // Biểu đồ toàn bộ các kỳ
                const allLabels = [];
                const allValues = [];
                semesters.forEach(s => {
                    const semCourses = courses.filter(c => c.semester_id === s.id);
                    const calc = GradeCalculator.calculateSemesterGPA(semCourses);
                    if (semCourses.length > 0) {
                        allLabels.push(s.name.replace('Học kỳ ', 'HK'));
                        allValues.push(Number(calc.avg10 || 0));
                    }
                });
                data.chart.all = { labels: allLabels, values: allValues };

                // Nếu kỳ hiện tại chưa có môn hoàn thành nhưng có môn ở kỳ khác, hiển thị toàn khóa
                if (data.chart.current.values.length === 0 && allValues.length > 0) {
                    data.chart.current = { labels: allLabels, values: allValues };
                }
            }

            // Hoạt động gần đây dựa trên dữ liệu thực của người dùng
            const recent = [];
            courses.slice(-3).reverse().forEach((c, idx) => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                recent.push({
                    type: calc.isComplete ? 'grade' : 'course',
                    text: calc.isComplete
                        ? `Hoàn thành điểm môn ${c.course_name} (${c.course_code}): ${calc.finalScore10}`
                        : `Đang học môn ${c.course_name} (${c.course_code})`,
                    time: idx === 0 ? 'Mới cập nhật' : 'Trong học kỳ'
                });
            });
            data.activities = recent;

            // Lịch học sắp tới suy ra từ các môn trong học kỳ mới nhất
            const latestSem = semesters[semesters.length - 1];
            const latestCourses = latestSem ? courses.filter(c => c.semester_id === latestSem.id) : courses;
            const colors = ['#7FA9F7', '#A989F2', '#34D399', '#FBBF24'];
            const weekdays = ['Th 2', 'Th 4', 'Th 6', 'Th 3'];
            const times = ['07:30 - 09:30', '09:45 - 11:45', '13:30 - 15:30', '15:45 - 17:45'];
            data.schedule = latestCourses.slice(0, 3).map((c, idx) => ({
                weekday: weekdays[idx % weekdays.length],
                date: c.course_code || `Môn ${idx + 1}`,
                name: c.course_name,
                time: times[idx % times.length],
                color: colors[idx % colors.length]
            }));
        }
    }

    // PB-19: có BE thật thì lấy GPA + tín chỉ tích lũy từ server (đã xử lý môn F và học lại)
    if (typeof USE_MOCK !== 'undefined' && !USE_MOCK) {
        try {
            const gpa = await apiFetch('/gpa/cumulative');
            data.stats.gpa = gpa.gpa4 ?? 0;
            data.stats.credits = gpa.passedCredits;
        } catch (err) {
            console.warn('Không lấy được GPA từ server, dùng số tính cục bộ:', err);
        }
    }

    return data;
}

// Render các thẻ thống kê
function renderStats(s) {
    const gpaEl = document.getElementById('statGpa');
    if (gpaEl) gpaEl.textContent = s.hasData ? Number(s.gpa).toFixed(2) : '0.00';

    const gpaNoteEl = document.getElementById('statGpaNote');
    if (gpaNoteEl) {
        gpaNoteEl.innerHTML = s.hasData
            ? `${trendHtml(s.gpaDelta)} so với kỳ trước`
            : 'Chưa có dữ liệu môn học';
    }

    const credEl = document.getElementById('statCredits');
    if (credEl) credEl.textContent = s.credits;

    const credNoteEl = document.getElementById('statCreditsNote');
    if (credNoteEl) {
        credNoteEl.innerHTML = s.hasData
            ? trendHtml(s.creditsDelta, 0, ' tín chỉ kỳ gần nhất')
            : '0 tín chỉ tích lũy';
    }

    const passEl = document.getElementById('statPassed');
    if (passEl) passEl.textContent = `${s.passedCourses} / ${s.totalCourses}`;

    const passNoteEl = document.getElementById('statPassedNote');
    const percent = s.totalCourses ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0;
    if (passNoteEl) passNoteEl.textContent = s.hasData ? `${percent}% môn đạt` : 'Hãy thêm môn học';

    const termAvgEl = document.getElementById('statTermAvg');
    if (termAvgEl) termAvgEl.textContent = s.hasData ? Number(s.termAverage).toFixed(1) : '0.0';

    const termAvgNoteEl = document.getElementById('statTermAvgNote');
    if (termAvgNoteEl) {
        termAvgNoteEl.innerHTML = s.hasData
            ? `${trendHtml(s.termAverageDelta, 1)} so với kỳ trước`
            : 'Thang điểm 10';
    }
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
        container.innerHTML = `
            <div class="chart__empty" style="text-align: center; padding: 24px 12px;">
                <p style="margin-bottom: 10px;">Chưa có dữ liệu điểm hoàn chỉnh để vẽ biểu đồ.</p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <a href="courses.html" class="btn btn-primary btn-sm" style="text-decoration: none;">+ Thêm môn & nhập điểm</a>
                    <button type="button" onclick="handleResetData()" class="btn btn-secondary btn-sm">Nạp dữ liệu mẫu</button>
                </div>
            </div>
        `;
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

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'chartArea', x1: '0', y1: '0', x2: '0', y2: '1' });
    const s1 = svgEl('stop', { offset: '0%', 'stop-color': '#2563EB', 'stop-opacity': '0.22' });
    const s2 = svgEl('stop', { offset: '100%', 'stop-color': '#2563EB', 'stop-opacity': '0' });
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

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

    const y0 = yAt(min);
    svg.appendChild(svgEl('line', {
        x1: padLeft, y1: y0, x2: width - padRight, y2: y0,
        class: 'chart__axis',
    }));

    const points = dataset.values.map((v, i) => ({
        x: xAt(i),
        y: yAt(v),
        v,
        label: (dataset.labels && dataset.labels[i]) ? dataset.labels[i] : `Mục ${i + 1}`
    }));

    if (points.length >= 2) {
        const linePath = smoothPath(points);
        const first = points[0];
        const last = points[points.length - 1];
        const areaD = `${linePath} L${last.x} ${y0} L${first.x} ${y0} Z`;
        svg.appendChild(svgEl('path', { d: areaD, class: 'chart__area' }));
        svg.appendChild(svgEl('path', { d: linePath, class: 'chart__line' }));
    }

    points.forEach((p) => {
        const lbl = svgEl('text', {
            x: p.x, y: height - 10,
            'text-anchor': 'middle',
            class: 'chart__label',
        });
        lbl.textContent = p.label;
        svg.appendChild(lbl);

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

const ACTIVITY_ICONS = {
    grade:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
    goal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
};

function renderActivities(list) {
    const ul = document.getElementById('activityList');
    if (!ul) return;
    if (!list || !list.length) {
        ul.innerHTML = '<li class="list-empty">Chưa có hoạt động học tập nào được ghi nhận</li>';
        return;
    }
    ul.innerHTML = list.map((a) => `
        <li class="activity">
            <span class="activity__icon activity__icon--${a.type}">${ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.grade}</span>
            <span class="activity__text">${escapeHtml(a.text)}</span>
            <span class="activity__time">${escapeHtml(a.time)}</span>
        </li>`).join('');
}

function renderSchedule(list) {
    const ul = document.getElementById('scheduleList');
    if (!ul) return;
    if (!list || !list.length) {
        ul.innerHTML = '<li class="list-empty">Chưa có môn học nào trong học kỳ hiện tại</li>';
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

async function initDashboard() {
    const chartBox = document.getElementById('chart');
    if (chartBox) {
        chartBox.innerHTML = '<p class="chart__empty">Đang tải dữ liệu tổng quan...</p>';
    }

    try {
        const data = await loadDashboardData();
        renderStats(data.stats);
        setupChartTabs(data.chart);
        renderActivities(data.activities);
        renderSchedule(data.schedule);
    } catch (err) {
        console.error('Dashboard init error:', err);
        if (chartBox) {
            chartBox.innerHTML = `
                <div class="chart__empty" style="text-align: center; color: var(--error);">
                    <p style="margin-bottom: 8px;">Không thể tải dữ liệu tổng quan. Vui lòng thử lại.</p>
                    <button type="button" onclick="initDashboard()" class="btn btn-primary btn-sm">Thử tải lại</button>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
