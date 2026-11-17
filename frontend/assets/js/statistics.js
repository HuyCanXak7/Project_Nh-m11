/*
 * LOGIC TRANG THỐNG KÊ HỌC TẬP CHUẨN FIGMA STUDYTRACK-E (StudyTrack-E-05-thong-ke 1)
 * Đọc trực tiếp dữ liệu từ localStorage của người dùng hiện tại (StorageService)
 * Hỗ trợ đầy đủ trạng thái Loading, Empty State và Error State (PB-40 / [T0694ED])
 */

// $() dùng chung từ app_shell.js (khai báo lại ở đây làm cả file lỗi)

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function trendHtml(delta) {
    const val = Number(delta) || 0;
    const sign = val >= 0 ? '+' : '';
    const cls = val >= 0 ? 'trend--up' : 'trend--down';
    return `<strong class="trend ${cls}">${sign}${val.toFixed(2)}</strong>`;
}

function formatShortSemLabel(sem) {
    if (!sem) return '';
    const rawName = (sem.name || '').trim();
    const yr = (sem.academic_year || '2025-2026').trim();
    if (/hè/i.test(rawName)) {
        const endYr = yr.split('-')[1]?.trim().slice(-2) || '26';
        return `HK hè ${endYr}`;
    }
    const shortName = rawName.replace(/Học kỳ\s*/i, 'HK');
    const shortYr = yr.replace(/20(\d{2})\s*-\s*20(\d{2})/, '$1–$2');
    return shortYr ? `${shortName} ${shortYr}` : shortName;
}

