export function markProcessed(html: string): string {
  return html.replace('</footer>', '<span class="post-processed"></span></footer>');
}
