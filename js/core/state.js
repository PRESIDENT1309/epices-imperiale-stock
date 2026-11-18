// État partagé : données chargées, réglages de l’en-tête des impressions, utilisateur connecté
const SK="ei-stock-reglages-v1";
export const S={articles:[],compos:[],mvts:[],prods:[],set:{nom:"Épice Impériale",mere:"ETS Imperial Group",adr:"Kinshasa, RDC",tel:"0971347427",mail:"Kadima857@gmail.com"}};
try{const r=localStorage.getItem(SK);if(r)S.set={...S.set,...JSON.parse(r)}}catch(e){}
export const saveSet=()=>{try{localStorage.setItem(SK,JSON.stringify(S.set))}catch(e){}};
export const session={me:null};
