// ==================== КОНФИГУРАЦИЯ ====================
const PROXY_URL = 'https://cm599040.tw1.ru/proxy.php';
const PROXY_SECRET = 'my_shared_secret_123';
let currentUser = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard')) {
        loadUser();
        setupEventListeners();
        loadTheme();
    }
});

// ==================== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ====================
async function loadUser() {
    const token = localStorage.getItem('discord_token');
    const tokenTime = localStorage.getItem('discord_token_time');
    const isExpired = tokenTime && (Date.now() - parseInt(tokenTime) > 86400000);
    
    if (!token || isExpired) {
        if (isExpired) {
            localStorage.removeItem('discord_token');
            localStorage.removeItem('discord_token_time');
        }
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Token invalid');
        
        currentUser = await response.json();
        
        document.getElementById('userName').innerText = currentUser.global_name || currentUser.username;
        const avatarUrl = currentUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('profileName').innerText = currentUser.global_name || currentUser.username;
        document.getElementById('profileDiscordId').innerText = currentUser.id;
        document.getElementById('profileAvatar').src = avatarUrl;
        
        const savedAdmin = localStorage.getItem('isAdmin');
        if (savedAdmin === 'true') {
            document.getElementById('adminBtn').style.display = 'inline-block';
        }
        
        await loadStats();
        
    } catch (error) {
        localStorage.removeItem('discord_token');
        localStorage.removeItem('discord_token_time');
        window.location.href = '/';
    }
}

// ==================== СТАТИСТИКА ====================
async function loadStats() {
    try {
        const response = await fetch(`${PROXY_URL}/get_stats`, {
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        const stats = await response.json();
        
        if (stats[currentUser?.id]) {
            document.getElementById('chatCount').innerText = stats[currentUser.id].chat || 0;
            document.getElementById('rpCount').innerText = stats[currentUser.id].rp || 0;
        }
    } catch (error) {
        console.error('Stats error:', error);
    }
}

// ==================== ОТПРАВКА В ЧАТ ====================
async function sendChat() {
    const input = document.getElementById('chatInput');
    const prompt = input.value.trim();
    if (!prompt) return;
    
    addMessage('user-message', prompt, 'chatMessages');
    input.value = '';
    
    // Улучшенный промт для ИИ
    const enhancedPrompt = `Ты — Eclipse AI, умный помощник на сервере BOSTON Majestic RP. 
Отвечай дружелюбно, полезно и по-русски. Используй эмодзи.
Вопрос: ${prompt}
Ответ:`;
    
    showTypingIndicator('chatMessages');
    
    try {
        const response = await fetch(`${PROXY_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXY_SECRET}`
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                userId: currentUser?.id,
                model: 'gpt-4o-mini'
            })
        });
        
        const data = await response.json();
        removeTypingIndicator('chatMessages');
        addMessage('bot-message', data.response, 'chatMessages');
        await loadStats();
        
    } catch (error) {
        removeTypingIndicator('chatMessages');
        addMessage('system-message', '⚠️ Ошибка связи с ИИ. Попробуйте позже.', 'chatMessages');
    }
}

