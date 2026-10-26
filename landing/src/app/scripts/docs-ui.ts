/** Small behaviours of the docs: "On this page" highlight, copy buttons, mobile navigation. */
export function setupTableOfContents(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  if (!links.length)
    return;
  const headings = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter((heading): heading is HTMLElement => !!heading);
  const update = () => {
    let current = headings[0];
    for (const heading of headings)
      if (heading.getBoundingClientRect().top < 120)
        current = heading;
    links.forEach(link => link.setAttribute('aria-current', String(link.hash === `#${current?.id}`)));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

export function setupCopyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('.copy-code, [data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = button.dataset.copy ?? button.parentElement?.querySelector('code')?.textContent ?? '';
      try {
        await navigator.clipboard.writeText(text);
        const label = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => button.textContent = label, 1500);
      } catch {
        // clipboard not available
      }
    });
  });
}

export function setupMobileNavigation(): void {
  const panel = document.querySelector<HTMLElement>('[data-mobile-nav]');
  if (!panel)
    return;
  document.querySelectorAll('[data-mobile-nav-open]').forEach(button => button.addEventListener('click', () => panel.hidden = false));
  document.querySelectorAll('[data-mobile-nav-close]').forEach(button => button.addEventListener('click', () => panel.hidden = true));
  panel.addEventListener('click', event => {
    if (event.target === panel)
      panel.hidden = true;
  });
}
