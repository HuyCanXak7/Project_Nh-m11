/*
 * LOGIC DASHBOARD TỔNG QUAN HỌC TẬP CHUẨN FIGMA MỚI (StudyTrack-E-03-tong-quan 1)
 * Đọc dữ liệu của người dùng hiện tại từ API backend (qua cache StorageService)
 * Hỗ trợ đầy đủ trạng thái Loading, Empty State và Error State (PB-40 / [T0694ED])
 */

async function loadDashboardData() {
    if (typeof StorageService !== 'undefined') await StorageService.ready;
    let currentStudent = null;
    if (typeof StorageService !== 'undefined') {
        currentStudent = StorageService.getStudent();
    }
    const sessionUser = (typeof getSession === 'function' ? getSession()?.user : null);
    const fullName = sessionUser?.fullName || currentStudent?.name || 'Sinh viên';
    const goal = (typeof StorageService !== 'undefined') ? StorageService.getGoal() : null;
    const targetGpa = Number(goal?.target_gpa) > 0 ? Number(goal.target_gpa) : 3.60;

    const data = {
        user: { fullName },
        stats: {
            gpa: 0,
            gpaDelta: 0,
            credits: 0,
            creditsDelta: 0,
            passedCourses: 0,
            totalCourses: 0,
            inProgressCourses: 0,
            inProgressCredits: 0,
            inProgressNames: [],
            termGpa4: 0,
            termAverage: 0,
            termAverageDelta: 0,
            semesterCount: 0,
            latestSemName: 'HK1 2025–2026',
            rank: 'Chưa xếp loại',
            targetGpa,
            hasData: false
        },
        semChart: [],
        activities: [],
        schedule: []
    };

    if (typeof StorageService !== 'undefined' && typeof GradeCalculator !== 'undefined') {
        const courses = StorageService.getCourses();
        const semesters = StorageService.getSemesters();

        data.stats.semesterCount = semesters.length;
        if (semesters.length > 0) {
            const last = semesters[semesters.length - 1];
            const shortName = (last.name || '').replace(/Học kỳ\s*/i, 'HK');
            const yr = (last.academic_year || '').replace('-', '–');
            data.stats.latestSemName = yr ? `${shortName} ${yr}` : shortName;
        }

        if (courses && courses.length > 0) {
            data.stats.hasData = true;
            const cum = GradeCalculator.calculateCumulativeGPA(courses);
            data.stats.gpa = cum.cumulativeGPA || 0;
            data.stats.credits = cum.passedCredits || 0;
            data.stats.termAverage = cum.avg10 || 0;
            data.stats.rank = cum.rank || 'Đạt';

            let passedCount = 0;
            let inProgCount = 0;
            let inProgCredits = 0;
            const inProgNames = [];

            courses.forEach(c => {
                const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                if (!calc.isComplete || calc.finalScore10 === null) {
                    inProgCount++;
                    inProgCredits += Number(c.credits) || 0;
                    inProgNames.push(c.course_name);
                } else if (calc.finalScore10 >= 4.0) {
                    passedCount++;
                }
            });

            data.stats.passedCourses = passedCount;
            data.stats.totalCourses = courses.length;
            data.stats.inProgressCourses = inProgCount;
            data.stats.inProgressCredits = inProgCredits;
            data.stats.inProgressNames = inProgNames;

            if (semesters.length > 0) {
                const runningCourses = [];
                semesters.forEach((s) => {
                    const semCourses = courses.filter(c => c.semester_id === s.id);
                    runningCourses.push(...semCourses);
                    const semCalc = GradeCalculator.calculateSemesterGPA(semCourses);
                    const cumAtSem = GradeCalculator.calculateCumulativeGPA(runningCourses);
                    const rawName = (s.name || '').trim();
                    const yr = (s.academic_year || '').trim();
                    const shortLabel = /hè/i.test(rawName)
                        ? `HK hè ${yr.split('-')[1]?.trim().slice(-2) || '26'}`
                        : `${rawName.replace(/Học kỳ\s*/i, 'HK')}${yr ? ' ' + yr.replace(/20(\d{2})\s*-\s*20(\d{2})/, '$1–$2') : ''}`;
                    data.semChart.push({
                        label: shortLabel,
                        semGpa: semCalc.totalCredits > 0 ? semCalc.gpa : 0,
                        cumGpa: cumAtSem.totalCredits > 0 ? cumAtSem.cumulativeGPA : 0,
                        planned: semCalc.totalCredits === 0
                    });
                });

                data.semChart.push({
                    label: 'HK2 26–27',
                    semGpa: targetGpa,
                    cumGpa: targetGpa,
                    planned: true
                });

                const lastSem = semesters[semesters.length - 1];
                const lastSemCourses = courses.filter(c => c.semester_id === lastSem.id);
                const lastSemCalc = GradeCalculator.calculateSemesterGPA(lastSemCourses);
                data.stats.termGpa4 = lastSemCalc.gpa || data.stats.gpa;
                data.stats.creditsDelta = lastSemCalc.passedCredits || 0;

                if (semesters.length >= 2) {
                    const prevSem = semesters[semesters.length - 2];
                    const prevSemCourses = courses.filter(c => c.semester_id === prevSem.id);
                    const prevSemCalc = GradeCalculator.calculateSemesterGPA(prevSemCourses);
                    data.stats.gpaDelta = Number(((lastSemCalc.gpa || 0) - (prevSemCalc.gpa || 0)).toFixed(2));
                    data.stats.termAverageDelta = Number(((lastSemCalc.avg10 || 0) - (prevSemCalc.avg10 || 0)).toFixed(2));
                }
            }

            // Điểm mới cập nhật (các môn đã có điểm của học kỳ gần nhất hoặc toàn bộ)
            const latestSemObj = semesters[semesters.length - 1];
            const semGradedSource = latestSemObj
                ? courses.filter(c => c.semester_id === latestSemObj.id)
                : courses;
            const activeSource = semGradedSource.some(c => GradeCalculator.calculateCourseFinalScore(c.components).isComplete)
                ? semGradedSource
                : courses;

            const gradedList = activeSource
                .map(c => {
                    const calc = GradeCalculator.calculateCourseFinalScore(c.components);
                    if (!calc.isComplete || calc.finalScore10 === null) return null;
                    const grade = GradeCalculator.convertScore10(calc.finalScore10);
                    return {
                        name: c.course_name,
                        score: calc.finalScore10,
                        letter: grade.letter,
                        time: 'Hôm qua'
                    };
                })
                .filter(Boolean);

            data.activities = gradedList;

            // Lịch học hôm nay suy ra từ các môn trong học kỳ mới nhất (tự động giãn khi thêm môn)
            const latestSem = semesters[semesters.length - 1];
            const latestCourses = latestSem ? courses.filter(c => c.semester_id === latestSem.id) : courses;
            const slots = [
                { time: '07:00', room: 'A2-301', tag: 'ĐANG HỌC', live: true },
                { time: '09:35', room: 'A3-204', tag: 'Bài tập', live: false },
                { time: '13:00', room: 'Lab 4',  tag: 'Thực hành', live: false },
                { time: '15:05', room: 'B1-102', tag: 'Lý thuyết', live: false },
                { time: '17:30', room: 'A1-205', tag: 'Thảo luận', live: false }
            ];
            data.schedule = latestCourses.map((c, idx) => ({
                ...slots[idx % slots.length],
                name: c.course_name
            }));
        }
    }

    // PB-19: có BE thật thì lấy GPA + tín chỉ tích lũy từ server (đã xử lý môn F và học lại)
    if (typeof USE_MOCK !== 'undefined' && !USE_MOCK) {
        try {
            const gpa = await apiFetch('/gpa/cumulative');
            data.stats.hasData ||= gpa.gpa4 !== null;
            data.stats.gpa = gpa.gpa4 ?? 0;
            data.stats.credits = gpa.passedCredits;
        } catch (err) {
            console.warn('Không lấy được GPA từ server, dùng số tính cục bộ:', err);
        }
    }

    return data;
}

