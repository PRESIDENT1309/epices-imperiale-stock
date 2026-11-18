// Page « Factures et reçus » : formulaire et boutons
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {sums} from "../../core/calc.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";
import {D} from "./docstate.js";
import {docTot,renderSheet} from "./sheet.js";

export function renderLines(){$("#lines").innerHTML=D.L.map((x,i)=>`<div class="ln"><input class="${x.a?"lie":""}" data-i="${i}" data-f="d" list="prod-list" autocomplete="off" placeholder="Désignation (choisissez un produit du stock ou écrivez)" value="${esc(x.d)}"><input data-i="${i}" data-f="q" type="number" min="0" step="any" value="${x.q}" aria-label="Quantité"><input data-i="${i}" data-f="p" type="number" min="0" step="any" value="${x.p}" aria-label="Prix unitaire"><button class="btn ghost sm" data-r="${i}" aria-label="Retirer">×</button></div>`).join("")}
const touch=()=>{D.num=null;D.doc=null;renderSheet()};
$("#lines").oninput=e=>{const{i,f}=e.target.dataset;if(i==null)return;D.L[i][f]=f==="d"?e.target.value:+e.target.value;
  if(f==="d"){ // produit du stock reconnu par son nom : on garde le lien et on propose son prix
    const pr=S.produits.find(x=>x.nom.toLowerCase()===e.target.value.trim().toLowerCase());
    D.L[i].a=pr?pr.id:null;e.target.classList.toggle("lie",!!pr);
    if(pr&&!D.L[i].p&&pr.devise===$("#d_cur").value&&pr.prix){D.L[i].p=pr.prix;const pi=$('#lines input[data-i="'+i+'"][data-f="p"]');if(pi)pi.value=pr.prix}
  }
  touch()};
// Suggestions : produits finis du stock, avec la quantité disponible
function fillProduits(){$("#lie-note").hidden=!S.produits.length;$("#prod-list").innerHTML=S.produits.map(p=>`<option value="${esc(p.nom)}">${esc("En stock : "+new Intl.NumberFormat("fr-FR",{maximumFractionDigits:3}).format(p.stock)+" "+p.unite)}</option>`).join("")}
bus.addEventListener("data",fillProduits);fillProduits();
$("#lines").onclick=e=>{const r=e.target.dataset.r;if(r!=null){D.L.splice(r,1);if(!D.L.length)D.L=[{d:"",q:1,p:0}];renderLines();touch()}};
$("#addl").onclick=()=>{D.L.push({d:"",q:1,p:0});renderLines()};
["d_type","d_date","d_cli","d_adr","d_cur","d_tva","d_tel","d_mode","d_stat","d_vend","d_due"].forEach(i=>$("#"+i).oninput=touch);
$("#d_date").value=today();

