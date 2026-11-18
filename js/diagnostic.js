/* Affiche une erreur lisible à l’écran si l’application ne démarre pas */
(function(){function bar(m){var r=document.body||document.documentElement,b=document.getElementById("erreur-demarrage");if(!b){b=document.createElement("div");b.id="erreur-demarrage";b.setAttribute("style","margin:12px;padding:12px;border:2px solid #a8321f;background:#fff;color:#a8321f;font:14px/1.4 system-ui;border-radius:8px;white-space:pre-wrap");r.insertBefore(b,r.firstChild)}b.textContent+=m+"\n"}
window.__bar=bar;
window.addEventListener("error",function(e){var t=e.target,u=t&&(t.src||t.href);if(u){if(u.indexOf(location.origin)===0)bar("Fichier introuvable : "+u.replace(location.origin,""))}else bar("Erreur : "+e.message+(e.filename?" ("+e.filename.split("/").slice(-2).join("/")+":"+e.lineno+")":""))},true);
window.addEventListener("unhandledrejection",function(e){bar("Erreur : "+(e.reason&&e.reason.message||e.reason))});
setTimeout(function(){if(!window.__started)bar("Le programme ne démarre pas : js/main.js n’a pas été chargé ou contient une erreur.")},5000);
})();
/* Si la politique de sécurité bloque quelque chose, on le note dans la console (touche F12) */
document.addEventListener("securitypolicyviolation",function(e){console.warn("Sécurité : bloqué ou signalé ->",e.violatedDirective,e.blockedURI)});
