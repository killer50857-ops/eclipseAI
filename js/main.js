const PROXY_URL = 'https://cm599040.tw1.ru/proxy.php';
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
        const response = await fetch(PRO
