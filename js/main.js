// Point d’entrée : charge le HTML de chaque page, puis son code, puis ouvre la session
window.__started=true;
const bar=m=>window.__bar?window.__bar(m):console.error(m);
const PAGES=[["login-host","login"],["st","stock"],["art","articles"],["mvt","mouvements"],["prod","production"],["inv","inventaire"],["set","reglages"]];
async function load(path){try{return await import(path)}catch(e){bar("Fichier non chargé : "+path.replace("./","js/")+" — "+e.message);throw e}}
(async()=>{
  for(const[id,page]of PAGES){
    const url=`js/pages/${page}/${page}.html`;
    try{
      const r=await fetch(url);
      if(!r.ok){bar("Page introuvable : "+url+" (code "+r.status+")");continue}
      document.getElementById(id).innerHTML=await r.text();
    }catch(e){bar("Page non chargée : "+url+" — "+e.message)}
  }
  await load("./core/router.js");
  for(const p of ["mouvements","production","inventaire","reglages","articles","stock"])await load(`./pages/${p}/${p}.js`);
  const{boot}=await load("./pages/login/login.js");
  await boot();
})().catch(e=>bar("Erreur au démarrage : "+(e&&e.message||e)));