// ==================== ОТПРАВКА В RP (ЗАКОНЫ) ====================
async function sendRp() {
    const input = document.getElementById('rpInput');
    const question = input.value.trim();
    if (!question) return;
    
    addMessage('user-message', question, 'rpMessages');
    input.value = '';
    
    // СПЕЦИАЛЬНЫЙ ПРОМТ ДЛЯ ЗАКОНОВ
    const lawsPrompt = `Ты — юридический помощник сервера BOSTON Majestic RP.
Твоя задача: отвечать СТРОГО на основе законов сервера, которые загружены в базу знаний.

ПРАВИЛА ОТВЕТА:
1. Если вопрос связан с законами сервера — дай точный ответ из законов.
2. Если ответ не найден в законах — скажи: "❌ Информация не найдена в законах сервера BOSTON Majestic RP. Обратитесь к администрации."
3. Если вопрос не касается законов — вежливо скажи: "ℹ️ Этот вопрос не относится к законам сервера. Пожалуйста, задайте вопрос в ИИ-чат."
4. Отвечай на русском языке, чётко и по делу.
5. Если можешь, укажи статью или раздел закона.

Вопрос игрока о законах: ${question}

Ответ на основе законов сервера:`;

    showTypingIndicator('rpMessages');
    
    try {
        const response = await fetch(`${PROXY_URL}/rp_ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXY_SECRET}`
            },
            body: JSON.stringify({
                question: lawsPrompt,
                userId: currentUser?.id
            })
        });
        
        const data = await response.json();
        removeTypingIndicator('rpMessages');
        addMessage('bot-message', data.answer, 'rpMessages');
        await loadStats();
        
    } catch (error) {
        removeTypingIndicator('rpMessages');
        addMessage('system-message', '⚠️ Ошибка получения ответа по законам. Попробуйте позже.', 'rpMessages');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
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
    indicator.innerHTML = '<div class="message-content">🌙 Eclipse AI печатает<span class="dots">...</span></div>';
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(containerId) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== ТЕМЫ ====================
function loadTheme() {
    const savedTheme = localStorage.getItem('siteTheme');
    if (savedTheme) {
        document.body.className = `theme-${savedTheme}`;
    }
}

function changeTheme(theme) {
    localStorage.setItem('siteTheme', theme);
    document.body.className = `theme-${theme}`;
    showNotification(`Тема изменена на ${theme}`, 'success');
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerText = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ==================== АДМИН-ПАНЕЛЬ ====================
function openAdmin() {
    document.getElementById('adminModal').style.display = 'block';
}

function closeAdmin() {
    document.getElementById('adminModal').style.display = 'none';
}

async function verifyAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (password === 'style42') {
        localStorage.setItem('isAdmin', 'true');
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        await loadUsersList();
        showNotification('Добро пожаловать в админ-панель!', 'success');
    } else {
        showNotification('Неверный пароль!', 'error');
    }
}

async function loadUsersList() {
    try {
        const response = await fetch(`${PROXY_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        const users = await response.json();
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = users.map(user => `
                <div class="list-item">
                    <strong>${escapeHtml(user.username)}</strong><br>
                    Discord ID: ${user.discord_id}<br>
                    Зарегистрирован: ${new Date(user.registered_at).toLocaleString()}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Load users error:', error);
    }
}

async function uploadLaw() {
    const fileInput = document.getElementById('lawFile');
    const file = fileInput?.files[0];
    if (!file) {
        showNotification('Выберите файл!', 'error');
        return;
    }
    const formData = new FormData();
    formData.append('lawfile', file);
    try {
        const response = await fetch(`${PROXY_URL}/admin/upload_law`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` },
            body: formData
        });
        if (response.ok) {
            showNotification('Закон загружен! Помощник обновлён.', 'success');
            fileInput.value = '';
        } else {
            showNotification('Ошибка загрузки!', 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки!', 'error');
    }
}

async function rebuildLaws() {
    showNotification('🔄 Переобучение помощника...', 'success');
    try {
        const response = await fetch(`${PROXY_URL}/admin/rebuild_laws`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        if (response.ok) {
            showNotification('✅ Законы переобучены! RP-помощник обновлён.', 'success');
        } else {
            showNotification('❌ Ошибка переобучения!', 'error');
        }
    } catch (error) {
        showNotification('❌ Ошибка переобучения!', 'error');
    }
}

function clearChat() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.innerHTML = `<div class="welcome-message"><div class="ai-icon">🌙</div><div class="welcome-text"><h3>Чат очищен</h3><p>Задайте новый вопрос!</p></div></div>`;
        showNotification('Чат очищен', 'success');
    }
}

function clearRp() {
    const container = document.getElementById('rpMessages');
    if (container) {
        container.innerHTML = `<div class="welcome-message"><div class="ai-icon">⚖️</div><div class="welcome-text"><h3>История очищена</h3><p>Задайте вопрос о законах!</p></div></div>`;
        showNotification('История RP очищена', 'success');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ==================== НАСТРОЙКА СОБЫТИЙ ====================
function setupEventListeners() {
    // Чат
    document.getElementById('sendChatBtn')?.addEventListener('click', sendChat);
    document.getElementById('sendRpBtn')?.addEventListener('click', sendRp);
    document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
    document.getElementById('clearRpBtn')?.addEventListener('click', clearRp);
    
    // Админка
    document.getElementById('adminBtn')?.addEventListener('click', openAdmin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('verifyAdminBtn')?.addEventListener('click', verifyAdmin);
    document.getElementById('applyThemeBtn')?.addEventListener('click', () => {
        const theme = document.getElementById('themeSelect').value;
        changeTheme(theme);
    });
    document.getElementById('uploadLawBtn')?.addEventListener('click', uploadLaw);
    document.getElementById('rebuildLawsBtn')?.addEventListener('click', rebuildLaws);
    
    // Закрытие модалки
    document.querySelector('.close')?.addEventListener('click', closeAdmin);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('adminModal');
        if (e.target === modal) closeAdmin();
    });
    
    // Enter для отправки
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
    document.getElementById('rpInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendRp();
    });
    
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
window.switchTab = switchTab;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.logout = logout;
window.sendChat = sendChat;
window.sendRp = sendRp;
window.changeTheme = changeTheme;
window.clearChat = clearChat;
window.clearRp = clearRp;
