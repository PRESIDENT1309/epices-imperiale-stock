// Page « Mouvements » : entrées et sorties de stock, historique
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut,csvFile,waText} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

const MOTIFS={entree:{achat:"Achat",retour:"Retour",autre:"Autre entrée"},sortie:{vente:"Vente",perte:"Perte / casse",autre:"Autre sortie"}};
const MLAB={achat:"Achat",retour:"Retour",perte:"Perte / casse",autre:"Autre",vente:"Vente",production:"Production",inventaire:"Inventaire"};
const art=id=>S.articles.find(a=>a.id===id);
$("#m_date").value=today();

function options(){return Object.entries(CAT).map(([k,v])=>{const l=S.articles.filter(a=>a.actif&&a.categorie===k);return l.length?`<optgroup label="${v}">${l.map(a=>`<option value="${esc(a.id)}">${esc(a.nom)}</option>`).join("")}</optgroup>`:""}).join("")}
function fillMotifs(){$("#m_motif").innerHTML=Object.entries(MOTIFS[$("#m_type").value]).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}
function hint(){const a=art($("#m_art").value);$("#m_hint").textContent=a?"En stock : "+qte(a.stock,a.unite):"";$("#m_unit").textContent=a?"("+a.unite+")":""}
$("#m_type").onchange=fillMotifs;$("#m_art").onchange=hint;fillMotifs();

$("#mf").onsubmit=async e=>{e.preventDefault();
  const a=art($("#m_art").value);if(!a){alert("Choisissez un article.");return}
  const q=+$("#m_qte").value,type=$("#m_type").value;if(!(q>0)){alert("Quantité invalide.");return}
  if(type==="sortie"&&q>a.stock&&!confirm("Stock insuffisant : il reste "+qte(a.stock,a.unite)+". Enregistrer quand même ?"))return;
  const{error}=await sb.from("st_mouvements").insert({article_id:a.id,date:$("#m_date").value,type,motif:$("#m_motif").value,quantite:q,tiers:$("#m_tiers").value.trim()||null,lot:$("#m_lot").value.trim()||null,note:$("#m_note").value.trim()||null});
  if(error)return err(error);
  ["m_qte","m_tiers","m_lot","m_note"].forEach(i=>$("#"+i).value="");await refresh()};

function list(){const fa=$("#m_fa").value,ft=$("#m_ft").value,fm=$("#m_fm").value;return S.mvts.filter(m=>(!fa||m.article_id===fa)&&(!ft||m.type===ft)&&(!fm||m.date.slice(0,7)===fm))}
const detail=m=>[m.tiers,m.lot&&"lot "+m.lot,m.note].filter(Boolean).join(" · ");
function render(){
  const cur=$("#m_art").value,fa=$("#m_fa").value;
  $("#m_art").innerHTML='<option value="">Choisir un article…</option>'+options();$("#m_art").value=cur;
  $("#m_fa").innerHTML='<option value="">Tous les articles</option>'+options();$("#m_fa").value=fa;
  hint();
  const l=list(),admin=session.me&&session.me.role==="admin";
  $("#m_tb").innerHTML=l.length?l.slice(0,300).map(m=>{const a=art(m.article_id)||{nom:"(supprimé)",unite:""},auto=m.production_id||m.document_id;
    return `<tr><td>${fd(m.date)}</td><td>${esc(a.nom)}</td><td class="n ${m.type==="entree"?"in":"out"}">${m.type==="entree"?"+":"−"} ${esc(qte(m.quantite,a.unite))}</td><td>${esc(MLAB[m.motif]||m.motif)}</td><td>${esc(detail(m))}</td><td class="n">${auto?"<small>automatique</small>":admin?`<button class="btn ghost sm" data-del="${esc(m.id)}" aria-label="Supprimer">×</button>`:""}</td></tr>`}).join("")+(l.length>300?`<tr><td colspan="6" class="empty">… ${l.length-300} autres lignes : filtrez par article ou par mois.</td></tr>`:"")
    :'<tr><td colspan="6" class="empty">Aucun mouvement.</td></tr>';
}
["m_fa","m_ft","m_fm"].forEach(i=>$("#"+i).oninput=render);
$("#m_tb").onclick=async e=>{const id=e.target.dataset.del;if(!id||!confirm("Supprimer ce mouvement ? Le stock sera recalculé."))return;
  const{error}=await sb.from("st_mouvements").delete().eq("id",id);if(error)return err(error);await refresh()};
$("#m_print").onclick=()=>{const l=list().slice().sort((a,b)=>a.date.localeCompare(b.date));if(!l.length){alert("Rien à imprimer.");return}
  const rows=l.map(m=>{const a=art(m.article_id)||{nom:"(supprimé)",unite:""};return `<tr><td>${fd(m.date)}</td><td>${esc(a.nom)}</td><td class="n">${m.type==="entree"?"+":"−"} ${esc(qte(m.quantite,a.unite))}</td><td>${esc(MLAB[m.motif]||m.motif)}</td><td>${esc(detail(m))}</td></tr>`}).join("");
  const f=[$("#m_fa").value&&(art($("#m_fa").value)||{}).nom,$("#m_ft").value==="entree"?"Entrées":$("#m_ft").value==="sortie"?"Sorties":"",$("#m_fm").value].filter(Boolean).join(" · ")||"Tout l’historique";
  printReport("Mouvements de stock",f,`<table><thead><tr><th>Date</th><th>Article</th><th class="n">Quantité</th><th>Motif</th><th>Détail</th></tr></thead><tbody>${rows}</tbody></table>`)};

// Export : CSV (partage ou téléchargement) et message WhatsApp
$("#m_csv").onclick=()=>{const l=list();if(!l.length){alert("Rien à exporter.");return}
  const rows=[["Date","Type","Article","Quantité","Unité","Motif","Fournisseur / client","Lot","Note"],...l.map(m=>{const a=art(m.article_id)||{nom:"(supprimé)",unite:""};return[m.date,m.type==="entree"?"Entrée":"Sortie",a.nom,m.quantite,a.unite,MLAB[m.motif]||m.motif,m.tiers||"",m.lot||"",m.note||""]})];
  shareOut({files:[csvFile("mouvements-stock-epice-imperiale.csv",rows)],title:"Mouvements de stock"})};
$("#m_wa").onclick=()=>{const l=list();if(!l.length){alert("Rien à envoyer.");return}
  waText("*Mouvements de stock* — "+fd(today())+"\n\n"+l.slice(0,30).map(m=>{const a=art(m.article_id)||{nom:"(supprimé)",unite:""};return fd(m.date)+" · "+a.nom+" · "+(m.type==="entree"?"+":"−")+" "+qte(m.quantite,a.unite)+" ("+(MLAB[m.motif]||m.motif)+")"+(detail(m)?" · "+detail(m):"")}).join("\n")+(l.length>30?"\n\n… "+(l.length-30)+" autres lignes : utilisez l’export CSV.":""))};
bus.addEventListener("data",render);
export {render};
