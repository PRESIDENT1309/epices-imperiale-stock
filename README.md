# Épice Impériale — Stock

Logiciel de gestion de stock d’Épice Impériale (ETS Imperial Group), **séparé de la comptabilité mais dans la même base de données Supabase** :
même connexion, mêmes comptes, mêmes droits. Les ventes (reçus et factures) de la comptabilité retirent tout seules les produits finis du stock.

## Les 6 onglets
- **Stock** : état de tous les articles, alertes (rupture / stock bas), impression, partage.
- **Articles** : créer les matières premières, produits finis, emballages, étiquettes. Pour un produit fini, définir sa **composition** (ce qu’il faut pour en fabriquer 1).
- **Mouvements** : entrées (achats…) et sorties (pertes…), historique.
- **Production** : « j’ai fabriqué 50 sachets » → les matières, emballages et étiquettes sont retirés, les produits finis ajoutés.
- **Inventaire** : saisir ce qu’on a compté, l’écart corrige le stock. Fiche de comptage imprimable.
- **Réglages** : en-tête des impressions, sauvegarde.

## Où modifier quoi
Chaque page a son dossier dans `js/pages/` avec son `.html` (ce qu’on voit), son `.css` (l’apparence) et son `.js` (le comportement).
`js/core/` contient ce qui est partagé (connexion, chargement des données, impression, partage). `css/base.css` : couleurs et boutons communs.

## Démarrer
1. Copier la clé publique Supabase dans `config.js` (la même que celle de la comptabilité).
2. Tester en local avec l’extension « Live Server » de VS Code (clic droit sur `index.html`).
3. Déployer : nouveau dépôt GitHub + nouveau projet Vercel (voir la comptabilité), puis `git add .`, `git commit -m "..."`, `git push`.

## Données (tables `st_*`)
`st_articles`, `st_composants` (composition), `st_mouvements` (entrées/sorties), `st_productions`, vue `st_stock` (stock calculé = entrées − sorties).
Le stock n’est jamais saisi directement : il se déduit des mouvements, ce qui garde un historique complet.

## Droits
`admin` : crée, modifie, archive, supprime. Tout utilisateur activé peut voir le stock et enregistrer des mouvements, des productions et des inventaires.

## Activer un compte pour le stock
La personne crée son compte sur le site du stock. Tant qu’elle n’a pas de profil avec le module `stock`, elle n’a accès à rien. Dans Supabase > SQL Editor :
```sql
insert into public.ei_profils (id, nom, role, modules)
select id, 'Nom Prénom', 'admin', '{stock}' from auth.users where email = 'adresse@exemple.com';
-- si la personne a déjà un profil (accès comptabilité), ajouter le stock :
update public.ei_profils set modules = array_append(modules, 'stock') where id = (select id from auth.users where email = 'adresse@exemple.com');
```
`{stock}` = stock seulement (aucun accès à la comptabilité). `{compta,stock}` = les deux.