// Enregistrement : numéro automatique, puis entrée ou dette selon le type
async function saveDoc(){
  if(D.num)return D.num;
  const t=$("#d_type").value,T=docTot(),v=id=>$("#"+id).value.trim();
  if(!T.ttc){alert("Le total est à zéro.");return null}
  const ty={Facture:"facture",Reçu:"recu",Devis:"devis"}[t];
  // Avertir si on vend plus que le stock disponible (le document reste possible)
  const manque=ty==="devis"?[]:D.L.filter(x=>x.a&&x.q>0).map(x=>({x,p:S.produits.find(p=>p.id===x.a)})).filter(o=>o.p&&o.x.q>o.p.stock);
  if(manque.length&&!confirm("Stock insuffisant pour : "+manque.map(o=>o.p.nom+" (reste "+o.p.stock+")").join(", ")+". Enregistrer quand même ?"))return null;
  const{data:num,error}=await sb.rpc("ei_prochain_numero",{p_type:ty});if(error){err(error);return null}
  const{data:doc,error:e2}=await sb.from("ei_documents").insert({type:ty,numero:num,date:$("#d_date").value||today(),client_nom:v("d_cli")||null,client_telephone:v("d_tel")||null,client_adresse:v("d_adr")||null,devise:T.c,tva_pct:+$("#d_tva").value||0,mode_paiement:v("d_mode"),statut:$("#d_stat").value==="Payée"?"payee":"non_payee",vendeur:v("d_vend")||null,total_ttc:T.ttc}).select("id").single();
  if(e2){err(e2);return null}
  const lg=D.L.filter(x=>x.d||x.p).map((x,i)=>({document_id:doc.id,position:i,designation:x.d||"—",quantite:x.q,prix_unitaire:x.p,article_id:x.a||null}));
  if(lg.length){const{error:e3}=await sb.from("ei_document_lignes").insert(lg);if(e3){err(e3);return null}}
  D.doc=doc.id;
  // Vente de produits du stock : le stock baisse tout seul (un devis ne touche pas au stock)
  const ventes=ty==="devis"?[]:D.L.filter(x=>x.a&&x.q>0).map(x=>({article_id:x.a,quantite:x.q}));
  if(ventes.length){const{error:e6}=await sb.rpc("st_enregistrer_vente",{p_document:doc.id,p_lignes:ventes});if(e6)alert("Le document est enregistré, mais le stock n’a pas pu être mis à jour : "+e6.message)}
  if(ty==="recu"||(ty==="facture"&&$("#d_stat").value==="Payée")){const{error:e4}=await sb.from("ei_transactions").insert({date:$("#d_date").value||today(),type:"entree",categorie:"Vente",libelle:(ty==="recu"?"Reçu ":"Facture ")+num,tiers:v("d_cli")||null,montant:T.ttc,devise:T.c,document_id:doc.id});if(e4)alert("Le document est enregistré, mais son entrée n’a pas pu être créée : "+e4.message)}
  else if(ty==="facture"){const{error:e5}=await sb.from("ei_dettes").insert({sens:"creance",tiers:v("d_cli")||"Client",motif:"Facture "+num,montant:T.ttc,devise:T.c,autorisee_par:session.me?session.me.nom:null,date_remboursement:$("#d_due").value||null,document_id:doc.id});if(e5)alert("La facture est enregistrée, mais sa dette n’a pas pu être créée : "+e5.message)}
  D.num=num;renderSheet();await refresh();return num;
}

// Boutons
$("#print").onclick=async()=>{if(await saveDoc())window.print()};
$("#save").onclick=async()=>{const n=await saveDoc();if(n)alert("Document "+n+" enregistré.")};
// Envoi de l’IMAGE du document (WhatsApp, Facebook, e-mail… via le menu de partage du téléphone)
async function buildImage(num){
  if(typeof html2canvas==="undefined")throw new Error("L’envoi en image demande une connexion internet.");
  const cv=await html2canvas($("#sheet"),{scale:3,backgroundColor:"#ffffff",useCORS:true});
  const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
  D.img=new File([blob],num+".png",{type:"image/png"});D.imgNum=num;
}
async function shareImage(){
  const f=D.img;
  if(navigator.canShare&&navigator.canShare({files:[f]})){
    try{await navigator.share({files:[f],title:f.name.replace(".png","")})}
    catch(e){if(!e||e.name!=="AbortError")throw e}
    return;
  }
  dl(f,f.name,f.type);
  alert("Image téléchargée ("+f.name+"). Envoyez-la ensuite dans WhatsApp, Facebook ou par e-mail.");
}
$("#wa").onclick=async()=>{
  try{
    // image déjà prête : on ouvre le partage immédiatement (obligatoire sur iPhone)
    if(D.img&&D.num&&D.imgNum===D.num){await shareImage();return}
    const n=await saveDoc();if(!n)return;
    await buildImage(n);
    try{await shareImage()}
    catch(e){
      if(e&&e.name==="NotAllowedError")alert("L’image est prête. Appuyez encore une fois sur « Envoyer l’image » pour choisir WhatsApp.");
      else throw e;
    }
  }catch(e){err(e)}
};
renderLines();
