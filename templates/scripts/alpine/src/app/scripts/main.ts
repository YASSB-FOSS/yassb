// Browser script, bundled with esbuild into assets/js/main-<version>.min.js.
// Alpine.js adds behaviour from the HTML: x-data, @click, x-show… (https://alpinejs.dev).
import Alpine from 'alpinejs';

document.documentElement.classList.add('js');
Alpine.start();
