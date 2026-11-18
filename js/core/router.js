// Navigation entre les onglets
import {$,$$} from "./utils.js";
import {bus} from "./bus.js";
$("#nav").onclick=e=>{const v=e.target.dataset.v;if(!v)return;$$("nav button").forEach(b=>b.classList.toggle("on",b===e.target));$$("section").forEach(s=>s.classList.toggle("on",s.id===v));bus.dispatchEvent(new Event("data"))};

// Ouvre un onglet depuis le code (ex. depuis un bouton « Entrée » de la liste du stock)
export function goto(id){const b=document.querySelector('nav button[data-v="'+id+'"]');if(b)b.click()}
