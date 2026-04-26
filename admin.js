// =====================================================
// PANEL ADMINISTRATIVO
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig, COLLECTION_NAME } from './firebase-config.js';

// Mismo orden y nombres que index.html — espejo de la lista
const ACTIVITIES = [
    { id: 'padresnuestros',  name: 'Padres Nuestros',                        icon: 'fa-solid fa-cross' },
    { id: 'avesmarias',      name: 'Aves Marías',                            icon: 'fa-solid fa-dove' },
    { id: 'rosarios',        name: 'Rosarios',                               icon: 'fa-solid fa-circle-nodes' },
    { id: 'ayunos',          name: 'Ayunos y/o Sacrificios',                 icon: 'fa-solid fa-bowl-rice' },
    { id: 'apostolados',     name: 'Apostolados',                            icon: 'fa-solid fa-handshake-angle' },
    { id: 'horas',           name: 'Horas de trabajo/estudio',               icon: 'fa-solid fa-clock' },
    { id: 'oraciones',       name: 'Oraciones',                              icon: 'fa-solid fa-hands-praying' },
    { id: 'comuniones',      name: 'Comuniones sacramentales/espirituales',  icon: 'fa-solid fa-wheat-awn' },
    { id: 'confesiones',     name: 'Confesiones',                            icon: 'fa-solid fa-comments' },
    { id: 'misas',           name: 'Misas',                                  icon: 'fa-solid fa-church' }
];

// =====================================================
// FIREBASE INIT
// =====================================================
const $ = (id) => document.getElementById(id);

let app, auth, db;
let firebaseReady = false;

try {
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TU_API_KEY') {
        app  = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db   = getFirestore(app);
        firebaseReady = true;
    }
} catch (err) {
    console.error('Firebase init error:', err);
}

if (!firebaseReady) {
    showFatalError('Firebase no está configurado. Edita firebase-config.js con tus credenciales.');
}

// =====================================================
// ESTADO
// =====================================================
const state = {
    rawRecords: [],   // todos los registros desde Firestore
    filtered: [],     // tras aplicar filtros
    unsubscribe: null
};

// =====================================================
// AUTH
// =====================================================
if (firebaseReady) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            $('adminLogin').hidden = true;
            $('adminDashboard').hidden = false;
            $('adminEmail').textContent = user.email || '';
            startListening();
        } else {
            $('adminLogin').hidden = false;
            $('adminDashboard').hidden = true;
            stopListening();
        }
    });

    $('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('loginEmail').value.trim();
        const password = $('loginPassword').value;
        const errBox = $('loginError');
        const btn    = $('btnLogin');

        errBox.textContent = '';
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Entrando…';

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
            errBox.textContent = mapAuthError(err.code);
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Entrar';
        }
    });

    $('btnLogout').addEventListener('click', async () => {
        try { await signOut(auth); } catch (err) { console.error(err); }
    });
}

function mapAuthError(code) {
    switch (code) {
        case 'auth/invalid-email':       return 'Correo no válido.';
        case 'auth/user-disabled':       return 'Usuario deshabilitado.';
        case 'auth/user-not-found':      return 'Usuario no encontrado.';
        case 'auth/wrong-password':      return 'Contraseña incorrecta.';
        case 'auth/invalid-credential':  return 'Credenciales no válidas.';
        case 'auth/too-many-requests':   return 'Demasiados intentos. Espera unos minutos.';
        default:                         return 'No se pudo iniciar sesión.';
    }
}

// =====================================================
// FIRESTORE LISTENER
// =====================================================
function startListening() {
    $('adminLoading').hidden = false;

    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));

    state.unsubscribe = onSnapshot(q, (snap) => {
        state.rawRecords = [];
        snap.forEach(doc => {
            state.rawRecords.push({ id: doc.id, ...doc.data() });
        });
        $('adminLoading').hidden = true;
        applyFilters();
    }, (err) => {
        console.error('Error al escuchar registros:', err);
        $('adminLoading').hidden = true;
        showToast('Error al cargar registros');
    });
}

function stopListening() {
    if (state.unsubscribe) {
        state.unsubscribe();
        state.unsubscribe = null;
    }
}

