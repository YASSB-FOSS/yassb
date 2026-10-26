import type { ServerResponse } from 'http';
import type { Diagnostic } from '../diagnostics/diagnostics';

/**
 * Live reload for `yassb watch`, over Server-Sent Events on the dev server itself (`/__yassb/events`).
 *
 * Events sent to the browser:
 * - `building`: a rebuild started (a small badge is shown);
 * - `reload`: pages changed, reload;
 * - `css`: only the stylesheet changed, swap it without reloading;
 * - `status`: errors of the last build, shown in an overlay (or hidden when there are none).
 */
export class LiveReloadHub {

  private clients = new Set<ServerResponse>();
  private sessionId = String(Date.now());
  private lastStatus: LiveStatus = { building: false, errors: [], warnings: 0 };

  public connect(response: ServerResponse): void {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    response.write(`retry: 1000\nevent: hello\ndata: ${this.sessionId}\n\n`);
    response.write(`event: status\ndata: ${JSON.stringify(this.lastStatus)}\n\n`);
    this.clients.add(response);
    response.on('close', () => this.clients.delete(response));
  }

  public status(): LiveStatus {
    return this.lastStatus;
  }

  public building(): void {
    this.lastStatus = { ...this.lastStatus, building: true };
    this.send('building', '{}');
  }

  /** Publishes the result of a build and tells the browser what to refresh. */
  public publish(diagnostics: Array<Diagnostic>, refresh: 'reload' | 'css' | 'none'): void {
    this.lastStatus = {
      building: false,
      errors: diagnostics.filter(item => item.level === 'error').slice(0, 30),
      warnings: diagnostics.filter(item => item.level === 'warning').length
    };
    this.send('status', JSON.stringify(this.lastStatus));
    if (refresh !== 'none')
      this.send(refresh, '{}');
  }

  public close(): void {
    for (const client of this.clients)
      client.end();
    this.clients.clear();
  }

  private send(event: string, data: string): void {
    for (const client of this.clients)
      client.write(`event: ${event}\ndata: ${data}\n\n`);
  }

}

export interface LiveStatus {
  building: boolean;
  errors: Array<Diagnostic>;
  warnings: number;
}

/**
 * Script injected before `</body>` of every page in watch mode.
 */
export const LIVE_RELOAD_SNIPPET = `<script data-yassb-live-reload>(function(){
var es=new EventSource('/__yassb/events'),session=null,box=null,badge=null;
function el(t,s,h){var e=document.createElement(t);e.setAttribute('style',s);if(h!==undefined)e.textContent=h;return e;}
function hideBox(){if(box){box.remove();box=null;}}
function showBox(s){hideBox();if(!s.errors||!s.errors.length)return;
box=el('div','position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;z-index:2147483647;background:#1d1f21;color:#f8f8f2;font:13px/1.45 ui-monospace,Menlo,monospace;padding:12px 16px;border-top:3px solid #e5534b;box-shadow:0 -4px 24px rgba(0,0,0,.4)');
var head=el('div','display:flex;justify-content:space-between;margin-bottom:8px;font-weight:bold','');head.appendChild(el('span','color:#ff938a','YASSB: '+s.errors.length+' error(s) in the last build'));
var x=el('button','background:none;border:0;color:#aaa;cursor:pointer;font:inherit','close');x.onclick=hideBox;head.appendChild(x);box.appendChild(head);
s.errors.forEach(function(d){var item=el('div','margin:0 0 10px');item.appendChild(el('div','color:#ffd479',d.code+(d.file?'  '+d.file+(d.line?':'+d.line:''):'')));item.appendChild(el('div','white-space:pre-wrap',d.message));if(d.hint)item.appendChild(el('div','color:#9aa5b1;white-space:pre-wrap','hint: '+d.hint));box.appendChild(item);});
document.body.appendChild(box);}
function setBadge(on){if(on&&!badge){badge=el('div','position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#2e5545;color:#fff;font:12px ui-monospace,Menlo,monospace;padding:6px 10px;border-radius:6px;opacity:.9','YASSB: rebuilding…');document.body.appendChild(badge);}if(!on&&badge){badge.remove();badge=null;}}
es.addEventListener('hello',function(e){if(session&&session!==e.data)location.reload();session=e.data;});
es.addEventListener('building',function(){setBadge(true);});
es.addEventListener('status',function(e){var s=JSON.parse(e.data);setBadge(s.building);showBox(s);});
es.addEventListener('reload',function(){location.reload();});
es.addEventListener('css',function(){document.querySelectorAll('link[rel="stylesheet"]').forEach(function(l){var u=new URL(l.href,location.href);if(u.origin!==location.origin)return;u.searchParams.set('yassb',Date.now());l.href=u.toString();});});
})();</script>`;
