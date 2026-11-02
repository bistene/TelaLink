import React,{useEffect,useState} from "react";
import{createClient}from "@supabase/supabase-js";
import "./auth.css";
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const authClient=url&&key?createClient(url,key):null;
export default function AuthGate({children}){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[nickname,setNickname]=useState("");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!authClient){setLoading(false);return}authClient.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}).catch(()=>setLoading(false));const {data:{subscription}}=authClient.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe()},[]);
 async function submit(e){e.preventDefault();if(!authClient)return;setBusy(true);setMessage("");try{
 if(mode==="register"){if(nickname.trim().length<2)throw new Error("Escolha um nome com pelo menos 2 caracteres.");const {data,error}=await authClient.auth.signUp({email,password,options:{data:{nickname:nickname.trim()},emailRedirectTo:location.origin}});if(error)throw error;setMessage(data.session?"Conta criada!":"Conta criada. Verifique seu e-mail para confirmar o cadastro.");}
 else if(mode==="reset"){const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw error;setMessage("Se o endereço estiver cadastrado, você receberá um e-mail de recuperação.");}
 else{const {error}=await authClient.auth.signInWithPassword({email,password});if(error)throw error;}
 }catch(err){setMessage(err.message||"Não foi possível concluir a operação.")}finally{setBusy(false)}}
 if(loading)return <div className="authPage"><div className="authCard">Carregando sessão...</div></div>;
 if(!authClient)return <div className="authPage"><div className="authCard"><div className="authLogo">T</div><h1>Configuração necessária</h1><p>O TelaLink precisa de um projeto Supabase para ativar o login.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> na Vercel.</p></div></div>;
 if(session)return <>{React.cloneElement(children,{account:session.user,onLogout:()=>authClient.auth.signOut()})}</>;
 return <div className="authPage"><div className="authCard"><div className="authLogo">T</div><h1>{mode==="register"?"Crie sua conta":mode==="reset"?"Recuperar senha":"Boas-vindas de volta!"}</h1><p>{mode==="register"?"Entre no TelaLink e converse com seus amigos.":mode==="reset"?"Enviaremos um link para seu e-mail.":"Entre na sua conta para acessar suas salas."}</p><form onSubmit={submit}>{mode==="register"&&<label>NOME DE USUÁRIO<input value={nickname} onChange={e=>setNickname(e.target.value)} minLength={2} maxLength={32} required placeholder="Como quer ser chamado?"/></label>}<label>E-MAIL<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="voce@exemplo.com"/></label>{mode!=="reset"&&<label>SENHA<input type="password" autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required placeholder="Sua senha"/></label>}{message&&<div className="authMessage" role="status">{message}</div>}<button className="primary" disabled={busy}>{busy?"Aguarde...":mode==="register"?"Criar conta":mode==="reset"?"Enviar recuperação":"Entrar"}</button></form><div className="authLinks">{mode==="login"?<><button onClick={()=>{setMode("register");setMessage("")}}>Criar uma conta</button><button onClick={()=>{setMode("reset");setMessage("")}}>Esqueci minha senha</button></>:<button onClick={()=>{setMode("login");setMessage("")}}>Voltar para login</button>}</div></div></div>
}
