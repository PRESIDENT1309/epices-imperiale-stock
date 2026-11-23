// Page « Articles » : créer, modifier, archiver ; composition des produits finis
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut,csvFile,waText} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

let editId=null,C=[];   // C = composition en cours d’édition : [{id, q}]
$("#a_cat").innerHTML=Object.entries(CAT1).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
$("#a_unite").innerHTML=UNITES.map(u=>`<option>${u}</option>`).join("");
$("#a_f").innerHTML='<option value="">Toutes les catégories</option>'+Object.entries(CAT).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");

const comps=()=>S.articles.filter(a=>a.actif&&a.categorie!=="produit_fini"&&a.id!==editId);
function renderC(){$("#a_clines").innerHTML=C.map((x,i)=>`<div class="ln2"><select data-i="${i}" data-f="id"><option value="">Composant…</option>${comps().map(a=>`<option value="${esc(a.id)}"${a.id===x.id?" selected":""}>${esc(a.nom)} (${esc(a.unite)})</option>`).join("")}</select><input type="number" data-i="${i}" data-f="q" min="0" step="any" value="${esc(x.q)}" placeholder="Quantité"><button type="button" class="btn ghost sm" data-r="${i}" aria-label="Retirer">×</button></div>`).join("")}
function toggle(){const pf=$("#a_cat").value==="produit_fini";$$(".pf").forEach(e=>e.hidden=!pf);$("#a_compo").hidden=!pf;renderC()}
$("#a_cat").onchange=toggle;
$("#a_cadd").onclick=()=>{C.push({id:"",q:""});renderC()};
$("#a_clines").oninput=e=>{const{i,f}=e.target.dataset;if(i==null)return;C[i][f]=e.target.value};
$("#a_clines").onclick=e=>{const r=e.target.dataset.r;if(r!=null){C.splice(r,1);renderC()}};

function reset(){editId=null;$("#af").reset();C=[];$("#a_titre").textContent="Nouvel article";$("#a_ok").textContent="Ajouter";$("#a_cancel").hidden=true;$("#a_init_w").hidden=false;toggle()}
$("#a_cancel").onclick=reset;
function startEdit(id){const a=S.articles.find(x=>x.id===id);if(!a)return;
  editId=id;$("#a_nom").value=a.nom;$("#a_cat").value=a.categorie;$("#a_unite").value=a.unite;$("#a_seuil").value=a.seuil;$("#a_prix").value=a.prix_vente??"";$("#a_dev").value=a.devise;$("#a_poids").value=a.poids_g??"";
  C=S.compos.filter(c=>c.produit_id===id).map(c=>({id:c.composant_id,q:c.quantite}));
  $("#a_titre").textContent="Modifier : "+a.nom;$("#a_ok").textContent="Enregistrer";$("#a_cancel").hidden=false;$("#a_init_w").hidden=true;toggle();window.scrollTo({top:0,behavior:"smooth"})}

async function saveCompo(pid,isProduit){
  const d=await sb.from("st_composants").delete().eq("produit_id",pid);if(d.error)throw d.error;
  if(!isProduit)return;
  const rows=[],seen=new Set();for(const x of C){if(x.id&&+x.q>0&&!seen.has(x.id)){seen.add(x.id);rows.push({produit_id:pid,composant_id:x.id,quantite:+x.q})}}
  if(rows.length){const i=await sb.from("st_composants").insert(rows);if(i.error)throw i.error}
}
$("#af").onsubmit=async e=>{e.preventDefault();
  const pf=$("#a_cat").value==="produit_fini",row={nom:$("#a_nom").value.trim(),categorie:$("#a_cat").value,unite:$("#a_unite").value,seuil:+$("#a_seuil").value||0,prix_vente:pf&&$("#a_prix").value!==""?+$("#a_prix").value:null,devise:$("#a_dev").value,poids_g:pf&&$("#a_poids").value!==""?+$("#a_poids").value:null};
  try{
    let id=editId;
    if(editId){const{error}=await sb.from("st_articles").update(row).eq("id",editId);if(error)throw error}
    else{const{data,error}=await sb.from("st_articles").insert(row).select("id").single();if(error)throw error;id=data.id;
      const init=+$("#a_init").value;if(init>0){const m=await sb.from("st_mouvements").insert({article_id:id,type:"entree",motif:"inventaire",quantite:init,note:"Stock de départ"});if(m.error)throw m.error}}
    await saveCompo(id,pf);reset();await refresh();
  }catch(er){if(er&&er.code==="23505")alert("Un article actif porte déjà ce nom.");else err(er)}};

function render(){
  const f=$("#a_f").value,arch=$("#a_arch").checked;
  const l=S.articles.filter(a=>(arch||a.actif)&&(!f||a.categorie===f));
  $("#a_tb").innerHTML=l.length?l.map(a=>`<tr${a.actif?"":' style="opacity:.55"'}><td>${esc(a.nom)}${a.actif?"":" <small>(archivé)</small>"}</td><td>${esc(CAT1[a.categorie])}</td><td>${esc(a.unite)}</td><td class="n">${a.seuil?esc(nf(a.seuil)):"—"}</td><td class="n">${a.prix_vente!=null?esc(fmt(a.prix_vente,a.devise)):"—"}</td><td class="n"><button class="btn ghost sm" data-edit="${esc(a.id)}">Modifier</button> <button class="btn ghost sm" data-arch="${esc(a.id)}">${a.actif?"Archiver":"Restaurer"}</button> <button class="btn ghost sm" data-del="${esc(a.id)}" aria-label="Supprimer">×</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty">Aucun article.</td></tr>';
  renderC();
}
$("#a_f").onchange=$("#a_arch").onchange=render;
$("#a_tb").onclick=async e=>{const d=e.target.dataset;
  if(d.edit)return startEdit(d.edit);
  if(d.arch){const a=S.articles.find(x=>x.id===d.arch);const{error}=await sb.from("st_articles").update({actif:!a.actif}).eq("id",d.arch);if(error)return err(error.code==="23505"?{message:"Un article actif porte déjà ce nom."}:error);await refresh();return}
  if(d.del){const a=S.articles.find(x=>x.id===d.del);if(!confirm("Supprimer définitivement « "+a.nom+" » ?"))return;
    const{error}=await sb.from("st_articles").delete().eq("id",d.del);
    if(error){if(error.code==="23503")alert("Cet article a un historique de mouvements : il ne peut pas être supprimé. Utilisez « Archiver ».");else err(error);return}
    await refresh()}};

// Export de la liste des articles
const visibles=()=>S.articles.filter(a=>($("#a_arch").checked||a.actif)&&(!$("#a_f").value||a.categorie===$("#a_f").value));
$("#a_csv").onclick=()=>{const l=visibles();if(!l.length){alert("Rien à exporter.");return}
  const rows=[["Article","Catégorie","Unité","Seuil d’alerte","Prix de vente","Devise","Actif"],...l.map(a=>[a.nom,CAT1[a.categorie],a.unite,a.seuil,a.prix_vente??"",a.devise,a.actif?"oui":"non"])];
  shareOut({files:[csvFile("articles-epice-imperiale.csv",rows)],title:"Articles"})};
$("#a_wa").onclick=()=>{const l=visibles();if(!l.length){alert("Rien à envoyer.");return}
  waText("*Articles "+S.set.nom+"* — "+fd(today())+"\n\n"+l.map(a=>"• "+a.nom+" ("+CAT1[a.categorie].toLowerCase()+", "+a.unite+")"+(a.prix_vente!=null?" — "+fmt(a.prix_vente,a.devise):"")).join("\n"))};
bus.addEventListener("data",render);
toggle();
export {render};