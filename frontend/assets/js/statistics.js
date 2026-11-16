/*
 * Trang Thống kê.
 * Dữ liệu mẫu: khi BE xong, thay loadStatisticsData() bằng gọi API thống kê (PB-21, Swagger v1.1).
 * GPA tích lũy, xếp loại, % tín chỉ được TÍNH từ dữ liệu bên dưới, không gõ cứng,
 * nên các số trên trang luôn khớp nhau.
 */
const MOCK_STATS = {
    cohorts: [{ id: 'k2025', name: 'Khóa 2025 - 2030' }],
    programCredits: 140,
    average10: 8.12,
    average10Delta: 0.10,
    // planned: true = học kỳ chưa học (cột nét đứt "Dự kiến")
    semesters: [
        { name: 'HK1 25-26', year: '2025-2026', gpa: 3.05, credits: 20 },
        { name: 'HK2 25-26', year: '2025-2026', gpa: 3.38, credits: 22 },
        { name: 'HK hè',     year: '2025-2026', gpa: 3.20, credits: 12 },
        { name: 'HK1 26-27', year: '2026-2027', gpa: 3.42, credits: 24 },
        { name: 'HK2 26-27', year: '2026-2027', planned: true },
        { name: 'HK3 26-27', year: '2026-2027', planned: true },
    ],
    programYears: ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'],
    gradeDistribution: [
        { grade: 'A+', count: 4 }, { grade: 'A', count: 7 },
        { grade: 'B+', count: 6 }, { grade: 'B', count: 4 },
        { grade: 'C+', count: 2 }, { grade: 'C', count: 1 },
        { grade: 'D', count: 1 },  { grade: 'F', count: 1 },
    ],
    creditBlocks: [
        { name: 'Giáo dục đại cương',  earned: 30, required: 35, color: 'green' },
        { name: 'Cơ sở ngành',         earned: 28, required: 45, color: 'blue' },
        { name: 'Chuyên ngành',        earned: 15, required: 45, color: 'purple' },
        { name: 'Tự chọn & Thực tập',  earned: 5,  required: 15, color: 'orange' },
    ],
    highlights: [
        { name: 'Ngôn ngữ lập trình C++',         semester: 'HK1 · 2026-2027', score: 9.2, grade: 'A+' },
        { name: 'Cấu trúc dữ liệu và giải thuật', semester: 'HK1 · 2026-2027', score: 8.8, grade: 'A' },
        { name: 'Vật lý 3 và thí nghiệm',         semester: 'HK1 · 2026-2027', score: 4.2, grade: 'F' },
    ],
};

