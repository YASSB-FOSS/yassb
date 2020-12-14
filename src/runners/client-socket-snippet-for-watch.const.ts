/**
 * Code fragment use to make the client listen for changes to the code in watch mode.
 * Formatted as a string and not code for easier injection in HTML.
 */
export const CLIENT_SOCKET_SNIPPET_FOR_WATCH = `<script>
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log(data.msg);
  if (data.type === 'end')
    location.reload();
};</script></body>`;