function renderStats(s) {
    const semTitleEl = document.getElementById('dashCurrentSemTitle');
    if (semTitleEl) semTitleEl.textContent = s.latestSemName;

    const now = new Date();
    const updEl = document.getElementById('dashUpdatedInfo');
    if (updEl) {
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        updEl.textContent = `${hh}:${min}, ${dd}.${mm}`;
    }

    // Ô Navy GPA Tích lũy Hệ 4
    const gpaEl = document.getElementById('statGpa');
    if (gpaEl) gpaEl.textContent = s.hasData ? Number(s.gpa).toFixed(2) : '0.00';

    const rankEl = document.getElementById('heroGpaRank');
    if (rankEl) rankEl.textContent = s.hasData ? (s.rank || 'Đạt') : '--';

    const gpaNoteEl = document.getElementById('statGpaNote');
    if (gpaNoteEl) {
        gpaNoteEl.innerHTML = s.hasData
            ? `${trendHtml(s.gpaDelta)} so với kỳ trước`
            : 'Chưa có dữ liệu môn học';
    }

    const metaEl = document.getElementById('heroGpaMeta');
    if (metaEl) {
        metaEl.innerHTML = `<strong>${s.credits}</strong> tín chỉ`;
    }

    const barFillEl = document.getElementById('heroGpaBarFill');
    if (barFillEl) {
        const pct = Math.min(100, Math.max(0, (Number(s.gpa) / 4.0) * 100));
        barFillEl.style.width = `${pct}%`;
    }

    const flagEl = document.getElementById('heroGoalFlag');
    if (flagEl) {
        const target = s.targetGpa || 3.60;
        const flagPct = Math.min(95, Math.max(10, (target / 4.0) * 100));
        flagEl.style.left = `${flagPct}%`;
        flagEl.textContent = target.toFixed(2);
    }

    // KPI Cell 1: TÍN CHỈ TÍCH LŨY
    const credEl = document.getElementById('statCredits');
    if (credEl) credEl.textContent = s.credits;

    const credBarFill = document.getElementById('statCreditsBarFill');
    if (credBarFill) {
        credBarFill.style.width = `${Math.min(100, Math.round((s.credits / 140) * 100))}%`;
    }

    const credNoteEl = document.getElementById('statCreditsNote');
    if (credNoteEl) {
        credNoteEl.innerHTML = s.hasData
            ? trendHtml(s.creditsDelta, 0, ' tín chỉ')
            : '0 tín chỉ';
    }

    // KPI Cell 2: GPA HỌC KỲ NÀY (Mint)
    const termGpaEl = document.getElementById('statTermGpa4');
    if (termGpaEl) {
        termGpaEl.textContent = s.hasData ? Number(s.termGpa4).toFixed(2) : '0.00';
    }
    const termBadgeEl = document.getElementById('statTermGoalBadge');
    if (termBadgeEl) {
        const target = 3.40;
        const reached = s.hasData && s.termGpa4 >= target;
        termBadgeEl.textContent = s.hasData
            ? `Mục tiêu ${target.toFixed(2)} · ${reached ? 'đã đạt' : 'đang phấn đấu'}`
            : `Mục tiêu ${target.toFixed(2)}`;
    }

    // KPI Cell 3: ĐIỂM TB · HỆ 10
    const termAvgEl = document.getElementById('statTermAvg');
    if (termAvgEl) termAvgEl.textContent = s.hasData ? Number(s.termAverage).toFixed(2) : '0.00';

    const termAvgNoteEl = document.getElementById('statTermAvgNote');
    if (termAvgNoteEl) {
        termAvgNoteEl.innerHTML = s.hasData
            ? `${trendHtml(s.termAverageDelta, 2)} so với kỳ trước`
            : 'Thang điểm 10';
    }

    // KPI Cell 4: ĐANG HỌC
    const passEl = document.getElementById('statPassed');
    if (passEl) {
        if (s.inProgressCourses > 0) {
            passEl.innerHTML = `${s.inProgressCourses} <span class="stat-card__value-sub">môn · ${s.inProgressCredits} TC</span>`;
        } else {
            passEl.innerHTML = `${s.passedCourses} <span class="stat-card__value-sub">/ ${s.totalCourses} môn</span>`;
        }
    }

    const passNoteEl = document.getElementById('statPassedNote');
    if (passNoteEl) {
        if (s.inProgressNames && s.inProgressNames.length > 0) {
            passNoteEl.textContent = s.inProgressNames.slice(0, 2).join(', ');
        } else {
            const percent = s.totalCourses ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0;
            passNoteEl.textContent = s.hasData ? `${percent}% môn đã hoàn thành` : 'Hãy thêm môn học';
        }
    }
}