async function loadStatisticsData(/* cohortId */) {
    const blockRequirements = {
        'Đại cương': { req: 35, color: 'green' },
        'Cơ sở ngành': { req: 45, color: 'blue' },
        'Chuyên ngành': { req: 45, color: 'purple' },
        'Tự chọn & Thực tập': { req: 15, color: 'orange' }
    };

    const gradeCounts = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };

    if (typeof StorageService !== 'undefined' && typeof GradeCalculator !== 'undefined') {
        const rawSemesters = StorageService.getSemesters();
        const rawCourses = StorageService.getCourses();

        const semesters = rawSemesters.map(s => {
            const semCourses = rawCourses.filter(c => c.semester_id === s.id);
            const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
            const credits = semCalc.totalCredits || 0;
            return {
                name: s.name.replace('Học kỳ ', 'HK'),
                year: s.academic_year || '2025-2026',
                gpa: semCalc.gpa !== null && credits > 0 ? semCalc.gpa : 0,
                credits: credits,
                planned: credits === 0
            };
        });

        rawCourses.forEach(c => {
            const calc = GradeCalculator.calculateCourseFinalScore(c.components || []);
            if (calc.isComplete && calc.finalScore10 !== null) {
                const letter = GradeCalculator.getGradeScale(calc.finalScore10).letter;
                if (gradeCounts[letter] !== undefined) gradeCounts[letter]++;
            }
        });
        const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }));

        const blockEarned = { 'Đại cương': 0, 'Cơ sở ngành': 0, 'Chuyên ngành': 0, 'Tự chọn & Thực tập': 0 };
        rawCourses.forEach(c => {
            const calc = GradeCalculator.calculateCourseFinalScore(c.components || []);
            if (calc.isComplete && calc.finalScore10 !== null && calc.finalScore10 >= 4.0) {
                const cat = c.category || 'Đại cương';
                if (blockEarned[cat] !== undefined) {
                    blockEarned[cat] += Number(c.credits) || 0;
                } else {
                    blockEarned['Tự chọn & Thực tập'] += Number(c.credits) || 0;
                }
            }
        });
        const creditBlocks = Object.entries(blockRequirements).map(([name, conf]) => ({
            name,
            earned: blockEarned[name] || 0,
            required: conf.req,
            color: conf.color
        }));

        const evaluatedCourses = rawCourses.map(c => {
            const calc = GradeCalculator.calculateCourseFinalScore(c.components || []);
            if (!calc.isComplete || calc.finalScore10 === null) return null;
            const scale = GradeCalculator.getGradeScale(calc.finalScore10);
            const sem = rawSemesters.find(s => s.id === c.semester_id);
            return {
                name: c.course_name,
                semester: sem ? `${sem.name} · ${sem.academic_year || ''}` : '',
                score: calc.finalScore10,
                grade: scale.letter
            };
        }).filter(Boolean);
        evaluatedCourses.sort((a, b) => b.score - a.score);
        const highlights = evaluatedCourses.slice(0, 3);

        const uniqueYears = Array.from(new Set(rawSemesters.map(s => s.academic_year).filter(Boolean)));
        if (uniqueYears.length === 0) uniqueYears.push('2025-2026');

        const cum = GradeCalculator.calculateCumulativeGPA(rawCourses);
        const avg10 = cum.avg10 || 0;

        // Tính chênh lệch hệ 10 giữa kỳ mới nhất và kỳ liền trước
        let avg10Delta = 0;
        if (rawSemesters.length >= 2) {
            const lastSemCourses = rawCourses.filter(c => c.semester_id === rawSemesters[rawSemesters.length - 1].id);
            const prevSemCourses = rawCourses.filter(c => c.semester_id === rawSemesters[rawSemesters.length - 2].id);
            const lastCalc = GradeCalculator.calculateSemesterGPA(lastSemCourses);
            const prevCalc = GradeCalculator.calculateSemesterGPA(prevSemCourses);
            avg10Delta = Number(((lastCalc.avg10 || 0) - (prevCalc.avg10 || 0)).toFixed(2));
        }

        return {
            cohorts: [{ id: 'k2025', name: 'Khóa 2025 - 2030' }],
            programCredits: 140,
            average10: Number(avg10.toFixed(2)),
            average10Delta,
            semesters,
            programYears: uniqueYears.length >= 5 ? uniqueYears : ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'],
            gradeDistribution,
            creditBlocks,
            highlights
        };
    }

    return {
        cohorts: [{ id: 'k2025', name: 'Khóa 2025 - 2030' }],
        programCredits: 140,
        average10: 0,
        average10Delta: 0,
        semesters: [],
        programYears: ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'],
        gradeDistribution: Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count })),
        creditBlocks: Object.entries(blockRequirements).map(([name, conf]) => ({ name, earned: 0, required: conf.req, color: conf.color })),
        highlights: []
    };
}

/* ===== Tính toán ===== */

/** GPA trung bình có trọng số tín chỉ */
function weightedGpa(list) {
    const credits = list.reduce((sum, s) => sum + s.credits, 0);
    if (!credits) return null;
    return list.reduce((sum, s) => sum + s.gpa * s.credits, 0) / credits;
}

/** Thêm GPA tích lũy sau mỗi học kỳ đã học */
function withCumulative(semesters) {
    const done = [];
    return semesters.map((s) => {
        if (s.planned) return { ...s };
        done.push(s);
        return { ...s, cumulative: weightedGpa(done) };
    });
}

/** Gộp học kỳ thành năm học */
function groupByYear(semesters, years) {
    const done = [];
    return years.map((year) => {
        const inYear = semesters.filter((s) => s.year === year && !s.planned);
        if (!inYear.length) return { name: year, planned: true };
        done.push(...inYear);
        return {
            name: year,
            gpa: weightedGpa(inYear),
            credits: inYear.reduce((sum, s) => sum + s.credits, 0),
            cumulative: weightedGpa(done),
        };
    });
}

