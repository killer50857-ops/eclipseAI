// Конфигурация
const PROXY_URL = 'https://cm599040.tw1.ru/proxy.php';
const PROXY_SECRET = 'my_shared_secret_123';
let currentUser = null;
let chatHistory = [];
let rpHistory = [];

// Загрузка пользователя
async function loadUser() {
    const token = localStorage.getItem('discord_token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentUser = await response.json();
        
        if (!currentUser.id) throw new Error('No user');
        
        // Обновляем UI
        document.getElementById('userName').innerText = currentUser.global_name || currentUser.username;
        document.getElementById('userAvatar').src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
        document.getElementById('profileName').innerText = currentUser.global_name || currentUser.username;
        document.getElementById('profileDiscordId').innerText = currentUser.id;
        document.getElementById('profileGlobalName').innerText = currentUser.global_name || 'Не указано';
        document.getElementById('profileAvatar').src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
        
        // Проверяем админа
        checkAdminStatus();
        
        // Загружаем тему
        loadTheme();
        
        // Загружаем статистику
        loadStats();
        
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('discord_token');
        window.location.href = '/';
    }
}

// Проверка админа
function checkAdminStatus() {
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') {
        document.getElementById('adminBtn').style.display = 'inline-block';
    }
}

// Загрузка темы
async function loadTheme() {
    const savedTheme = localStorage.getItem('siteTheme');
    if (savedTheme) {
        document.body.className = `theme-${savedTheme}`;
    } else {
        document.body.className = 'theme-eclipse';
    }
}

// Смена темы
async function changeTheme(theme) {
    try {
        const response = await fetch(`${PROXY_URL}/set_theme`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXY_SECRET}`
            },
            body: JSON.stringify({ theme, adminKey: localStorage.getItem('adminKey') })
        });
        
        if (response.ok) {
            localStorage.setItem('siteTheme', theme);
            document.body.className = `theme-${theme}`;
            showNotification('Тема изменена!', 'success');
        }
    } catch (error) {
        console.error('Theme error:', error);
    }
}

// УЛУЧШЕННЫЙ ПРОМТ ДЛЯ ИИ-ЧАТА
async function sendChat() {
    const input = document.getElementById('chatInput');
    const prompt = input.value.trim();
    
    if (!prompt) return;
    
    addMessage('user-message', prompt, 'chatMessages');
    input.value = '';
    
    const enhancedPrompt = `Ты — Eclipse AI, умный и дружелюбный помощник на игровом сервере BOSTON Majestic RP. 
Твоя задача: давать полезные, точные и развёрнутые ответы на любые вопросы игроков.
Будь вежливым, но с характером. Используй эмодзи где уместно.
Отвечай на русском языке, понятно и структурированно.

Вопрос игрока: ${prompt}

Ответ Eclipse AI:`;
    
    try {
        const response = await fetch(`${PROXY_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXY_SECRET}`
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                userId: currentUser.id,
                model: 'gpt-4o-mini'
            })
        });
        
        const data = await response.json();
        addMessage('bot-message', data.response, 'chatMessages');
        
    } catch (error) {
        addMessage('system-message', '⚠️ Ошибка связи с ИИ. Попробуйте позже.', 'chatMessages');
    }
}

// УЛУЧШЕННЫЙ ПРОМТ ДЛЯ RP-ПОМОЩНИКА (ЗАКОНЫ)
async function sendRp() {
    const input = document.getElementById('rpInput');
    const question = input.value.trim();
    
    if (!question) return;
    
    addMessage('user-message', question, 'rpMessages');
    input.value = '';
    
    const lawsPrompt = `Ты — юридический помощник сервера BOSTON Majestic RP.
Твоя задача: отвечать строго на основе законов сервера, которые загружены в базу знаний.
Правила ответа:
1. Если вопрос связан с законами сервера — дай точный ответ из законов с указанием статьи, если возможно.
2. Если ответ не найден в законах — скажи: "❌ Информация не найдена в законах сервера BOSTON Majestic RP. Обратитесь к администрации."
3. Если вопрос не касается законов — вежливо перенаправь к общему ИИ-чату.
4. Отвечай на русском языке, чётко и по делу.
5. Используй эмодзи для наглядности.

Вопрос игрока о законах: ${question}

Ответ на основе законов сервера:`;
    
    try {
        const response = await fetch(`${PROXY_URL}/rp_ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXY_SECRET}`
            },
            body: JSON.stringify({
                question: lawsPrompt,
                userId: currentUser.id
            })
        });
        
        const data = await response.json();
        addMessage('bot-message', data.answer, 'rpMessages');
        
    } catch (error) {
        addMessage('system-message', '⚠️ Ошибка получения ответа по законам.', 'rpMessages');
    }
}

// Добавление сообщения в чат
function addMessage(type, content, containerId) {
    const container = document.getElementById(containerId);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(content)}</div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Эскейп HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch(`${PROXY_URL}/get_stats`, {
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        const stats = await response.json();
        
        if (stats[currentUser.id]) {
            document.getElementById('chatCount').innerText = stats[currentUser.id].chat || 0;
            document.getElementById('rpCount').innerText = stats[currentUser.id].rp || 0;
        }
    } catch (error) {
        console.error('Stats error:', error);
    }
}

// Админ-панель
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
        localStorage.setItem('adminKey', btoa('style42'));
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadUsersList();
        loadHistoryList();
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
        container.innerHTML = users.map(user => `
            <div class="list-item">
                <strong>${escapeHtml(user.username)}</strong><br>
                Discord ID: ${user.discord_id}<br>
                Зарегистрирован: ${new Date(user.registered_at).toLocaleString()}
            </div>
        `).join('');
    } catch (error) {
        console.error('Load users error:', error);
    }
}

async function loadHistoryList() {
    try {
        const response = await fetch(`${PROXY_URL}/admin/history`, {
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        const history = await response.json();
        
        const container = document.getElementById('historyList');
        container.innerHTML = history.map(item => `
            <div class="list-item">
                <strong>${escapeHtml(item.username)}</strong> [${item.type}]<br>
                ${item.type === 'chat' ? 'Вопрос: ' + escapeHtml(item.prompt) : 'Вопрос: ' + escapeHtml(item.question)}<br>
                Ответ: ${escapeHtml(item.content.substring(0, 100))}...<br>
                <small>${new Date(item.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load history error:', error);
    }
}

async function uploadLaw() {
    const fileInput = document.getElementById('lawFile');
    const file = fileInput.files[0];
    
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
            showNotification('Закон загружен успешно!', 'success');
            fileInput.value = '';
        }
    } catch (error) {
        showNotification('Ошибка загрузки!', 'error');
    }
}

