// Libellés et calculs du stock
export const CAT={matiere:"Matières premières",produit_fini:"Produits finis",emballage:"Emballages",etiquette:"Étiquettes",autre:"Autres"};
export const CAT1={matiere:"Matière première",produit_fini:"Produit fini",emballage:"Emballage",etiquette:"Étiquette",autre:"Autre"};
export const UNITES=["kg","g","L","pièce","sachet","pot","boîte","carton","rouleau","feuille"];
export const nf=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:3}).format(n);
export const qte=(n,u)=>nf(n)+" "+u;
// État d’un article : rupture (0 ou moins), bas (sous le seuil d’alerte) ou ok
export const etat=a=>a.stock<=0?"rupture":(a.seuil>0&&a.stock<=a.seuil?"bas":"ok");
