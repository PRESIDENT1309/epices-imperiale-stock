// Page « Stock » : vue d’ensemble, alertes, impression
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut,csvFile,waText} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";
import {goto} from "../../core/router.js";

const LAB={ok:"OK",bas:"Stock bas",rupture:"Rupture"};
$("#s_cat").innerHTML='<option value="">Toutes les catégories</option>'+Object.entries(CAT).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");

function list(){const q=$("#s_q").value.trim().toLowerCase(),c=$("#s_cat").value,al=$("#s_alert").checked;
  return S.articles.filter(a=>a.actif&&(!c||a.categorie===c)&&(!q||a.nom.toLowerCase().includes(q))&&(!al||etat(a)!=="ok"))}

export function render(){
  const act=S.articles.filter(a=>a.actif),alerts=act.filter(a=>etat(a)!=="ok");
  const fa=$("#s_alert").checked,fc=$("#s_cat").value;
  const noms=alerts.slice(0,6).map(a=>`<span class="${etat(a)==="rupture"?"out":""}">${esc(a.nom)}</span>`).join(", ")+(alerts.length>6?` +${alerts.length-6}`:"");
  $("#st_cards").innerHTML=`<div class="card cardbtn${fa&&!fc?" sel":""}" role="button" tabindex="0" data-act="alerts"><h2>À réapprovisionner</h2><div class="big ${alerts.length?"out":"in"}">${alerts.length}</div>${alerts.length?`<div class="names">${noms}</div><div class="row"><span>Touchez pour voir la liste</span><b>${act.length} suivis</b></div>`:`<div class="row"><span>Tout est en stock</span><b>${act.length} suivis</b></div>`}</div>`+
    Object.entries(CAT).map(([k,v])=>{const l=act.filter(a=>a.categorie===k);if(!l.length)return"";const n=l.filter(a=>etat(a)!=="ok").length;
      return `<div class="card cardbtn${fc===k&&!fa?" sel":""}" role="button" tabindex="0" data-act="cat" data-cat="${k}"><h2>${v}</h2><div class="big">${l.length}</div><div class="row"><span>à surveiller</span>${n?`<span class="lnk" data-act="catalert" data-cat="${k}">${n} — voir</span>`:`<b class="in">0</b>`}</div></div>`}).join("");
  // Rappel du filtre en cours, avec un bouton pour tout réafficher
  const f=[],q=$("#s_q").value.trim();if(fc)f.push(CAT[fc]);if(fa)f.push("À surveiller seulement");if(q)f.push("« "+q+" »");
  $("#s_filtre").hidden=!f.length;$("#s_filtre").innerHTML=f.length?`Affichage : <b>${esc(f.join(" · "))}</b> <button class="btn ghost sm" id="s_reset">Tout afficher</button>`:"";
  const l=list();
  $("#s_tb").innerHTML=l.length?l.map(a=>{const e=etat(a);
    return `<tr><td>${esc(a.nom)}</td><td>${esc(CAT[a.categorie])}</td><td class="n"><b>${esc(qte(a.stock,a.unite))}</b></td><td class="n">${a.seuil?esc(qte(a.seuil,a.unite)):"—"}</td><td><span class="badge b-${e}">${LAB[e]}</span></td><td class="n"><button class="btn gold sm" data-in="${esc(a.id)}">+ Entrée</button> <button class="btn ghost sm" data-out="${esc(a.id)}">− Sortie</button></td></tr>`}).join("")
    :'<tr><td colspan="6" class="empty">Aucun article. Ajoutez-en dans l’onglet Articles.</td></tr>';
}
["s_q","s_cat","s_alert"].forEach(i=>$("#"+i).oninput=render);

// Toucher une carte filtre la liste : « À réapprovisionner » = les articles à surveiller ; une catégorie = ses articles ; « n — voir » = ses articles à surveiller
$("#st_cards").onclick=e=>{const t=e.target.closest("[data-act]");if(!t)return;const act=t.dataset.act,cat=t.dataset.cat||"";
  if(act==="alerts"){$("#s_cat").value="";$("#s_alert").checked=true}
  else if(act==="cat"){$("#s_cat").value=cat;$("#s_alert").checked=false}
  else if(act==="catalert"){$("#s_cat").value=cat;$("#s_alert").checked=true}
  render();$("#s_tb").closest(".card").scrollIntoView({behavior:"smooth",block:"start"})};
$("#st_cards").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){const t=e.target.closest("[data-act]");if(t){e.preventDefault();t.click()}}};
$("#s_filtre").onclick=e=>{if(e.target.id==="s_reset"){$("#s_cat").value="";$("#s_alert").checked=false;$("#s_q").value="";render()}};

// Boutons « Entrée » / « Sortie » : ouvrent le formulaire de mouvement avec l’article choisi
$("#s_tb").onclick=e=>{const i=e.target.dataset.in,o=e.target.dataset.out,id=i||o;if(!id)return;
  $("#m_type").value=i?"entree":"sortie";$("#m_type").dispatchEvent(new Event("change"));
  $("#m_art").value=id;$("#m_art").dispatchEvent(new Event("change"));goto("mvt");$("#m_qte").focus()};

$("#s_print").onclick=()=>{const l=list();if(!l.length){alert("Rien à imprimer.");return}
  const rows=l.map(a=>`<tr><td>${esc(a.nom)}</td><td>${esc(CAT[a.categorie])}</td><td class="n">${esc(qte(a.stock,a.unite))}</td><td class="n">${a.seuil?esc(qte(a.seuil,a.unite)):"—"}</td><td>${LAB[etat(a)]}</td></tr>`).join("");
  printReport("État du stock",$("#s_cat").value?CAT[$("#s_cat").value]:"Tous les articles",`<table><thead><tr><th>Article</th><th>Catégorie</th><th class="n">En stock</th><th class="n">Seuil</th><th>État</th></tr></thead><tbody>${rows}</tbody></table>`)};
$("#s_csv").onclick=()=>{const l=list();if(!l.length){alert("Rien à exporter.");return}
  const rows=[["Article","Catégorie","Stock","Unité","Seuil","État"],...l.map(a=>[a.nom,CAT[a.categorie],a.stock,a.unite,a.seuil,LAB[etat(a)]])];
  shareOut({files:[csvFile("stock-epice-imperiale.csv",rows)],title:"Stock Épice Impériale"})};
$("#s_wa").onclick=()=>{const l=list();if(!l.length){alert("Rien à envoyer.");return}
  const al=l.filter(a=>etat(a)!=="ok"),ok=l.filter(a=>etat(a)==="ok");
  const ligne=a=>"• "+a.nom+" : "+qte(a.stock,a.unite)+(a.seuil&&etat(a)!=="ok"?" (seuil "+nf(a.seuil)+")":"");
  waText("*Stock "+S.set.nom+"* — "+fd(today())+(al.length?"\n\n⚠️ À réapprovisionner ("+al.length+") :\n"+al.map(a=>ligne(a)+(etat(a)==="rupture"?" — RUPTURE":"")).join("\n"):"")+(ok.length?"\n\nEn stock :\n"+ok.map(ligne).join("\n"):""))};
bus.addEventListener("data",render);
