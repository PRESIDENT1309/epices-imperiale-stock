// Partage (WhatsApp, Facebook, e-mail…) via le menu du téléphone, sinon téléchargement
import {dl} from "./utils.js";
// Un texte qui commence par = + - @ serait exécuté comme formule par Excel : on le neutralise
const safe=v=>typeof v==="string"&&/^[=+\-@\t\r]/.test(v)?"'"+v:v;
export const toCsv=rows=>rows.map(r=>r.map(v=>'"'+String(safe(v)??"").replace(/"/g,'""')+'"').join(";")).join("\n");
export async function shareOut({files,title,text}){
  try{
    if(files&&navigator.canShare&&navigator.canShare({files})){await navigator.share({files,title,text});return}
    if(!files&&navigator.share){await navigator.share({title,text});return}
  }catch(e){if(e&&e.name==="AbortError")return}
  if(files){dl(files[0],files[0].name,files[0].type);alert("Fichier téléchargé : envoyez-le ensuite depuis votre téléphone (WhatsApp, Facebook, e-mail…).")}
  else{try{await navigator.clipboard.writeText(text);alert("Texte copié.")}catch(_){prompt("Copiez ce texte :",text)}}
}

// Fichier CSV prêt à partager (le BOM permet à Excel de lire les accents)
export const csvFile=(nom,rows)=>new File(["\ufeff"+toCsv(rows)],nom,{type:"text/csv"});
// Ouvre WhatsApp avec un message prêt : on choisit ensuite le contact
export function waText(text){const t=text.length>3500?text.slice(0,3500)+"\n… (suite dans le fichier CSV)":text;window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank")}
