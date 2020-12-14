import { multiplyHeadsAsBodyRows } from './responsive-table/multiply-heads-as-body-rows.function';
import { setHeights } from './responsive-table/set-heights';

window['toggleNavbar'] = (collapseID) => {
  document.getElementById(collapseID).classList.toggle("hidden");
  document.getElementById(collapseID).classList.toggle("block");
}

window.document.addEventListener("DOMContentLoaded", () => {
  // If late; I mean on time.
  if (document.readyState === "interactive" || document.readyState === "complete") {
  }
});
multiplyHeadsAsBodyRows();

window.onresize = setHeights;