// Xếp loại theo thang 4 (đối chiếu lại với quy chế đã chốt ở PB-46)
const RANKS = [
    { min: 3.6, name: 'Xuất sắc' },
    { min: 3.2, name: 'Giỏi' },
    { min: 2.5, name: 'Khá' },
    { min: 2.0, name: 'Trung bình' },
    { min: 0,   name: 'Yếu' },
];

function rankOf(gpa) {
    const index = RANKS.findIndex((r) => gpa >= r.min);
    return { current: RANKS[index], next: RANKS[index - 1] || null };
}

const GRADE_COLOR = { 'A+': 'green', A: 'green', 'B+': 'blue', B: 'blue', 'C+': 'orange', C: 'orange', 'D+': 'red', D: 'red', F: 'red' };

/* ===== Thẻ tổng hợp ===== */
function renderSummary(data, semesters) {
    const done = semesters.filter((s) => !s.planned);
    const gpa = weightedGpa(done);
    const prevGpa = weightedGpa(done.slice(0, -1));
    const credits = done.reduce((sum, s) => sum + s.credits, 0);

    $('statGpa').textContent = gpa !== null ? gpa.toFixed(2) : '--';
    $('statGpaNote').innerHTML = prevGpa !== null ? `${trendHtml(gpa - prevGpa)} so với kỳ trước` : 'Chưa có kỳ trước';

    $('statAvg10').textContent = data.average10.toFixed(2);
    $('statAvg10Note').innerHTML = `${trendHtml(data.average10Delta)} so với kỳ trước`;

    $('statCredits').textContent = `${credits} / ${data.programCredits}`;
    const percent = Math.round((credits / data.programCredits) * 100);
    $('statCreditsNote').innerHTML = `<span class="note-strong">${percent}%</span> chương trình đào tạo`;

    if (gpa === null) {
        $('statRank').textContent = '--';
        $('statRankNote').textContent = 'Chưa đủ dữ liệu để xếp loại';
        return;
    }
    const { current, next } = rankOf(gpa);
    $('statRank').textContent = current.name;
    $('statRankNote').innerHTML = next
        ? `<span class="note-strong">Cần ${next.min.toFixed(2)}</span> để đạt ${next.name}`
        : '<span class="note-strong">Thành tích cao nhất</span>';
}

/* ===== Biểu đồ GPA: cột = GPA kỳ/năm, đường = GPA tích lũy ===== */
const GPA_CHART = { max: 4, step: 1, padLeft: 40, padRight: 10, padTop: 26, padBottom: 30 };

