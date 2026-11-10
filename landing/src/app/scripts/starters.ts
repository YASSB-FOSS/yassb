/** Starters on the home page: the command, its output and the file list follow the presets picked. */
export function setupStarterPicker(): void {
  const root = document.querySelector<HTMLElement>('[data-starter-picker]');
  if (!root)
    return;
  const fallbacks: { [axis: string]: string } = JSON.parse(root.dataset.fallbacks || '{}');
  const flags = root.querySelector<HTMLElement>('[data-starter-flags]');
  const copy = root.querySelector<HTMLElement>('[data-starter-copy]');

  const update = () => {
    const selection: { [axis: string]: { value: string; description: string } } = {};
    root.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked').forEach(input => {
      selection[input.name] = { value: input.value, description: input.dataset.description || '' };
    });
    const text = Object.entries(selection)
      .filter(([axis, { value }]) => value && value !== fallbacks[axis])
      .map(([axis, { value }]) => ` --${axis} ${value}`)
      .join('');
    if (flags)
      flags.textContent = text;
    if (copy)
      copy.dataset.copy = `npx yassb-web new my-site${text}`;
    root.querySelectorAll<HTMLElement>('[data-starter-line]').forEach(line => {
      const chosen = selection[line.dataset.starterLine || ''];
      line.hidden = !chosen?.value;
      const name = line.querySelector('[data-starter-name]');
      const description = line.querySelector('[data-starter-description]');
      if (chosen?.value && name && description) {
        name.textContent = chosen.value;
        description.textContent = `— ${chosen.description}`;
      }
    });
    root.querySelectorAll<HTMLElement>('[data-starter-file]').forEach(file => {
      const [axis, preset] = (file.dataset.starterFile || '').split(':');
      file.hidden = selection[axis]?.value !== preset;
    });
  };

  root.addEventListener('change', update);
  update();
}
