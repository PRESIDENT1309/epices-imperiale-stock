// Écran de connexion et ouverture de session
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {sb,SB_KEY} from "../../core/supabase.js";
import {session} from "../../core/state.js";
import {refresh} from "../../core/data.js";

let recovery=false;   // vrai quand l’utilisateur arrive depuis le lien « mot de passe oublié »
const showRecovery=()=>{recovery=true;$("#lf").hidden=true;$("#rf").hidden=false;$("#login").classList.add("on")};
sb.auth.onAuthStateChange(ev=>{if(ev==="PASSWORD_RECOVERY")showRecovery()});
const showLogin=m=>{$("#login").classList.add("on");if(m)$("#lmsg").textContent=m};
export async function boot(){
  if(SB_KEY.startsWith("COLLER")){showLogin("Clé publique Supabase manquante dans config.js.");return}
  const{data:{session:s}}=await sb.auth.getSession();if(recovery)return;if(!s){showLogin();return}
  const{data:p}=await sb.from("ei_profils").select("*").eq("id",s.user.id).maybeSingle();
  if(!p||!p.actif||!(p.modules||[]).includes("stock")){await sb.auth.signOut();showLogin("Compte non activé pour le stock. Demandez à l’administrateur de l’activer.");return}
  if(recovery)return;
  session.me=p;$("#who").textContent=p.nom+" · "+(p.role==="admin"?"admin":"employé");$("#login").classList.remove("on");
  await refresh();
}
$("#lf").onsubmit=async e=>{e.preventDefault();$("#lmsg").textContent="";const{error}=await sb.auth.signInWithPassword({email:$("#l_mail").value.trim().toLowerCase(),password:$("#l_pw").value});
  if(error){$("#lmsg").textContent=/invalid login/i.test(error.message)?"E-mail ou mot de passe incorrect. Cochez « Afficher le mot de passe » pour vérifier, ou utilisez « Mot de passe oublié ».":"Connexion impossible : "+error.message;return}boot()};
$("#su").onclick=async()=>{const em=$("#l_mail").value.trim().toLowerCase(),pw=$("#l_pw").value;if(!em||pw.length<8){$("#lmsg").textContent="E-mail et mot de passe (8 caractères minimum) requis.";return}
  const{error}=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});$("#lmsg").textContent=error?error.message:"Compte créé. Confirmez votre e-mail si demandé, puis prévenez l’administrateur pour l’activation."};
$("#out").onclick=async()=>{await sb.auth.signOut();location.reload()};

// Afficher / masquer le mot de passe
$("#l_show").onchange=e=>{$("#l_pw").type=e.target.checked?"text":"password"};
$("#r_show").onchange=e=>{$("#r_pw").type=e.target.checked?"text":"password"};

// Mot de passe oublié : envoie un lien par e-mail (l’adresse du site doit être dans Supabase > Authentication > URL Configuration)
$("#forgot").onclick=async()=>{const em=$("#l_mail").value.trim().toLowerCase();
  if(!em){$("#lmsg").textContent="Écrivez d’abord votre e-mail dans le champ ci-dessus.";return}
  const{error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  $("#lmsg").textContent=error?"Impossible : "+error.message:"Un e-mail vient d’être envoyé. Ouvrez le lien qu’il contient pour choisir un nouveau mot de passe."};
$("#rf").onsubmit=async e=>{e.preventDefault();
  const{error}=await sb.auth.updateUser({password:$("#r_pw").value});
  if(error){$("#rmsg").textContent="Impossible : "+error.message;return}
  recovery=false;history.replaceState(null,"",location.pathname);$("#rf").hidden=true;$("#lf").hidden=false;$("#lmsg").textContent="";$("#r_pw").value="";
  alert("Mot de passe enregistré.");await boot()};
