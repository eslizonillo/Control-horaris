const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// State
let state = {
    times: {},
    weekInfo: { number: '', start: '', end: '' }
    // times structure: { "Mon": { start: "09:00", end: "18:00", isHoliday: false } }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    calculateAll();
});

function setupEventListeners() {
    days.forEach(day => {
        const startInput = document.getElementById(`start-${day}`);
        const endInput = document.getElementById(`end-${day}`);
        const holidayInput = document.getElementById(`holiday-${day}`);

        [startInput, endInput].forEach(input => {
            input.addEventListener('input', () => {
                updateDayState(day);
                calculateAll();
                saveState();
            });
        });

        holidayInput.addEventListener('change', () => {
            updateDayState(day);
            calculateAll();
            saveState();
        });
    });

    // Actions
    document.getElementById('btn-reset').addEventListener('click', resetWeek);
    document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
    document.getElementById('btn-export-excel').addEventListener('click', exportExcel);
    document.getElementById('btn-export-drive').addEventListener('click', copyForDrive);

    // Week Info Listeners
    ['week-number', 'week-start', 'week-end'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            saveState();
        });
    });
}

function updateDayState(day) {
    const start = document.getElementById(`start-${day}`).value;
    const end = document.getElementById(`end-${day}`).value;
    const isHoliday = document.getElementById(`holiday-${day}`).checked;

    if (!state.times[day]) state.times[day] = {};
    state.times[day].start = start;
    state.times[day].end = end;
    state.times[day].isHoliday = isHoliday;
}

function calculateAll() {
    let totalWeeklyMinutes = 0;

    // Recalculate everything
    days.forEach(day => {
        calculateDaily(day); // Updates UI for individual day totals
    });

    calculateWeekly();
}

function calculateDaily(day) {
    const start = document.getElementById(`start-${day}`).value;
    const end = document.getElementById(`end-${day}`).value;
    const isHoliday = document.getElementById(`holiday-${day}`).checked;
    const msgEl = document.getElementById(`msg-${day}`);
    const totalEl = document.getElementById(`total-${day}`);

    let effectiveDuration = 0;
    let message = '';

    if (start && end) {
        const startMins = timeToMinutes(start);
        const endMins = timeToMinutes(end);
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60;

        effectiveDuration = duration;

        // Rule: If >= 6h 15m (375 mins), deduct 15 mins
        if (duration >= 375) {
            effectiveDuration -= 15;
            message = 'Descans (-15m)';
        }
    }

    if (isHoliday) {
        message = message ? `${message} | Festiu` : 'Festiu';
    }

    // UI Updates
    msgEl.textContent = message;
    totalEl.textContent = formatMinutes(effectiveDuration);

    return effectiveDuration;
}

function getDailyTarget(day, isHoliday) {
    if (isHoliday) return 0;
    if (day === 'Fri') return 6.5;
    if (day === 'Sat' || day === 'Sun') return 0;
    return 8; // Mon-Thu
}

