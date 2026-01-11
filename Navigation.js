document.addEventListener('DOMContentLoaded', () => {
    
    console.log('Hamburger:', document.querySelector('.hamburger'));
    console.log('Nav:', document.querySelector('nav'));
 
    
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');

    if (!hamburger || !nav) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        nav.classList.toggle('active');
    });

    // Menü schließen bei Klick auf Link
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
        });
    });
});