function renderGpaChart(items) {
    const box = $('gpaChart');
    box.innerHTML = '';

    if (!items.length || items.every((i) => i.planned)) {
        box.innerHTML = '<p class="chart__empty">Chưa có học kỳ nào đủ điểm.<br>Hãy nhập điểm môn học để xem biểu đồ.</p>';
        return;
    }

    const width = box.clientWidth;
    const height = box.clientHeight;
    const { max, step, padLeft, padRight, padTop, padBottom } = GPA_CHART;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom - (plotW / items.length < 70 ? 14 : 0);
    const slot = plotW / items.length;
    const barW = Math.min(40, slot * 0.4);
    const compact = slot < 70;           // màn hẹp: nhãn trục X xuống 2 dòng

    const xCenter = (i) => padLeft + slot * i + slot / 2;
    const yAt = (v) => padTop + plotH - (v / max) * plotH;

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });

    // Lưới ngang + nhãn trục Y
    for (let v = 0; v <= max; v += step) {
        svg.append(svgEl('line', { x1: padLeft, x2: width - padRight, y1: yAt(v), y2: yAt(v), class: 'gpa-chart__grid' }));
        const label = svgEl('text', { x: 0, y: yAt(v) + 4, class: 'gpa-chart__label' });
        label.textContent = v.toFixed(1);
        svg.append(label);
    }

    let plannedLabelShown = false;
    items.forEach((item, i) => {
        const x = xCenter(i) - barW / 2;
        let bar;
        if (item.planned) {
            // Cột dự kiến: nét đứt, cao tới mốc 3.5
            bar = svgEl('rect', { x, y: yAt(3.5), width: barW, height: yAt(0) - yAt(3.5), rx: 4, class: 'gpa-chart__bar gpa-chart__bar--planned' });
            if (!plannedLabelShown && !compact) {
                const t = svgEl('text', { x: xCenter(i), y: yAt(3.5) - 8, 'text-anchor': 'middle', class: 'gpa-chart__value' });
                t.textContent = 'Dự kiến';
                svg.append(t);
                plannedLabelShown = true;
            }
        } else {
            bar = svgEl('rect', { x, y: yAt(item.gpa), width: barW, height: yAt(0) - yAt(item.gpa), rx: 4, class: 'gpa-chart__bar' });
            const value = svgEl('text', { x: xCenter(i), y: yAt(item.gpa) - 9, 'text-anchor': 'middle', class: 'gpa-chart__value' });
            value.textContent = item.gpa.toFixed(2);
            svg.append(value);
        }
        const tip = svgEl('title');
        tip.textContent = item.planned
            ? `${item.name}: chưa có điểm`
            : `${item.name}: GPA ${item.gpa.toFixed(2)} · ${item.credits} tín chỉ · tích lũy ${item.cumulative.toFixed(2)}`;
        bar.append(tip);
        svg.insertBefore(bar, svg.querySelector('.gpa-chart__value'));

        const label = svgEl('text', { x: xCenter(i), y: compact ? height - 20 : height - 6, 'text-anchor': 'middle', class: 'gpa-chart__label' });
        if (compact && item.name.includes(' ')) {
            // "HK1 25-26" -> 2 dòng: "HK1" / "25-26"
            const [first, ...rest] = item.name.split(' ');
            const line1 = svgEl('tspan', { x: xCenter(i) });
            const line2 = svgEl('tspan', { x: xCenter(i), dy: 14 });
            line1.textContent = first;
            line2.textContent = rest.join(' ');
            label.append(line1, line2);
        } else {
            label.textContent = item.name;
        }
        svg.append(label);
    });

    // Đường GPA tích lũy (chỉ qua các kỳ đã học)
    const points = items
        .map((item, i) => (item.planned ? null : { x: xCenter(i), y: yAt(item.cumulative) }))
        .filter(Boolean);
    svg.append(svgEl('polyline', { points: points.map((p) => `${p.x},${p.y}`).join(' '), class: 'gpa-chart__line' }));
    points.forEach((p) => svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'gpa-chart__point' })));

    box.append(svg);
}

const VIEW_LABELS = {
    semester: { title: 'GPA theo học kỳ', legend: 'học kỳ' },
    year:     { title: 'GPA theo năm học', legend: 'năm học' },
    all:      { title: 'GPA toàn khóa', legend: 'năm học' },
};

function chartItemsFor(view, data, semesters) {
    if (view === 'semester') return semesters;
    const usedYears = data.programYears.filter((y) => semesters.some((s) => s.year === y));
    return groupByYear(semesters, view === 'year' ? usedYears : data.programYears);
}

function setupViewTabs(data, semesters) {
    const tabs = document.querySelectorAll('.stats-toolbar .tabs__btn');
    let view = 'semester';

    const draw = () => {
        $('gpaChartTitle').textContent = VIEW_LABELS[view].title;
        $('legendTermLabel').textContent = `GPA ${VIEW_LABELS[view].legend}`;
        renderGpaChart(chartItemsFor(view, data, semesters));
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            view = tab.dataset.view;
            tabs.forEach((t) => {
                t.classList.toggle('is-active', t === tab);
                t.setAttribute('aria-selected', t === tab);
            });
            draw();
        });
    });

    let timer;
    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(draw, 150);
    });

    draw();
}

/* ===== Phân bố điểm chữ ===== */
function renderGradeDistribution(list) {
    const total = list.reduce((sum, g) => sum + g.count, 0);
    $('gradeTotal').textContent = `${total} môn`;

    if (!total) {
        $('gradeDist').innerHTML = '<li class="list-empty">Chưa có môn nào đủ điểm</li>';
        return;
    }
    const maxCount = Math.max(...list.map((g) => g.count));
    $('gradeDist').innerHTML = list.map((g) => `
        <li class="grade-row">
            <span class="grade-row__label">${escapeHtml(g.grade)}</span>
            <span class="bar" title="${g.count} môn điểm ${escapeHtml(g.grade)}">
                <span class="bar__fill bar__fill--${GRADE_COLOR[g.grade] || 'blue'}" style="width:${(g.count / maxCount) * 100}%"></span>
            </span>
            <span class="grade-row__count">${g.count}</span>
        </li>`).join('');
}

