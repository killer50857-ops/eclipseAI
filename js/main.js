const PROXY_URL = 'https://ci991688.tw1.ru/proxy.php';
const PROXY_SECRET = 'my_shared_secret_123';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard')) {
        loadUser();
        setupEventListeners();
        loadTheme();
    }
});

async function loadUser() {
    const token = localStorage.getItem('discord_token');
    if (!token) { window.location.href = '/eclipseAI/'; return; }
    
    try {
        const response = await fetch('https://discord.com/api/users/@me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Token invalid');
        currentUser = await response.json();
        
        document.getElementById('userName').innerText = currentUser.global_name || currentUser.username;
        const avatarUrl = currentUser.avatar ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('profileName').innerText = currentUser.global_name || currentUser.username;
        document.getElementById('profileDiscordId').innerText = currentUser.id;
        document.getElementById('profileAvatar').src = avatarUrl;
        
        if (localStorage.getItem('isAdmin') === 'true') document.getElementById('adminBtn').style.display = 'inline-block';
        await loadStats();
    } catch (error) { localStorage.removeItem('discord_token'); window.location.href = '/eclipseAI/'; }
}

async function loadStats() {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ action: 'get_stats' })
        });
        const stats = await response.json();
        if (stats[currentUser?.id]) {
            document.getElementById('chatCount').innerText = stats[currentUser.id].chat || 0;
            document.getElementById('rpCount').innerText = stats[currentUser.id].rp || 0;
        }
    } catch (error) { console.error('Stats error:', error); }
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const prompt = input.value.trim();
    if (!prompt) return;
    addMessage('user-message', prompt, 'chatMessages');
    input.value = '';
    showTypingIndicator('chatMessages');
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ prompt: prompt, userId: currentUser?.id || 'guest' })
        });
        const data = await response.json();
        removeTypingIndicator('chatMessages');
        addMessage('bot-message', data.response || '⚠️ Ошибка', 'chatMessages');
        await updateStats('chat');
        await loadStats();
    } catch (error) { removeTypingIndicator('chatMessages'); addMessage('system-message', '⚠️ Ошибка соединения', 'chatMessages'); }
}

async function sendRp() {
    const input = document.getElementById('rpInput');
    const question = input.value.trim();
    if (!question) return;
    addMessage('user-message', question, 'rpMessages');
    input.value = '';
    showTypingIndicator('rpMessages');
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ question: question, userId: currentUser?.id || 'guest' })
        });
        const data = await response.json();
        removeTypingIndicator('rpMessages');
        addMessage('bot-message', data.answer || '⚠️ Ошибка', 'rpMessages');
        await updateStats('rp');
        await loadStats();
    } catch (error) { removeTypingIndicator('rpMessages'); addMessage('system-message', '⚠️ Ошибка соединения', 'rpMessages'); }
}

async function updateStats(type) {
    if (!currentUser?.id) return;
    try {
        await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ action: 'update_stats', userId: currentUser.id, type: type })
        });
    } catch (error) { console.error('Stats update error:', error); }
}

async function refreshLawsCache() {
    showNotification('🔄 Обновление базы законов с форума Majestic RP...', 'success');
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ action: 'refresh_laws' })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('✅ База законов будет обновлена при следующем запросе!', 'success');
            await loadLawsInfo();
        } else {
            showNotification('❌ Ошибка обновления', 'error');
        }
    } catch (error) { showNotification('❌ Ошибка соединения', 'error'); }
}

async function loadLawsInfo() {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ action: 'laws_info' })
        });
        const data = await response.json();
        const infoDiv = document.getElementById('lawsInfo');
        if (infoDiv && data.cached) {
            infoDiv.innerHTML = `📜 База законов: ${data.sources_count || 0} источников загружено<br>⏰ Последнее обновление: ${data.last_update || 'неизвестно'}`;
        } else if (infoDiv) {
            infoDiv.innerHTML = '📜 База законов ещё не загружена. Задайте вопрос в RP-помощник для автоматической загрузки.';
        }
    } catch (error) { console.error('Laws info error:', error); }
}

function addMessage(type, content, containerId) {
    const container = document.getElementById(containerId);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div><div class="message-time">${time}</div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator(containerId) {
    const container = document.getElementById(containerId);
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicator';
    indicator.className = 'message bot-message';
    indicator.innerHTML = '<div class="message-content">🌙 Eclipse AI анализирует законы...</div>';
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(containerId) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function loadTheme() { const savedTheme = localStorage.getItem('siteTheme'); if (savedTheme) document.body.className = `theme-${savedTheme}`; }

function changeTheme(theme) { localStorage.setItem('siteTheme', theme); document.body.className = `theme-${theme}`; showNotification(`Тема изменена на ${theme}`, 'success'); }

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerText = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function openAdmin() { document.getElementById('adminModal').style.display = 'block'; }
function closeAdmin() { document.getElementById('adminModal').style.display = 'none'; }

async function verifyAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (password === 'style42') {
        localStorage.setItem('isAdmin', 'true');
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        await loadUsersList();
        await loadLawsInfo();
        showNotification('Добро пожаловать в админ-панель!', 'success');
    } else { showNotification('Неверный пароль!', 'error'); }
}

async function loadUsersList() {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: JSON.stringify({ action: 'get_users' })
        });
        const users = await response.json();
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = (users.length ? users.map(user => `<div class="list-item"><strong>${escapeHtml(user.username)}</strong><br>Discord ID: ${user.discord_id}<br>Зарегистрирован: ${new Date(user.registered_at).toLocaleString()}</div>`).join('') : '<div>Нет пользователей</div>');
        }
    } catch (error) { console.error('Load users error:', error); }
}

function clearChat() { const c = document.getElementById('chatMessages'); if (c) { c.innerHTML = '<div class="welcome-message"><div class="ai-icon">🌙</div><div><h3>Чат очищен</h3><p>Задайте новый вопрос!</p></div></div>'; showNotification('Чат очищен', 'success'); } }
function clearRp() { const c = document.getElementById('rpMessages'); if (c) { c.innerHTML = '<div class="welcome-message"><div class="ai-icon">⚖️</div><div><h3>История очищена</h3><p>Задайте вопрос о законах!</p></div></div>'; showNotification('История RP очищена', 'success'); } }
function logout() { localStorage.clear(); window.location.href = '/eclipseAI/'; }

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (event?.target) event.target.classList.add('active');
}

function setupEventListeners() {
    document.getElementById('sendChatBtn')?.addEventListener('click', sendChat);
    document.getElementById('sendRpBtn')?.addEventListener('click', sendRp);
    document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
    document.getElementById('clearRpBtn')?.addEventListener('click', clearRp);
    document.getElementById('adminBtn')?.addEventListener('click', openAdmin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('verifyAdminBtn')?.addEventListener('click', verifyAdmin);
    document.getElementById('applyThemeBtn')?.addEventListener('click', () => { changeTheme(document.getElementById('themeSelect').value); });
    document.getElementById('refreshLawsBtn')?.addEventListener('click', refreshLawsCache);
    document.querySelector('.close')?.addEventListener('click', closeAdmin);
    document.getElementById('chatInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendChat(); });
    document.getElementById('rpInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendRp(); });
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', (e) => { const tab = btn.getAttribute('data-tab'); if (tab) switchTab(tab); }); });
    document.querySelectorAll('.theme-option').forEach(btn => { btn.addEventListener('click', () => changeTheme(btn.dataset.theme)); });
}

window.switchTab = switchTab; window.openAdmin = openAdmin; window.closeAdmin = closeAdmin; window.logout = logout;