async function loadStatisticsData(/* cohortId */) {
    const blockRequirements = {
        'Đại cương': { label: 'Giáo dục đại cương', req: 35, sqColor: '#0F1F38' },
        'Cơ sở ngành': { label: 'Cơ sở ngành', req: 45, sqColor: '#CBD5E8' },
        'Chuyên ngành': { label: 'Chuyên ngành', req: 45, sqColor: '#3EE09B' },
        'Tự chọn & Thực tập': { label: 'Tự chọn và thực tập', req: 15, sqColor: '#7DD3FC' }
    };

    const gradeCounts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'F': 0 };

    if (typeof StorageService !== 'undefined' && typeof GradeCalculator !== 'undefined') {
        const rawSemesters = StorageService.getSemesters();
        const rawCourses = StorageService.getCourses();
        const goal = StorageService.getGoal();
        const targetGpa = Number(goal?.target_gpa) > 0 ? Number(goal.target_gpa) : 3.60;

        const semesters = rawSemesters.map(s => {
            const semCourses = rawCourses.filter(c => c.semester_id === s.id);
            const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
            const credits = semCalc.totalCredits || 0;
            return {
                id: s.id,
                name: formatShortSemLabel(s),
                year: s.academic_year || '2025-2026',
                gpa: semCalc.gpa !== null && credits > 0 ? semCalc.gpa : 0,
                credits: credits,
                planned: credits === 0
            };
        });

        if (semesters.some(s => !s.planned) && semesters.filter(s => s.planned).length === 0) {
            semesters.push(
                { name: 'HK2 26–27', year: '2026-2027', planned: true },
                { name: 'HK hè 27', year: '2026-2027', planned: true }
            );
        }

        rawCourses.forEach(c => {
            const calc = GradeCalculator.calculateCourseFinalScore(c.components || []);
            if (calc.isComplete && calc.finalScore10 !== null) {
                const rawLetter = GradeCalculator.getGradeScale(calc.finalScore10).letter;
                const key = rawLetter === 'A+' ? 'A' : rawLetter;
                if (gradeCounts[key] !== undefined) gradeCounts[key]++;
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
        const creditBlocks = Object.entries(blockRequirements).map(([key, conf]) => ({
            name: conf.label,
            earned: blockEarned[key] || 0,
            required: conf.req,
            sqColor: conf.sqColor
        }));

        // Ưu tiên lấy môn nổi bật của học kỳ gần nhất có đủ điểm (khớp chuẩn StudyTrack-E-05-thong-ke 1)
        const latestGradedSem = [...rawSemesters].reverse().find(s => {
            const sc = rawCourses.filter(c => c.semester_id === s.id);
            return sc.filter(c => GradeCalculator.calculateCourseFinalScore(c.components || []).isComplete).length >= 3;
        });
        const sourceCoursesForHighlight = latestGradedSem
            ? rawCourses.filter(c => c.semester_id === latestGradedSem.id)
            : rawCourses;

        const evaluatedCourses = sourceCoursesForHighlight.map(c => {
            const calc = GradeCalculator.calculateCourseFinalScore(c.components || []);
            if (!calc.isComplete || calc.finalScore10 === null) return null;
            const scale = GradeCalculator.getGradeScale(calc.finalScore10);
            const sem = rawSemesters.find(s => s.id === c.semester_id);
            return {
                name: c.course_name,
                semester: sem ? `${sem.name.replace(/Học kỳ\s*/i, 'HK')} ${(sem.academic_year || '').replace('-', '–')}` : '',
                score: calc.finalScore10,
                grade: scale.letter
            };
        }).filter(Boolean);

        evaluatedCourses.sort((a, b) => b.score - a.score);
        let highlights = [];
        if (evaluatedCourses.length <= 4) {
            highlights = evaluatedCourses.map((c, idx) => ({
                ...c,
                isWarn: c.score < 7.0 || (evaluatedCourses.length >= 3 && idx === evaluatedCourses.length - 1)
            }));
        } else {
            const top3 = evaluatedCourses.slice(0, 3).map(c => ({ ...c, isWarn: false }));
            const lowest = { ...evaluatedCourses[evaluatedCourses.length - 1], isWarn: true };
            highlights = [...top3, lowest];
        }

        const uniqueYears = Array.from(new Set(rawSemesters.map(s => s.academic_year).filter(Boolean)));
        if (uniqueYears.length === 0) uniqueYears.push('2025-2026');

        const cum = GradeCalculator.calculateCumulativeGPA(rawCourses);
        const avg10 = cum.cumulativeAvg10 || cum.avg10 || 0;

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
            targetGpa,
            average10: Number(avg10.toFixed(2)),
            average10Delta: avg10Delta,
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
        targetGpa: 3.60,
        average10: 0,
        average10Delta: 0,
        semesters: [],
        programYears: ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'],
        gradeDistribution: Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count })),
        creditBlocks: Object.entries(blockRequirements).map(([, conf]) => ({
            name: conf.label,
            earned: 0,
            required: conf.req,
            sqColor: conf.sqColor
        })),
        highlights: []
    };
}

/* ===== Tính toán ===== */
function weightedGpa(list) {
    const credits = list.reduce((sum, s) => sum + s.credits, 0);
    if (!credits) return null;
    return list.reduce((sum, s) => sum + s.gpa * s.credits, 0) / credits;
}

function withCumulative(semesters) {
    const done = [];
    return semesters.map((s) => {
        if (s.planned) return { ...s };
        done.push(s);
        return { ...s, cumulative: weightedGpa(done) };
    });
}

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

const GRADE_BAR_COLOR = {
    'A+': 'emerald',
    'A':  'emerald',
    'B+': 'slate',
    'B':  'slate',
    'C+': 'coral',
    'C':  'coral',
    'D+': 'coral',
    'D':  'slate',
    'F':  'slate'
};