/* ===== Tiến độ tín chỉ ===== */
function renderCreditProgress(blocks, earnedTotal, programCredits) {
    $('creditPill').textContent = `${earnedTotal} / ${programCredits} TC`;
    $('creditProgress').innerHTML = blocks.map((b) => {
        const percent = Math.min(100, (b.earned / b.required) * 100);
        return `
        <li>
            <div class="credit-row__head">
                <span class="credit-row__name">${escapeHtml(b.name)}</span>
                <span class="credit-row__value">${b.earned}/${b.required} tín chỉ</span>
            </div>
            <span class="bar"><span class="bar__fill bar__fill--${b.color}" style="width:${percent}%"></span></span>
        </li>`;
    }).join('');
}

/* ===== Môn học nổi bật ===== */
function renderHighlights(list) {
    if (!list.length) {
        $('highlightList').innerHTML = '<li class="list-empty">Chưa có môn học nào</li>';
        return;
    }
    $('highlightList').innerHTML = list.map((c) => {
        const failed = c.grade === 'F';
        return `
        <li class="highlight">
            <div class="highlight__info">
                <p class="highlight__name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</p>
                <p class="highlight__sub${failed ? ' highlight__sub--danger' : ''}">${failed ? 'Cần học lại' : escapeHtml(c.semester)}</p>
            </div>
            <span class="highlight__score">${c.score.toFixed(1)}</span>
            <span class="grade-badge grade-badge--${GRADE_COLOR[c.grade] || 'blue'}">${escapeHtml(c.grade)}</span>
        </li>`;
    }).join('');
}

/* ===== Xuất báo cáo CSV (tạo tại FE, theo PB-27) ===== */

/** Chống CSV injection: ô bắt đầu bằng = + - @ thì thêm dấu ' phía trước */
function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportReport(data, semesters) {
    const rows = [['BÁO CÁO THỐNG KÊ HỌC TẬP'], [`Khóa: ${$('cohortSelect').selectedOptions[0]?.textContent || ''}`], []];

    rows.push(['Học kỳ', 'Năm học', 'Tín chỉ', 'GPA học kỳ', 'GPA tích lũy']);
    semesters.filter((s) => !s.planned).forEach((s) => {
        rows.push([s.name, s.year, s.credits, s.gpa.toFixed(2), s.cumulative.toFixed(2)]);
    });

    rows.push([], ['Điểm chữ', 'Số môn']);
    data.gradeDistribution.forEach((g) => rows.push([g.grade, g.count]));

    rows.push([], ['Khối kiến thức', 'Đã tích lũy', 'Yêu cầu']);
    data.creditBlocks.forEach((b) => rows.push([b.name, b.earned, b.required]));

    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    // ﻿ (BOM) để Excel đọc đúng tiếng Việt
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `thong-ke-hoc-tap-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/* ===== Khởi chạy ===== */
async function initStatistics() {
    const chartBox = $('gpaChart');
    if (chartBox) {
        chartBox.innerHTML = '<p class="chart__empty">Đang tải dữ liệu thống kê...</p>';
    }

    try {
        const data = await loadStatisticsData();
        const semesters = withCumulative(data.semesters);
        const earned = semesters.filter((s) => !s.planned).reduce((sum, s) => sum + s.credits, 0);

        $('cohortSelect').innerHTML = data.cohorts
            .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

        renderSummary(data, semesters);
        setupViewTabs(data, semesters);
        renderGradeDistribution(data.gradeDistribution);
        renderCreditProgress(data.creditBlocks, earned, data.programCredits);
        renderHighlights(data.highlights);

        const expBtn = $('exportBtn');
        if (expBtn && !expBtn.dataset.bound) {
            expBtn.dataset.bound = 'true';
            expBtn.addEventListener('click', () => exportReport(data, semesters));
        }
    } catch (err) {
        console.error('Statistics error:', err);
        if (chartBox) {
            chartBox.innerHTML = `
                <div class="chart__empty" style="text-align: center; color: var(--error);">
                    <p style="margin-bottom: 8px;">Không tải được dữ liệu thống kê. Vui lòng thử lại.</p>
                    <button type="button" onclick="initStatistics()" class="btn btn-primary btn-sm">Thử tải lại</button>
                </div>
            `;
        }
    }
}

initStatistics();