function calculateWeekly() {
    let totalMinutes = 0;
    let totalHolidayMinutes = 0;
    let totalTargetMinutes = 0;
    let holidayCount = 0;

    days.forEach(day => {
        const dayData = state.times[day] || {};
        const isHoliday = document.getElementById(`holiday-${day}`).checked;

        let dayMinutes = 0;
        const start = document.getElementById(`start-${day}`).value;
        const end = document.getElementById(`end-${day}`).value;

        if (start && end) {
            const s = timeToMinutes(start);
            const e = timeToMinutes(end);
            let d = e - s;
            if (d < 0) d += 24 * 60;
            if (d >= 375) d -= 15;
            dayMinutes = d;
        }

        totalMinutes += dayMinutes;

        if (isHoliday) {
            totalHolidayMinutes += dayMinutes;
        }

        if (isHoliday && day !== 'Sun') {
            holidayCount++;
        }
    });

    // Calculate Target based on Holiday Count
    let targetHours = 38.5;
    if (holidayCount === 1) targetHours = 32;
    else if (holidayCount === 2) targetHours = 24;
    else if (holidayCount === 3) targetHours = 16;
    else if (holidayCount >= 4) targetHours = Math.max(0, (5 - holidayCount) * 8);

    totalTargetMinutes = targetHours * 60;

    // Totals
    document.getElementById('weekly-total').textContent = formatMinutes(totalMinutes);
    document.getElementById('holiday-total').textContent = formatMinutes(totalHolidayMinutes);

    // Target
    document.getElementById('target-display').textContent = `Objectiu: ${targetHours}h`;

    // Balance
    const regularMinutes = totalMinutes - totalHolidayMinutes;
    const balanceMinutes = regularMinutes - totalTargetMinutes;
    const balanceEl = document.getElementById('balance-display');
    const absBalance = Math.abs(balanceMinutes);
    const balanceSign = balanceMinutes >= 0 ? '+' : '-';

    balanceEl.textContent = `${balanceSign}${formatMinutes(absBalance)}`;
    balanceEl.className = 'value balance ' + (balanceMinutes >= 0 ? 'positive' : 'negative');
}

// Helpers
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
}


function resetWeek() {
    if (!confirm('Estàs segur que vols esborrar totes les dades d\'aquesta setmana?')) return;

    // Clear state
    state.times = {};
    saveState();

    // Clear inputs
    document.querySelectorAll('input[type="time"]').forEach(input => input.value = '');
    document.querySelectorAll('.holiday-toggle input').forEach(input => input.checked = false);

    // Recalculate
    calculateAll();
}

function getDataForExport() {
    const data = [];
    const dayNames = {
        'Mon': 'Dilluns', 'Tue': 'Dimarts', 'Wed': 'Dimecres',
        'Thu': 'Dijous', 'Fri': 'Divendres', 'Sat': 'Dissabte', 'Sun': 'Diumenge'
    };

    days.forEach(day => {
        const times = state.times[day] || {};
        const start = times.start || '';
        const end = times.end || '';
        const isHoliday = times.isHoliday ? 'Si' : 'No';

        let note = '';
        let totalText = document.getElementById(`total-${day}`).textContent;

        if (start && end) {
            const s = timeToMinutes(start);
            const e = timeToMinutes(end);
            let d = e - s;
            if (d < 0) d += 24 * 60;
            if (d >= 375) {
                note = 'Descans (-15m)';
            }
        }

        data.push([
            dayNames[day],
            start,
            end,
            totalText,
            isHoliday,
            note
        ]);
    });

    return data;
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Report d'Hores", 14, 20);

    doc.setFontSize(11);
    const weekNum = state.weekInfo.number || '-';
    const weekStart = formatDateDisplay(state.weekInfo.start);
    const weekEnd = formatDateDisplay(state.weekInfo.end);

    doc.text(`Setmana: ${weekNum}`, 14, 30);
    doc.text(`Del: ${weekStart} al ${weekEnd}`, 14, 36);

    const rawData = getDataForExport();
    // Prepend Header
    const head = [["Dia", "Entrada", "Sortida", "Total", "Festiu", "Notes"]];
    const body = rawData;

    doc.autoTable({
        startY: 45,
        head: head,
        body: body,
        theme: 'grid'
    });

    // Add Totals
    let finalY = doc.lastAutoTable.finalY + 10;

    const total = document.getElementById('weekly-total').textContent;
    const target = document.getElementById('target-display').textContent;
    const balance = document.getElementById('balance-display').textContent;
    const holiday = document.getElementById('holiday-total').textContent;

    doc.setFontSize(11);
    doc.text(`${target}`, 14, finalY);
    doc.text(`Total Setmanal: ${total}`, 14, finalY + 6);
    doc.text(`Balanç: ${balance}`, 14, finalY + 12);
    doc.text(`Hores en Festius: ${holiday}`, 14, finalY + 18);

    doc.save("control_horari.pdf");
}