async function rebuildLaws() {
    try {
        const response = await fetch(`${PROXY_URL}/admin/rebuild_laws`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PROXY_SECRET}` }
        });
        
        if (response.ok) {
            showNotification('Законы переобучены!', 'success');
        }
    } catch (error) {
        showNotification('Ошибка переобучения!', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerText = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 20px;
        font-family: 'Minecraft', monospace;
        z-index: 2000;
        animation: slideIn 0.3s;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function logout() {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminKey');
    window.location.href = '/';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard')) {
        loadUser();
        
        // Event listeners
        document.getElementById('sendChatBtn')?.addEventListener('click', sendChat);
        document.getElementById('sendRpBtn')?.addEventListener('click', sendRp);
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChat();
        });
        document.getElementById('rpInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendRp();
        });
        document.getElementById('adminBtn')?.addEventListener('click', openAdmin);
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
        document.getElementById('verifyAdminBtn')?.addEventListener('click', verifyAdmin);
        document.getElementById('applyThemeBtn')?.addEventListener('click', () => {
            const theme = document.getElementById('themeSelect').value;
            changeTheme(theme);
        });
        document.getElementById('uploadLawBtn')?.addEventListener('click', uploadLaw);
        document.getElementById('rebuildLawsBtn')?.addEventListener('click', rebuildLaws);
        
        document.querySelector('.close')?.addEventListener('click', closeAdmin);
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('adminModal')) closeAdmin();
        });
    }
});

// Обработка вкладок
window.switchTab = switchTab;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.verifyAdmin = verifyAdmin;
window.uploadLaw = uploadLaw;
window.rebuildLaws = rebuildLaws;
window.changeTheme = changeTheme;
window.logout = logout;
window.sendChat = sendChat;
window.sendRp = sendRp;