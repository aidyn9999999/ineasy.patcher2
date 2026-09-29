const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('ineasy-theme');

if (savedTheme === 'light') document.body.classList.add('light-theme');

function updateThemeToggle() {
  const isLight = document.body.classList.contains('light-theme');
  themeToggle.setAttribute('aria-label', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
  themeToggle.setAttribute('title', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
}

themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('ineasy-theme', isLight ? 'light' : 'dark');
  updateThemeToggle();
});

updateThemeToggle();