// =====================================================
// FILTROS
// =====================================================
['filterName', 'filterFrom', 'filterTo'].forEach(id => {
    $(id).addEventListener('input', applyFilters);
});

$('btnClearFilters').addEventListener('click', () => {
    $('filterName').value = '';
    $('filterFrom').value = '';
    $('filterTo').value = '';
    applyFilters();
});

function applyFilters() {
    const name = $('filterName').value.trim().toLowerCase();
    const from = $('filterFrom').value;
    const to   = $('filterTo').value;

    state.filtered = state.rawRecords.filter(r => {
        if (name) {
            const haystack = (r.nameLower || (r.name || '').toLowerCase());
            if (!haystack.includes(name)) return false;
        }
        if (from && r.date < from) return false;
        if (to   && r.date > to)   return false;
        return true;
    });

    renderAll();
}

// =====================================================
// TABS
// =====================================================
document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`view${capitalize(view)}`).classList.add('active');
    });
});

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// =====================================================
// RENDER
// =====================================================
function renderAll() {
    renderKPIs();
    renderPersons();
    renderActivities();
    renderDates();
    renderRecords();

    const empty = state.filtered.length === 0;
    $('adminEmpty').hidden = !empty;
    $('adminEmptyMsg').textContent = state.rawRecords.length === 0
        ? 'Aún no hay registros. Pide a alguien que llene el cuestionario.'
        : 'Ningún registro coincide con los filtros actuales.';
}

// ----- KPIs -----
function renderKPIs() {
    const records = state.filtered;
    const persons = new Set();
    const days = new Set();
    let total = 0;

    records.forEach(r => {
        persons.add((r.nameLower || (r.name || '').toLowerCase()).trim());
        days.add(r.date);
        total += (r.total || sumCounts(r.counts));
    });

    $('kpiPersons').textContent  = persons.size;
    $('kpiRecords').textContent  = records.length;
    $('kpiTotal').textContent    = total;
    $('kpiDays').textContent     = days.size;
}

function sumCounts(counts) {
    if (!counts) return 0;
    return Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
}

// ----- Por persona -----
function renderPersons() {
    const map = new Map(); // key: nameLower, value: { name, counts:{}, total, records }

    state.filtered.forEach(r => {
        const key = (r.nameLower || (r.name || '').toLowerCase()).trim();
        if (!map.has(key)) {
            map.set(key, {
                name: r.name || '—',
                counts: ACTIVITIES.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {}),
                total: 0,
                records: 0
            });
        }
        const entry = map.get(key);
        ACTIVITIES.forEach(a => {
            entry.counts[a.id] += (r.counts?.[a.id] || 0);
        });
        entry.total += (r.total || sumCounts(r.counts));
        entry.records += 1;
    });

    const persons = Array.from(map.values()).sort((a, b) => b.total - a.total);

    const table = $('tablePersons');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Header dinámico (persona + actividades + total)
    const headCells = ['<th>Persona</th>', '<th>Reg.</th>']
        .concat(ACTIVITIES.map(a =>
            `<th title="${escapeHtml(a.name)}"><i class="${a.icon}"></i></th>`))
        .concat(['<th>Total</th>']);
    thead.innerHTML = `<tr>${headCells.join('')}</tr>`;

    if (persons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${ACTIVITIES.length + 3}" class="td-empty">Sin datos.</td></tr>`;
    } else {
        tbody.innerHTML = persons.map(p => {
            const cells = ACTIVITIES
                .map(a => `<td>${p.counts[a.id] || 0}</td>`)
                .join('');
            return `
                <tr>
                    <td class="td-name"><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${p.records}</td>
                    ${cells}
                    <td class="td-total">${p.total}</td>
                </tr>
            `;
        }).join('');
    }

    $('countPersons').textContent = `${persons.length} ${persons.length === 1 ? 'persona' : 'personas'}`;
}

