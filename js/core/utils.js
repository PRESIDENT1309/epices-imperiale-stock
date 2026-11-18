// Petites fonctions utilitaires partagées par toutes les pages
export const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
export const err=e=>alert("Erreur : "+(e&&e.message||e));
export const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const sym=c=>c==="USD"?"$":"FC";
export const fmt=(n,c)=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(n)+" "+sym(c);
// Date du jour à l’heure locale (toISOString donnerait la veille entre minuit et 1 h à Kinshasa)
export const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
export const fd=d=>d.split("-").reverse().join("/");
export function dl(txt,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(txt instanceof Blob?txt:new Blob([txt],{type}));a.download=name;a.click()}