function exportExcel() {
    const rawData = getDataForExport();

    // Add Headers
    const data = [["Dia", "Entrada", "Sortida", "Total", "Festiu", "Notes"], ...rawData];

    // Add Week Info at the top
    const weekNum = state.weekInfo.number || '-';
    const weekStart = formatDateDisplay(state.weekInfo.start);
    const weekEnd = formatDateDisplay(state.weekInfo.end);

    // Insert at beginning
    data.unshift([]); // spacer
    data.unshift(["Fins", weekEnd]);
    data.unshift(["Des de", weekStart]);
    data.unshift(["Setmana", weekNum]);

    // Append totals
    const total = document.getElementById('weekly-total').textContent;
    const target = document.getElementById('target-display').textContent;
    const balance = document.getElementById('balance-display').textContent;
    const holiday = document.getElementById('holiday-total').textContent;

    data.push([]);
    data.push(["Resum"]);
    data.push([target]);
    data.push(["Total Setmanal", total]);
    data.push(["Balanç", balance]);
    data.push(["Hores en Festius", holiday]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Hores");
    XLSX.writeFile(wb, "control_horari.xlsx");
}

async function copyForDrive() {
    const weekNum = state.weekInfo.number || 'Sense número';
    const weekStart = formatDateDisplay(state.weekInfo.start);

    // Prepare Data
    const rawData = getDataForExport();

    const total = document.getElementById('weekly-total').textContent;
    const target = document.getElementById('target-display').textContent;
    const balance = document.getElementById('balance-display').textContent;
    const holiday = document.getElementById('holiday-total').textContent;

    // Use a format that resembles Excel rows (Tab separated)
    const rows = [
        ["Setmana", weekNum, "Inici", weekStart, "", ""],
        ["Dia", "Entrada", "Sortida", "Total", "Festiu", "Notes"],
        ...rawData,
        [],
        ["Resum", "", "", "", "", ""],
        ["Objectiu", target, "", "", "", ""],
        ["Total", total, "", "", "", ""],
        ["Balanç", balance, "", "", "", ""],
        ["Festius", holiday, "", "", "", ""]
    ];

    // Convert array of arrays to TSV string
    const tsv = rows.map(row => row.join('\t')).join('\n');

    const btn = document.getElementById('btn-export-drive');
    const originalText = btn.innerHTML;

    try {
        await navigator.clipboard.writeText(tsv);

        btn.innerHTML = 'Copiat!';
        // Visual feedback
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        alert("Dades exportades al porta-retalls.\n\nObre el teu full de Google Sheets i prem Ctrl+V per enganxar.");

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = ''; // revert to class style
        }, 3000);

    } catch (e) {
        console.error(e);
        alert("No s'ha pogut copiar al porta-retalls. Permís denegat.");
    }
}

// Persistence
function saveState() {
    state.weekInfo = {
        number: document.getElementById('week-number').value,
        start: document.getElementById('week-start').value,
        end: document.getElementById('week-end').value
    };
    localStorage.setItem('workHoursState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('workHoursState');
    if (saved) {
        try {
            state = JSON.parse(saved);

            if (state.weekInfo) {
                document.getElementById('week-number').value = state.weekInfo.number || '';
                document.getElementById('week-start').value = state.weekInfo.start || '';
                document.getElementById('week-end').value = state.weekInfo.end || '';
            }

            if (state.times) {
                days.forEach(day => {
                    const dayData = state.times[day];
                    if (dayData) {
                        if (dayData.start) document.getElementById(`start-${day}`).value = dayData.start;
                        if (dayData.end) document.getElementById(`end-${day}`).value = dayData.end;
                        if (dayData.isHoliday) document.getElementById(`holiday-${day}`).checked = true;
                    }
                });
            }
        } catch (e) {
            console.error('Error loading state', e);
            state = { times: {}, weekInfo: {} };
        }
    }
}
