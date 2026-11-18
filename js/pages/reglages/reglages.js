// Page « Réglages » : en-tête des impressions, sauvegarde
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

$$("#sf input").forEach(i=>{i.value=S.set[i.dataset.k]||"";i.oninput=()=>{S.set[i.dataset.k]=i.value;saveSet()}});
async function backupFile(){
  const T=["st_articles","st_composants","st_productions","st_mouvements"],out={date:new Date().toISOString()};
  for(const t of T){const r=await fetchAll(()=>sb.from(t).select("*").order("id"));if(r.error){err(r.error);return null}out[t]=r.data}
  return new File([JSON.stringify(out)],"sauvegarde-stock-epice-imperiale-"+today()+".json",{type:"application/json"})}
$("#bk").onclick=async()=>{const f=await backupFile();if(f)dl(f,f.name,f.type)};
$("#bks").onclick=async()=>{const f=await backupFile();if(f)shareOut({files:[f],title:f.name,text:"Sauvegarde du stock Épice Impériale"})};