/* ===== Thẻ tổng hợp (4 Ô nối liền chuẩn StudyTrack-E) ===== */
function renderSummary(data, semesters) {
    const done = semesters.filter((s) => !s.planned);
    const gpa = weightedGpa(done);
    const prevGpa = weightedGpa(done.slice(0, -1));
    const credits = done.reduce((sum, s) => sum + s.credits, 0);

    $('statGpa').textContent = gpa !== null ? gpa.toFixed(2) : '0.00';
    $('statGpaNote').innerHTML = prevGpa !== null
        ? `${trendHtml(gpa - prevGpa)} so với kỳ trước`
        : 'Chưa có kỳ trước';

    $('statAvg10').textContent = data.average10.toFixed(2);
    $('statAvg10Note').innerHTML = done.length > 0
        ? `${trendHtml(data.average10Delta)} so với kỳ trước`
        : 'Thang điểm 10';

    $('statCredits').innerHTML = `${credits} <span class="stat-card__value-sub">/ ${data.programCredits}</span>`;
    const percent = Math.min(100, Math.round((credits / data.programCredits) * 100));
    $('statCreditsNote').innerHTML = `${percent}% chương trình đào tạo`;

    const credBarFill = $('statCreditsBarFill');
    if (credBarFill) {
        credBarFill.style.width = `${percent}%`;
    }

    if (gpa === null) {
        $('statRank').textContent = '--';
        $('statRankNote').textContent = 'Chưa đủ dữ liệu để xếp loại';
        return;
    }

    const { current, next } = rankOf(gpa);
    $('statRank').textContent = current.name;
    $('statRankNote').innerHTML = next
        ? `Cần <span class="note-mint">${next.min.toFixed(2)}</span> để đạt ${next.name}`
        : '<span class="note-mint">Đã đạt hạng cao nhất</span>';
}

