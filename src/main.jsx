import React,{useEffect,useRef,useState} from "react";
import{createRoot}from"react-dom/client";
import Peer from"peerjs";
import "./style.css";
function App(){
 const [room,setRoom]=useState(()=>new URLSearchParams(location.search).get("room")||"");
 const [host,setHost]=useState(()=>new URLSearchParams(location.search).get("host")==="1");
 const [status,setStatus]=useState("Pronto para começar");
 const [connected,setConnected]=useState(false);
 const [cam,setCam]=useState(true),[mic,setMic]=useState(true);
 const [quality,setQuality]=useState("1080"),[fps,setFps]=useState("60");
 const [shareAudio,setShareAudio]=useState(true);
 const [local,setLocal]=useState(null),[remote,setRemote]=useState(null),[screen,setScreen]=useState(null),[remoteScreen,setRemoteScreen]=useState(null);
 const peer=useRef(null),localRef=useRef(null),screenRef=useRef(null),calls=useRef([]),other=useRef("");
 const localVideo=useRef(null),remoteVideo=useRef(null),screenVideo=useRef(null),remoteScreenVideo=useRef(null);
 useEffect(()=>{if(localVideo.current)localVideo.current.srcObject=local},[local]);
 useEffect(()=>{if(remoteVideo.current)remoteVideo.current.srcObject=remote},[remote]);
 useEffect(()=>{if(screenVideo.current)screenVideo.current.srcObject=screen},[screen]);
 useEffect(()=>{if(remoteScreenVideo.current)remoteScreenVideo.current.srcObject=remoteScreen},[remoteScreen]);
 const link=()=>location.origin+location.pathname+"?room="+encodeURIComponent(room);
 function newRoom(){const id=crypto.randomUUID();setRoom(id);setHost(true);history.replaceState(null,"",location.pathname+"?room="+id+"&host=1");setStatus("Sala criada. Clique em Entrar na chamada.");}
 async function copy(){try{await navigator.clipboard.writeText(link());setStatus("Link copiado!")}catch{setStatus("Copie o endereço: "+link())}}
 function attachCall(call,kind){calls.current.push(call);call.on("stream",s=>{if(kind==="screen")setRemoteScreen(s);else setRemote(s);setConnected(true);setStatus("Conectado")});call.on("close",()=>{if(kind==="screen")setRemoteScreen(null);else setRemote(null)});call.on("error",e=>setStatus("Erro de transmissão: "+e.message))}
 function dial(id,kind,stream){if(!peer.current||!stream)return;const call=peer.current.call(id,stream,{metadata:{kind}});if(call)attachCall(call,kind)}
 async function join(){
 if(!room){setStatus("Crie uma sala primeiro.");return}
 if(peer.current)return;
 try{
  setStatus("Solicitando câmera e microfone...");
  const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:true});
  localRef.current=stream;setLocal(stream);
  const id="telalink-"+room+(host?"-host":"-guest");
  const counterpart="telalink-"+room+(host?"-guest":"-host");
  other.current=counterpart;
  const p=new Peer(id);peer.current=p;
  p.on("open",()=>{setStatus(host?"Sala aberta. Aguardando convidado...":"Conectando à sala...");if(!host){dial(counterpart,"camera",stream);}});
  p.on("call",call=>{const kind=call.metadata?.kind==="screen"?"screen":"camera";call.answer(localRef.current||new MediaStream());attachCall(call,kind);if(host&&kind==="camera")setTimeout(()=>dial(counterpart,"camera",localRef.current),250)});
  p.on("error",e=>setStatus("Erro de conexão: "+e.message));
  p.on("disconnected",()=>setStatus("Sinalização desconectada. Verifique a rede."));
 }catch(e){setStatus("Não foi possível acessar câmera/microfone: "+e.message)}
 }
 function toggleMic(){const value=!mic;localRef.current?.getAudioTracks().forEach(t=>t.enabled=value);setMic(value)}
 function toggleCam(){const value=!cam;localRef.current?.getVideoTracks().forEach(t=>t.enabled=value);setCam(value)}
 async function share(){
 if(!peer.current){setStatus("Entre na chamada antes de compartilhar.");return}
 if(screenRef.current){stopShare();return}
 try{
  const stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:Number(quality)==1080?1920:1280},height:{ideal:Number(quality)},frameRate:{ideal:Number(fps),max:Number(fps)}},audio:shareAudio});
  screenRef.current=stream;setScreen(stream);
  stream.getVideoTracks()[0].onended=stopShare;
  dial(other.current,"screen",stream);
  setStatus("Compartilhando tela. A qualidade real depende do navegador e da rede.");
 }catch(e){setStatus(e.name==="NotAllowedError"?"Compartilhamento cancelado.":"Erro ao compartilhar: "+e.message)}
 }
 function stopShare(){screenRef.current?.getTracks().forEach(t=>t.stop());screenRef.current=null;setScreen(null);calls.current.filter(c=>c.metadata?.kind==="screen").forEach(c=>c.close());}
 function leave(){stopShare();calls.current.forEach(c=>c.close());calls.current=[];peer.current?.destroy();peer.current=null;localRef.current?.getTracks().forEach(t=>t.stop());localRef.current=null;setLocal(null);setRemote(null);setRemoteScreen(null);setConnected(false);setStatus("Chamada encerrada.")}
 useEffect(()=>()=>{peer.current?.destroy();localRef.current?.getTracks().forEach(t=>t.stop());screenRef.current?.getTracks().forEach(t=>t.stop())},[]);
 const big=remoteScreen||screen||remote||local;
 return <main><header><div className="brand"><span className="brandIcon">▣</span><div><strong>TelaLink</strong><small>CHAMADAS EM ALTA QUALIDADE</small></div></div><div className="live"><span className={connected?"dot on":"dot"}/>{connected?"Em chamada":peer.current?"Sala aberta":"Pronto"}</div></header>
 <section className="intro"><span className="eyebrow">VIDEOCHAMADA • COMPARTILHAMENTO DE TELA</span><h1>Conecte-se com <em>clareza.</em></h1><p>Crie uma sala, envie o link e compartilhe sua tela em até Full HD com 60 FPS.</p></section>
 {!room?<section className="start card"><div className="bigIcon">↗</div><h2>Sua próxima chamada começa aqui.</h2><p>Salas para duas pessoas. Sem conta, sem instalação.</p><button className="primary" onClick={newRoom}>Criar sala privada</button></section>:
 <><section className="toolbar card"><div className="roomLabel"><span className="eyebrow">LINK DA SUA SALA</span><div className="roomUrl">{link()}</div></div><button onClick={copy}>Copiar convite</button>{!peer.current?<button className="primary" onClick={join}>{host?"Iniciar chamada":"Entrar na chamada"}</button>:<button className="danger" onClick={leave}>Sair</button>}</section>
 <section className="videos"><div className="stage card"><div className="stageTop"><span>{remoteScreen?"Tela compartilhada":screen?"Sua tela":remote?"Convidado":"Prévia da chamada"}</span><button onClick={()=>document.querySelector(".stage")?.requestFullscreen?.()}>⛶ Tela cheia</button></div>{big?<video ref={el=>{if(el&&el.srcObject!==big)el.srcObject=big}} autoPlay playsInline muted={big===local||big===screen} className="mainVideo"/>:<div className="placeholder"><span>▣</span><h3>A transmissão aparecerá aqui</h3><p>Entre na sala e convide alguém para começar.</p></div>}</div>
 <aside className="sidebar"><div className="tile card"><span>Você</span>{local?<video ref={localVideo} muted autoPlay playsInline/>:<div className="emptyTile">Câmera desligada</div>}</div><div className="tile card"><span>Convidado</span>{remote?<video ref={remoteVideo} autoPlay playsInline/>:<div className="emptyTile">Aguardando participante</div>}</div></aside></section>
 <section className="controls card"><div className="group"><button disabled={!local} onClick={toggleMic}>{mic?"🎙 Microfone ligado":"🔇 Microfone desligado"}</button><button disabled={!local} onClick={toggleCam}>{cam?"📷 Câmera ligada":"🚫 Câmera desligada"}</button><button className={screen?"danger":"primary"} disabled={!local} onClick={share}>{screen?"Parar compartilhamento":"▣ Compartilhar tela"}</button></div><div className="group settings"><label>Resolução<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option></select></label><label>Quadros<select value={fps} onChange={e=>setFps(e.target.value)}><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label><label className="check"><input type="checkbox" checked={shareAudio} onChange={e=>setShareAudio(e.target.checked)}/> Áudio do computador</label></div></section></>}
 <div className="status" role="status"><span className="dot"/>{status}</div><footer>WebRTC • Criptografia em trânsito • Captura condicionada às permissões do navegador</footer></main>;
}
createRoot(document.getElementById("root")).render(<App/>);
