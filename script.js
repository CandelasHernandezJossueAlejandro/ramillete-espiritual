// =====================================================
// CONTEO DE ACTIVIDADES ESPIRITUALES
// Lógica del cuestionario + persistencia en Firebase
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig, COLLECTION_NAME } from './firebase-config.js';

// ----------- Inicializar Firebase (con tolerancia a config inválida) -----------
let db = null;
let firebaseReady = false;
try {
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TU_API_KEY') {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        firebaseReady = true;
    } else {
        console.warn('Firebase no está configurado. Edita firebase-config.js para activar la nube.');
    }
} catch (err) {
    console.error('Error al inicializar Firebase:', err);
}

// =====================================================
// ACTIVIDADES
// =====================================================
const ACTIVITIES = [
    { id: 'padresnuestros',  name: 'Padres Nuestros',                        tag: 'Oración',       icon: 'fa-solid fa-cross' },
    { id: 'avesmarias',      name: 'Aves Marías',                            tag: 'Oración',       icon: 'fa-solid fa-star' },
    { id: 'rosarios',        name: 'Rosarios',                               tag: 'Devoción',      icon: 'fa-solid fa-circle-nodes' },
    { id: 'ayunos',          name: 'Ayunos y/o Sacrificios',                 tag: 'Mortificación', icon: 'fa-solid fa-bowl-rice' },
    { id: 'apostolados',     name: 'Apostolados',                            tag: 'Servicio',      icon: 'fa-solid fa-handshake-angle' },
    { id: 'horas',           name: 'Horas de trabajo/estudio',               tag: 'Esfuerzo',      icon: 'fa-solid fa-clock' },
    { id: 'oraciones',       name: 'Oraciones',                              tag: 'Oración',       icon: 'fa-solid fa-hands-praying' },
    { id: 'visitas',         name: 'Visitas al Santísimo',                   tag: 'Visitas',       icon: 'fa-solid fa-dove' },
    { id: 'comuniones',      name: 'Comuniones sacramentales/espirituales',  tag: 'Eucaristía',    icon: 'fa-solid fa-wheat-awn' },
    { id: 'confesiones',     name: 'Confesiones',                            tag: 'Sacramento',    icon: 'fa-solid fa-comments' },
    { id: 'misas',           name: 'Misas',                                  tag: 'Liturgia',      icon: 'fa-solid fa-church' }
];

// Exponer ACTIVITIES para que el admin las consuma si están en la misma página (no aplica aquí, pero útil)
window.ACTIVITIES_LIST = ACTIVITIES;

// =====================================================
// ESTADO
// =====================================================
const state = {
    name: '',
    counts: ACTIVITIES.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {}),
    currentIndex: 0,
    saved: false
};

// =====================================================
// REFERENCIAS DOM
// =====================================================
const $ = (id) => document.getElementById(id);

const screens = {
    intro:    $('screenIntro'),
    name:     $('screenName'),
    activity: $('screenActivity'),
    summary:  $('screenSummary')
};

// =====================================================
// INICIALIZACIÓN
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    renderPreviewChips();
    bindEvents();
    $('progressTotal').textContent = ACTIVITIES.length;
});

// =====================================================
// PARTÍCULAS DECORATIVAS
// =====================================================
function initParticles() {
    const container = $('particles');
    if (!container) return;

    const count = 18;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.top  = `${Math.random() * 100}%`;
        const size   = Math.random() * 14 + 6;
        p.style.width  = `${size}px`;
        p.style.height = `${size}px`;
        p.style.animationDelay    = `${Math.random() * 8}s`;
        p.style.animationDuration = `${Math.random() * 8 + 10}s`;
        container.appendChild(p);
    }
}

function renderPreviewChips() {
    $('previewChips').innerHTML = ACTIVITIES.map(a =>
        `<span class="preview-chip">${a.name}</span>`
    ).join('');
}