// Biểu đồ Cột phẳng HTML/CSS + Đường Navy chuẩn StudyTrack-E (Không bao giờ bị méo)
function renderSemBarLineChart(items) {
    const container = document.getElementById('chart');
    if (!container) return;
    container.innerHTML = '';

    const realItems = (items || []).filter(i => !i.planned);
    if (!items || items.length === 0 || realItems.length === 0) {
        container.innerHTML = `
            <div class="chart__empty">
                <p style="margin-bottom: 10px;">Chưa có dữ liệu điểm học kỳ để hiển thị biểu đồ.</p>
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
        const val = Number(item.semGpa) || 0;
        const cumVal = Number(item.cumGpa || item.semGpa) || 0;
        const hPct = Math.max(12, Math.min(100, (val / 4.0) * 100));
        const dotPct = Math.max(4, Math.min(98, (cumVal / 4.0) * 100));
        const isLatest = i === lastRealIdx;

        return `
            <div class="e-html-chart__col">
                <div class="e-html-chart__bar ${isLatest ? 'e-html-chart__bar--latest' : ''}" style="height: ${hPct}%;">
                    <span class="e-html-chart__bar-val">${val.toFixed(2)}</span>
                </div>
                <span class="e-html-chart__dot" data-cum="${cumVal}" style="bottom: ${dotPct}%;"></span>
            </div>
        `;
    }).join('');

    const xAxisHtml = items.map(item => `
        <span class="e-html-chart__xlabel">${escapeHtml(item.label)}</span>
    `).join('');

    container.innerHTML = `
        <div class="e-html-chart">
            <div class="e-html-chart__yaxis">${yAxisHtml}</div>
            <div class="e-html-chart__plot" id="dashChartPlot">
                ${gridLinesHtml}
                <svg class="e-html-chart__svg-line" id="dashChartLineSvg"></svg>
                <div class="e-html-chart__cols">${colsHtml}</div>
            </div>
            <div class="e-html-chart__xaxis">${xAxisHtml}</div>
        </div>
    `;

    // Vẽ đường nối các chấm tích lũy chính xác theo tọa độ pixel thực tế
    requestAnimationFrame(() => {
        const plot = document.getElementById('dashChartPlot');
        const svg = document.getElementById('dashChartLineSvg');
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
        svg.innerHTML = `<polyline points="${pts}" fill="none" style="stroke: var(--e-ink)" stroke-width="1.6"/>`;
    });
}

function renderActivities(list) {
    const ul = document.getElementById('activityList');
    if (!ul) return;
    if (!list || !list.length) {
        ul.innerHTML = '<li class="list-empty">Chưa có điểm môn học nào được cập nhật</li>';
        return;
    }
    ul.innerHTML = list.map((a) => {
        const isLow = a.score < 7.0;
        const sqColor = (a.letter === 'A+' || a.letter === 'A')
            ? '#10B981'
            : ((a.letter === 'B+' || a.letter === 'B') ? 'var(--e-ink)' : '#EF4444');
        return `
        <li class="activity">
            <span class="activity__name">${escapeHtml(a.name)}</span>
            <span class="activity__score ${isLow ? 'activity__score--low' : ''}">${Number(a.score).toFixed(1)}</span>
            <span class="activity__grade">
                <i class="activity__grade-sq" style="background:${sqColor}"></i>
                ${escapeHtml(a.letter)}
            </span>
            <span class="activity__time">${escapeHtml(a.time)}</span>
        </li>`;
    }).join('');
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
            <span class="lesson__time">${escapeHtml(l.time || '07:00')}</span>
            <span class="lesson__name">${escapeHtml(l.name)}</span>
            <span class="lesson__room">${escapeHtml(l.room || 'A2-301')}</span>
            <span class="lesson__tag ${l.live ? 'lesson__tag--live' : ''}">${escapeHtml(l.tag || 'Lý thuyết')}</span>
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
        renderSemBarLineChart(data.semChart);
        renderActivities(data.activities);
        renderSchedule(data.schedule);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => renderSemBarLineChart(data.semChart), 150);
        });
    } catch (err) {
        console.error('Dashboard init error:', err);
        if (chartBox) {
            chartBox.innerHTML = `
                <div class="chart__empty" style="text-align: center; color: var(--danger);">
                    <p style="margin-bottom: 8px;">Không thể tải dữ liệu tổng quan. Vui lòng thử lại.</p>
                    <button type="button" onclick="initDashboard()" class="btn-figma-primary">Thử tải lại</button>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
