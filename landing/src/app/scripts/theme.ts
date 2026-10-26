/** Light/dark toggle of the docs; the choice is remembered (the head script applies it before paint). */
export function setupThemeToggle(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem('yassb-theme', dark ? 'dark' : 'light');
      } catch {
        // storage unavailable: the choice lasts for this page only
      }
    });
  });
}
