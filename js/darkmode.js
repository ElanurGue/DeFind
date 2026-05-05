// Button ins DOM einfügen
const btn = document.createElement('button');
btn.id = 'dark-mode-toggle';
btn.title = 'Dark Mode umschalten';
btn.textContent = '🌙';
document.body.appendChild(btn);

// Gespeicherte Einstellung laden
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    btn.textContent = '☀️';
}

// Click-Event
btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    btn.textContent = isDark ? '☀️' : '🌙';
});