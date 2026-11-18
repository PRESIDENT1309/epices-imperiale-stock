// Impression d’une liste (journal, dettes, documents) avec en-tête Épice Impériale
import {$,esc,fd,today} from "./utils.js";
import {S} from "./state.js";
export function printReport(title,sub,body){
  const s=S.set;$("#rp").innerHTML=`<div class="hd"><img src="assets/logo.png" alt="Épice Impériale"></div><div class="tt">${esc(title)}</div><div style="text-align:center;color:#5d6b64;margin-bottom:12px">${esc(sub)} · imprimé le ${fd(today())}</div>${body}<div class="ct"><div>${esc(s.mere)} — ${esc(s.adr)}</div><div>${esc([s.tel,s.mail].filter(Boolean).join(" · "))}</div></div>`;
  document.body.classList.add("rp-mode");setTimeout(()=>window.print(),80)}
window.addEventListener("afterprint",()=>document.body.classList.remove("rp-mode"));