/* ===== Biểu đồ GPA chuẩn StudyTrack-E (HTML/CSS Bars + Đường #0F1F38 + Đường đỏ MỤC TIÊU XUẤT SẮC 3.60) ===== */
function renderGpaChart(items, targetGpa = 3.60) {
    const box = $('gpaChart');
    if (!box) return;
    box.innerHTML = '';

    if (!items.length || items.every((i) => i.planned)) {
        box.innerHTML = `
            <div class="chart__empty">
                <p style="margin-bottom: 10px;">Chưa có học kỳ nào đủ điểm. Hãy nhập điểm môn học để xem biểu đồ.</p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <a href="courses.html" class="btn-figma-primary" style="text-decoration: none; height: 32px; font-size: 12px;">+ Thêm môn học</a>
                    <button type="button" onclick="handleResetData()" class="btn-figma-outline" style="height: 32px; font-size: 12px;">Nạp dữ liệu mẫu</button>
                </div>
            </div>
        `;
        return;
    }

    const lastRealIdx = items.map((it, idx) => (!it.planned ? idx : -1)).filter(i => i >= 0).pop();

    const yAxisHtml = [4, 3, 2, 1, 0].map(v => {
        const bottomPct = (v / 4.0) * 100;
        return `<span class="e-html-chart__ylabel" style="bottom: ${bottomPct}%;">${v.toFixed(1)}</span>`;
    }).join('');

    const gridLinesHtml = [4, 3, 2, 1].map(v => {
        const bottomPct = (v / 4.0) * 100;
        return `<div class="e-html-chart__gridline" style="bottom: ${bottomPct}%;"></div>`;
    }).join('');

    const targetPct = Math.min(96, Math.max(10, (targetGpa / 4.0) * 100));

    const colsHtml = items.map((item, i) => {
        if (item.planned) {
            const hPct = (3.35 / 4.0) * 100;
            return `
                <div class="e-html-chart__col">
                    <div class="e-html-chart__bar e-html-chart__bar--planned" style="height: ${hPct}%;">
                        <span class="e-html-chart__bar-val">Dự kiến</span>
                    </div>
                </div>
            `;
        }
        const val = Number(item.gpa) || 0;
        const cumVal = Number(item.cumulative || item.gpa) || 0;
        const hPct = Math.max(12, Math.min(100, (val / 4.0) * 100));
        const dotPct = Math.max(4, Math.min(98, (cumVal / 4.0) * 100));
        const isLatest = i === lastRealIdx;

        return `
            <div class="e-html-chart__col">
                <div class="e-html-chart__bar ${isLatest ? 'e-html-chart__bar--latest' : ''}" style="height: ${hPct}%;">
                    <span class="e-html-chart__bar-val">${val.toFixed(2)}</span>
                </div>
                <span class="e-html-chart__dot" style="bottom: ${dotPct}%;"></span>
            </div>
        `;
    }).join('');

    const xAxisHtml = items.map(item => `
        <span class="e-html-chart__xlabel">${escapeHtml(item.name)}</span>
    `).join('');

    box.innerHTML = `
        <div class="e-html-chart">
            <div class="e-html-chart__yaxis">${yAxisHtml}</div>
            <div class="e-html-chart__plot" id="statsChartPlot">
                ${gridLinesHtml}
                <div class="e-html-chart__target" style="bottom: ${targetPct}%;">
                    <span class="e-html-chart__target-label">MỤC TIÊU XUẤT SẮC ${targetGpa.toFixed(2)}</span>
                </div>
                <svg class="e-html-chart__svg-line" id="statsChartLineSvg"></svg>
                <div class="e-html-chart__cols">${colsHtml}</div>
            </div>
            <div class="e-html-chart__xaxis">${xAxisHtml}</div>
        </div>
    `;

    requestAnimationFrame(() => {
        const plot = document.getElementById('statsChartPlot');
        const svg = document.getElementById('statsChartLineSvg');
        if (!plot || !svg) return;
        const plotRect = plot.getBoundingClientRect();
        const dots = Array.from(plot.querySelectorAll('.e-html-chart__dot'));
        if (dots.length < 2 || plotRect.width <= 0) return;

        const pts = dots.map(d => {
            const r = d.getBoundingClientRect();
            const x = (r.left - plotRect.left) + r.width / 2;
            const y = (r.top - plotRect.top) + r.height / 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        svg.setAttribute('viewBox', `0 0 ${plotRect.width} ${plotRect.height}`);
        svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#0F1F38" stroke-width="1.6"/>`;
    });
}

const VIEW_LABELS = {
    semester: { title: 'GPA theo học kỳ', legend: 'Học kỳ' },
    year:     { title: 'GPA theo năm học', legend: 'Năm học' },
    all:      { title: 'GPA toàn khóa', legend: 'Năm học' },
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
        $('legendTermLabel').textContent = VIEW_LABELS[view].legend;
        renderGpaChart(chartItemsFor(view, data, semesters), data.targetGpa || 3.60);
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
    $('gradeTotal').textContent = `${total} MÔN`;

    if (!total) {
        $('gradeDist').innerHTML = '<li class="list-empty">Chưa có môn nào đủ điểm</li>';
        return;
    }
    const maxCount = Math.max(1, ...list.map((g) => g.count));
    $('gradeDist').innerHTML = list.map((g) => `
        <li class="grade-row">
            <span class="grade-row__label">${escapeHtml(g.grade)}</span>
            <span class="bar" title="${g.count} môn điểm ${escapeHtml(g.grade)}">
                <span class="bar__fill bar__fill--${GRADE_BAR_COLOR[g.grade] || 'slate'}" style="width:${(g.count / maxCount) * 100}%"></span>
            </span>
            <span class="grade-row__count">${g.count}</span>
        </li>`).join('');
}

/* ===== Tiến độ tín chỉ theo khối kiến thức chuẩn StudyTrack-E (Stacked Bar + Table Rows) ===== */
function renderCreditProgress(blocks, earnedTotal, programCredits) {
    $('creditPill').textContent = `${earnedTotal} / ${programCredits}`;

    const stackedEl = $('creditStackedBar');
    if (stackedEl) {
        stackedEl.innerHTML = blocks.map(b => {
            const w = Math.max(0, (b.earned / programCredits) * 100);
            return `<span style="width:${w.toFixed(2)}%; background:${b.sqColor};" title="${escapeHtml(b.name)}: ${b.earned}/${b.required} TC"></span>`;
        }).join('');
    }

    $('creditProgress').innerHTML = blocks.map((b) => {
        const percent = Math.min(100, Math.round((b.earned / b.required) * 100));
        return `
        <li class="credit-row">
            <span class="credit-row__name">
                <i class="credit-row__sq" style="background:${b.sqColor}"></i>
                ${escapeHtml(b.name)}
            </span>
            <span class="credit-row__ratio">${b.earned} / ${b.required}</span>
            <span class="credit-row__pct">${percent}%</span>
        </li>`;
    }).join('');
}

/* ===== Môn nổi bật chuẩn StudyTrack-E (01, 02, 03, !) ===== */
function renderHighlights(list) {
    if (!list.length) {
        $('highlightList').innerHTML = '<li class="list-empty">Chưa có môn học nào đủ điểm</li>';
        return;
    }
    $('highlightList').innerHTML = list.map((c, idx) => {
        const isWarn = c.isWarn || c.grade === 'F' || c.score < 7.0;
        const badgeText = isWarn && idx === list.length - 1 && list.length >= 2
            ? '!'
            : String(idx + 1).padStart(2, '0');
        const subText = c.grade === 'F'
            ? 'Cần học lại'
            : (isWarn ? 'Điểm thấp nhất kỳ' : escapeHtml(c.semester));
        const sqColor = (c.grade === 'A+' || c.grade === 'A')
            ? '#10B981'
            : ((c.grade === 'B+' || c.grade === 'B') ? '#0F1F38' : '#EF4444');

        return `
        <li class="highlight ${isWarn ? 'highlight--warn' : ''}">
            <span class="highlight__rank">${badgeText}</span>
            <div class="highlight__info">
                <p class="highlight__name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</p>
                <p class="highlight__sub${isWarn ? ' highlight__sub--danger' : ''}">${subText}</p>
            </div>
            <span class="highlight__score">${c.score.toFixed(1)}</span>
            <span class="highlight__grade">
                <i class="highlight__grade-sq" style="background:${sqColor}"></i>
                ${escapeHtml(c.grade)}
            </span>
        </li>`;
    }).join('');
}

/* ===== Xuất báo cáo CSV (tạo tại FE, theo PB-27) ===== */
function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportReport(data, semesters) {
    const rows = [['BÁO CÁO THỐNG KÊ HỌC TẬP'], [`Khóa: ${$('cohortSelect').selectedOptions[0]?.textContent || 'Khóa 2025 - 2030'}`], []];

    rows.push(['Học kỳ', 'Năm học', 'Tín chỉ', 'GPA học kỳ', 'GPA tích lũy']);
    semesters.filter((s) => !s.planned).forEach((s) => {
        rows.push([s.name, s.year, s.credits, s.gpa.toFixed(2), s.cumulative.toFixed(2)]);
    });

    rows.push([], ['Điểm chữ', 'Số môn']);
    data.gradeDistribution.forEach((g) => rows.push([g.grade, g.count]));

    rows.push([], ['Khối kiến thức', 'Đã tích lũy', 'Yêu cầu']);
    data.creditBlocks.forEach((b) => rows.push([b.name, b.earned, b.required]));

    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
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
        console.error('Statistics error: - statistics.js:561', err);
        if (chartBox) {
            chartBox.innerHTML = `
                <div class="chart__empty" style="text-align: center; color: var(--danger);">
                    <p style="margin-bottom: 8px;">Không tải được dữ liệu thống kê. Vui lòng thử lại.</p>
                    <button type="button" onclick="initStatistics()" class="btn-figma-primary">Thử tải lại</button>
                </div>
            `;
        }
    }
}

initStatistics();