// ----- Por actividad -----
function renderActivities() {
    const totals = {};
    ACTIVITIES.forEach(a => totals[a.id] = 0);

    state.filtered.forEach(r => {
        ACTIVITIES.forEach(a => {
            totals[a.id] += (r.counts?.[a.id] || 0);
        });
    });

    const max = Math.max(1, ...Object.values(totals));

    const wrap = $('activityTotals');
    wrap.innerHTML = ACTIVITIES.map(a => {
        const v = totals[a.id];
        const pct = (v / max) * 100;
        return `
            <div class="activity-total-row">
                <div class="atr-icon"><i class="${a.icon}"></i></div>
                <div class="atr-body">
                    <div class="atr-head">
                        <span class="atr-name">${escapeHtml(a.name)}</span>
                        <strong class="atr-value">${v}</strong>
                    </div>
                    <div class="atr-bar"><div class="atr-bar-fill" style="width:${pct}%"></div></div>
                </div>
            </div>
        `;
    }).join('');

    $('countActivities').textContent = `${ACTIVITIES.length} actividades`;
}

// ----- Por fecha -----
function renderDates() {
    const map = new Map(); // key: date YYYY-MM-DD

    state.filtered.forEach(r => {
        const d = r.date || '—';
        if (!map.has(d)) {
            map.set(d, { date: d, persons: new Set(), records: 0, total: 0 });
        }
        const entry = map.get(d);
        entry.persons.add((r.nameLower || (r.name || '').toLowerCase()).trim());
        entry.records += 1;
        entry.total += (r.total || sumCounts(r.counts));
    });

    const arr = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));

    const tbody = document.querySelector('#tableDates tbody');
    if (arr.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="td-empty">Sin datos.</td></tr>`;
    } else {
        tbody.innerHTML = arr.map(d => `
            <tr>
                <td class="td-name">${formatDateFull(d.date)}</td>
                <td>${d.persons.size}</td>
                <td>${d.records}</td>
                <td class="td-total">${d.total}</td>
            </tr>
        `).join('');
    }

    $('countDates').textContent = `${arr.length} ${arr.length === 1 ? 'día' : 'días'}`;
}

// ----- Registros individuales -----
function renderRecords() {
    const wrap = $('recordsList');
    if (state.filtered.length === 0) {
        wrap.innerHTML = '';
        $('countRecords').textContent = '0 registros';
        return;
    }

    wrap.innerHTML = state.filtered.map(r => {
        const total = r.total || sumCounts(r.counts);
        const items = ACTIVITIES.map(a => {
            const v = r.counts?.[a.id] || 0;
            return `
                <div class="record-item ${v === 0 ? 'is-zero' : ''}">
                    <i class="${a.icon}"></i>
                    <span class="ri-name">${escapeHtml(a.name)}</span>
                    <strong class="ri-value">${v}</strong>
                </div>
            `;
        }).join('');

        const ts = r.timestamp?.toDate ? r.timestamp.toDate() : null;
        const tsText = ts ? ts.toLocaleString('es-MX') : '';

        return `
            <article class="record-card">
                <header class="record-header">
                    <div class="rh-left">
                        <i class="fas fa-user"></i>
                        <strong>${escapeHtml(r.name || '—')}</strong>
                    </div>
                    <div class="rh-right">
                        <span class="rh-date"><i class="fas fa-calendar"></i> ${formatDateFull(r.date)}</span>
                        ${tsText ? `<small class="rh-ts">${escapeHtml(tsText)}</small>` : ''}
                    </div>
                </header>
                <div class="record-grid">${items}</div>
                <footer class="record-footer">
                    <span>Total</span>
                    <strong>${total}</strong>
                </footer>
            </article>
        `;
    }).join('');

    $('countRecords').textContent = `${state.filtered.length} ${state.filtered.length === 1 ? 'registro' : 'registros'}`;
}

// =====================================================
// UTIL
// =====================================================
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateFull(s) {
    if (!s) return '—';
    // s = "YYYY-MM-DD"
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return s;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-MX', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
}

let toastTimer;
function showToast(msg) {
    const toast = $('adminToast');
    $('adminToastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function showFatalError(msg) {
    document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                    padding:2rem;text-align:center;font-family:Inter,sans-serif;color:#732002;">
            <div style="max-width:480px;background:#fff;padding:2rem;border-radius:1rem;
                        border:2px solid #F2AB27;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                <i class="fas fa-triangle-exclamation" style="font-size:2.5rem;color:#8C2730;"></i>
                <h2 style="margin:1rem 0 0.5rem">Configuración pendiente</h2>
                <p>${escapeHtml(msg)}</p>
            </div>
        </div>`;
}