// =====================================================
// NAVEGACIÓN
// =====================================================
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// =====================================================
// EVENTOS
// =====================================================
function bindEvents() {
    $('btnStart').addEventListener('click', () => showScreen('name'));

    $('btnNameBack').addEventListener('click', () => showScreen('intro'));
    $('btnNameNext').addEventListener('click', handleNameSubmit);
    $('userName').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleNameSubmit();
    });
    $('userName').addEventListener('input', () => {
        $('nameError').textContent = '';
    });

    $('btnActBack').addEventListener('click', handlePrevActivity);
    $('btnActNext').addEventListener('click', handleNextActivity);
    $('btnPlus').addEventListener('click', () => updateCounter(+1));
    $('btnMinus').addEventListener('click', () => updateCounter(-1));
    $('btnReset').addEventListener('click', () => setCounter(0));

    document.querySelectorAll('.quick-btn[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
            updateCounter(parseInt(btn.dataset.add, 10));
        });
    });

    $('counterInput').addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const id  = ACTIVITIES[state.currentIndex].id;
        state.counts[id] = isNaN(val) || val < 0 ? 0 : Math.min(val, 9999);
    });

    $('counterInput').addEventListener('blur', () => {
        const id = ACTIVITIES[state.currentIndex].id;
        $('counterInput').value = state.counts[id];
    });

    $('btnWhatsapp').addEventListener('click', shareWhatsApp);
    $('btnEmail').addEventListener('click', shareEmail);
    $('btnCopy').addEventListener('click', copyToClipboard);
    $('btnRestart').addEventListener('click', restart);
}

// =====================================================
// NOMBRE
// =====================================================
function handleNameSubmit() {
    const value = $('userName').value.trim();
    if (value.length < 2) {
        $('nameError').textContent = 'Por favor escribe tu nombre (mínimo 2 letras).';
        $('userName').focus();
        return;
    }
    state.name = value;
    state.currentIndex = 0;
    state.saved = false;
    loadActivity();
    showScreen('activity');
}

// =====================================================
// ACTIVIDADES
// =====================================================
function loadActivity() {
    const a = ACTIVITIES[state.currentIndex];
    $('activityIcon').className = 'activity-icon ' + a.icon;
    $('activityTag').textContent  = a.tag;
    $('activityTitle').textContent = a.name;
    $('counterInput').value = state.counts[a.id];

    $('progressCurrent').textContent = state.currentIndex + 1;
    const pct = ((state.currentIndex + 1) / ACTIVITIES.length) * 100;
    $('progressBarFill').style.width = `${pct}%`;

    const isLast = state.currentIndex === ACTIVITIES.length - 1;
    $('btnActNextLabel').textContent = isLast ? 'Finalizar' : 'Siguiente';
    $('btnActNext').querySelector('i').className = isLast
        ? 'fas fa-flag-checkered'
        : 'fas fa-arrow-right';

    $('btnActBack').disabled = false;

    const wrap = document.querySelector('.activity-icon-wrapper');
    wrap.classList.remove('bump');
    void wrap.offsetWidth;
    wrap.classList.add('bump');
}

function updateCounter(delta) {
    const id = ACTIVITIES[state.currentIndex].id;
    const next = Math.max(0, Math.min(9999, state.counts[id] + delta));
    setCounter(next);
}

function setCounter(value) {
    const id = ACTIVITIES[state.currentIndex].id;
    state.counts[id] = value;
    $('counterInput').value = value;
}

function handleNextActivity() {
    const id = ACTIVITIES[state.currentIndex].id;
    const inputVal = parseInt($('counterInput').value, 10);
    state.counts[id] = isNaN(inputVal) || inputVal < 0 ? 0 : Math.min(inputVal, 9999);

    if (state.currentIndex < ACTIVITIES.length - 1) {
        state.currentIndex++;
        loadActivity();
    } else {
        renderSummary();
        showScreen('summary');
        saveToCloud();
    }
}

function handlePrevActivity() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        loadActivity();
    } else {
        showScreen('name');
    }
}

