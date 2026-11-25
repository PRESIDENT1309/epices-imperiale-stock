// Chargement de toutes les données du stock depuis Supabase (par paquets de 1000 lignes)
import {sb} from "./supabase.js";
import {S} from "./state.js";
import {err} from "./utils.js";
import {bus} from "./bus.js";
export async function fetchAll(make){let out=[],from=0;for(;;){const{data,error}=await make().range(from,from+999);if(error)return{error};out=out.concat(data);if(data.length<1000)break;from+=1000}return{data:out}}
export async function loadAll(){
  const [a,c,m,p]=await Promise.all([
    fetchAll(()=>sb.from("st_stock").select("*").order("nom").order("id")),
    fetchAll(()=>sb.from("st_composants").select("*").order("id")),
    fetchAll(()=>sb.from("st_mouvements").select("*").order("date",{ascending:false}).order("created_at",{ascending:false}).order("id")),
    fetchAll(()=>sb.from("st_productions").select("*").order("date",{ascending:false}).order("id"))]);
  const e=a.error||c.error||m.error||p.error;if(e){err(e);return}
  S.articles=a.data.map(x=>({...x,seuil:+x.seuil,stock:+x.stock,prix_vente:x.prix_vente==null?null:+x.prix_vente,poids_g:x.poids_g==null?null:+x.poids_g}));
  S.compos=c.data.map(x=>({...x,quantite:+x.quantite}));
  S.mvts=m.data.map(x=>({...x,quantite:+x.quantite}));
  const nn=v=>v==null?null:+v;
  S.prods=p.data.map(x=>({...x,quantite:+x.quantite,quantite_prevue:nn(x.quantite_prevue),poids_unite_g:nn(x.poids_unite_g),matiere_g:nn(x.matiere_g)}));
}
// Recharge tout puis prévient les pages pour qu’elles se réaffichent
export async function refresh(){await loadAll();bus.dispatchEvent(new Event("data"))}