// =====================================================
// RESUMEN
// =====================================================
function renderSummary() {
    $('summaryName').textContent = state.name;
    $('summaryDate').textContent = formatDate(new Date());
    $('summaryGreeting').textContent = `¡Bien hecho, ${state.name}! Estos son los conteos registrados.`;

    const list = $('summaryList');
    let total = 0;

    list.innerHTML = ACTIVITIES.map(a => {
        const v = state.counts[a.id];
        total += v;
        return `
            <div class="summary-row ${v === 0 ? 'is-zero' : ''}">
                <div class="row-icon"><i class="${a.icon}"></i></div>
                <div class="row-name">${a.name}</div>
                <div class="row-value">${v}</div>
            </div>
        `;
    }).join('');

    $('summaryTotal').textContent = total;
}

function formatDate(d) {
    return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function buildSummaryText() {
    const lines = [];
    lines.push('🙏 *Conteo de Actividades Espirituales*');
    lines.push('');
    lines.push(`👤 Nombre: ${state.name}`);
    lines.push(`📅 Fecha: ${formatDate(new Date())}`);
    lines.push('');
    lines.push('— Resumen —');

    let total = 0;
    ACTIVITIES.forEach(a => {
        const v = state.counts[a.id];
        total += v;
        lines.push(`• ${a.name}: ${v}`);
    });

    lines.push('');
    lines.push(`✨ Total de actividades: ${total}`);
    return lines.join('\n');
}

// =====================================================
// GUARDAR EN FIREBASE
// =====================================================
async function saveToCloud() {
    const status = $('cloudStatus');
    const statusText = $('cloudStatusText');
    const cloudIcon = status.querySelector('.cloud-icon');

    if (!firebaseReady) {
        // Sin Firebase no mostramos nada para no asustar al usuario.
        return;
    }

    if (state.saved) return;

    // Estado: guardando...
    status.hidden = false;
    status.classList.remove('cloud-success', 'cloud-error');
    status.classList.add('cloud-saving');
    cloudIcon.className = 'fas fa-cloud-arrow-up cloud-icon';
    statusText.textContent = 'Guardando en la nube...';

    try {
        const total = Object.values(state.counts).reduce((a, b) => a + b, 0);
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

        await addDoc(collection(db, COLLECTION_NAME), {
            name: state.name,
            nameLower: state.name.toLowerCase(),
            date: dateStr,
            counts: state.counts,
            total,
            timestamp: serverTimestamp()
        });

        state.saved = true;
        status.classList.remove('cloud-saving');
        status.classList.add('cloud-success');
        cloudIcon.className = 'fas fa-circle-check cloud-icon';
        statusText.textContent = '¡Guardado en la nube!';
    } catch (err) {
        console.error('Error al guardar en Firebase:', err);
        status.classList.remove('cloud-saving');
        status.classList.add('cloud-error');
        cloudIcon.className = 'fas fa-triangle-exclamation cloud-icon';
        statusText.textContent = 'No se pudo guardar en la nube (igual puedes compartir el resumen).';
    }
}

// =====================================================
// COMPARTIR
// =====================================================
function shareWhatsApp() {
    const text = encodeURIComponent(buildSummaryText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareEmail() {
    const subject = encodeURIComponent(`Conteo de actividades — ${state.name}`);
    const body    = encodeURIComponent(buildSummaryText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyToClipboard() {
    const text = buildSummaryText();

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('¡Copiado al portapapeles!'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast('¡Copiado al portapapeles!');
    } catch {
        showToast('No se pudo copiar 😕');
    }
    document.body.removeChild(ta);
}

// =====================================================
// TOAST
// =====================================================
let toastTimer;
function showToast(msg) {
    const toast = $('toast');
    $('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// =====================================================
// REINICIAR
// =====================================================
function restart() {
    state.name = '';
    state.currentIndex = 0;
    state.saved = false;
    ACTIVITIES.forEach(a => state.counts[a.id] = 0);
    $('userName').value = '';
    $('nameError').textContent = '';
    $('cloudStatus').hidden = true;
    showScreen('intro');
}
