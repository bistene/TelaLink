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
 const [quality,setQuality]=useState("720"),[fps,setFps]=useState("30");
 const [shareAudio,setShareAudio]=useState(true);
 const [ios]=useState(()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1));
 const [playBlocked,setPlayBlocked]=useState(false);
 const [local,setLocal]=useState(null),[remote,setRemote]=useState(null),[screen,setScreen]=useState(null),[remoteScreen,setRemoteScreen]=useState(null);
 const peer=useRef(null),localRef=useRef(null),screenRef=useRef(null),calls=useRef([]),other=useRef("");
 const retryTimer=useRef(null),attempts=useRef(0),connectedRef=useRef(false);
 const placeholderRef=useRef(null);
 const localVideo=useRef(null),remoteVideo=useRef(null),screenVideo=useRef(null),remoteScreenVideo=useRef(null);
 useEffect(()=>{if(localVideo.current)localVideo.current.srcObject=local},[local]);
 useEffect(()=>{if(remoteVideo.current)remoteVideo.current.srcObject=remote},[remote]);
 useEffect(()=>{if(!remote)return;const el=remoteVideo.current;if(el){el.play().then(()=>setPlayBlocked(false)).catch(()=>setPlayBlocked(true))}},[remote]);
 useEffect(()=>{if(screenVideo.current)screenVideo.current.srcObject=screen},[screen]);
 useEffect(()=>{if(remoteScreenVideo.current)remoteScreenVideo.current.srcObject=remoteScreen},[remoteScreen]);
 const resumeAudio=()=>{document.querySelectorAll("video").forEach(v=>v.play().catch(()=>{}));setPlayBlocked(false)};
 const link=()=>location.origin+location.pathname+"?room="+encodeURIComponent(room);
 function newRoom(){const id=crypto.randomUUID();setRoom(id);setHost(true);history.replaceState(null,"",location.pathname+"?room="+id+"&host=1");setStatus("Sala criada. Clique em Entrar na chamada.");}
 async function copy(){try{await navigator.clipboard.writeText(link());setStatus("Link copiado!")}catch{setStatus("Copie o endereço: "+link())}}
 function attachCall(call,kind){calls.current.push(call);call.on("stream",s=>{if(kind==="screen")setRemoteScreen(s);else {setRemote(s);if(screenRef.current&&peer.current)dial(other.current,"screen",screenRef.current)}connectedRef.current=true;clearTimeout(retryTimer.current);setConnected(true);setStatus("Conectado")});call.on("close",()=>{if(kind==="screen")setRemoteScreen(null);else setRemote(null)});call.on("error",e=>{if(kind==="camera"&&!connectedRef.current&&e.type==="peer-unavailable")scheduleRetry();else setStatus("Erro de transmissão: "+e.message)})}
 function outgoingStream(){if(localRef.current?.getTracks().length)return localRef.current;if(!placeholderRef.current){const canvas=document.createElement("canvas");canvas.width=16;canvas.height=16;const ctx=canvas.getContext("2d");ctx.fillStyle="#080d1a";ctx.fillRect(0,0,16,16);placeholderRef.current=typeof canvas.captureStream==="function"?canvas.captureStream(1):new MediaStream()}return placeholderRef.current}
 function scheduleRetry(){if(!peer.current||connectedRef.current||attempts.current>=12)return;clearTimeout(retryTimer.current);setStatus("Aguardando o anfitrião entrar na sala... tentativa "+(attempts.current+1)+"/12");retryTimer.current=setTimeout(()=>{if(!peer.current||connectedRef.current)return;attempts.current++;dial(other.current,"camera",outgoingStream())},2500)}
 function tuneCall(call,kind){const pc=call?.peerConnection;if(!pc)return;const tune=async()=>{for(const sender of pc.getSenders()){if(sender.track?.kind!=="video")continue;try{const p=sender.getParameters();p.encodings=p.encodings?.length?p.encodings:[{}];p.encodings[0].maxBitrate=kind==="screen"?(quality==="1080"?3000000:quality==="720"?1400000:650000):450000;p.encodings[0].maxFramerate=kind==="screen"?Number(fps):15;await sender.setParameters(p)}catch{}}};setTimeout(tune,300)}
 function dial(id,kind,stream){if(!peer.current||!stream)return;const call=peer.current.call(id,stream,{metadata:{kind}});if(call){attachCall(call,kind);tuneCall(call,kind)}}
 async function join(){
 if(!room){setStatus("Crie uma sala primeiro.");return}
 if(peer.current)return;
 try{
  setStatus("Solicitando câmera e microfone...");
  let stream=new MediaStream();
  if(navigator.mediaDevices?.getUserMedia){
   try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:360},frameRate:{ideal:15,max:20}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
   catch(e){
    for(const constraints of [{video:false,audio:true},{video:{facingMode:"user"},audio:false}]){try{stream=await navigator.mediaDevices.getUserMedia(constraints);break}catch{}}
    setStatus("Entrando sem câmera ou microfone indisponíveis.");
   }
  }
  localRef.current=stream;setLocal(stream.getTracks().length?stream:null);setCam(stream.getVideoTracks().length>0);setMic(stream.getAudioTracks().length>0);attempts.current=0;connectedRef.current=false;
  const id="telalink-"+room+(host?"-host":"-guest");
  const counterpart="telalink-"+room+(host?"-guest":"-host");
  other.current=counterpart;
  const p=new Peer(id);peer.current=p;
  p.on("open",()=>{setStatus(host?"Sala aberta. Aguardando convidado...":"Conectando à sala...");if(!host){dial(counterpart,"camera",outgoingStream());}});
  p.on("call",call=>{const kind=call.metadata?.kind==="screen"?"screen":"camera";call.answer(outgoingStream());attachCall(call,kind);tuneCall(call,kind);if(host&&kind==="camera")setTimeout(()=>dial(counterpart,"camera",outgoingStream()),250)});
  p.on("error",e=>{if(e.type==="peer-unavailable"&&!host&&!connectedRef.current)scheduleRetry();else if(e.type==="unavailable-id")setStatus("Esta sala já está aberta em outra aba. Feche a aba duplicada.");else setStatus("Erro de conexão: "+e.message)});
  p.on("disconnected",()=>setStatus("Sinalização desconectada. Verifique a rede."));
 }catch(e){setStatus("Não foi possível acessar câmera/microfone: "+e.message)}
 }
 function toggleMic(){if(!localRef.current?.getAudioTracks().length){setStatus("Nenhum microfone disponível.");return}const value=!mic;localRef.current?.getAudioTracks().forEach(t=>t.enabled=value);setMic(value)}
 function toggleCam(){if(!localRef.current?.getVideoTracks().length){setStatus("Nenhuma câmera disponível.");return}const value=!cam;localRef.current?.getVideoTracks().forEach(t=>t.enabled=value);setCam(value)}
 async function share(){
 if(ios||!navigator.mediaDevices?.getDisplayMedia){setStatus("O Safari no iPhone pode assistir à tela, mas não compartilhar a própria tela.");return}
 if(!peer.current){setStatus("Entre na chamada antes de compartilhar.");return}
 if(screenRef.current){stopShare();return}
 try{
  const stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:Number(quality)===1080?1920:Number(quality)===720?1280:854},height:{ideal:Number(quality)},frameRate:{ideal:Number(fps),max:Number(fps)}},audio:shareAudio});
  screenRef.current=stream;setScreen(stream);
  stream.getVideoTracks()[0].onended=stopShare;
  dial(other.current,"screen",stream);
  setStatus("Compartilhando em "+quality+"p / até "+fps+" FPS. Se travar, reinicie em 480p / 30 FPS.");
 }catch(e){setStatus(e.name==="NotAllowedError"?"Compartilhamento cancelado.":"Erro ao compartilhar: "+e.message)}
 }
 function stopShare(){screenRef.current?.getTracks().forEach(t=>t.stop());screenRef.current=null;setScreen(null);calls.current.filter(c=>c.metadata?.kind==="screen").forEach(c=>c.close());}
 function leave(){clearTimeout(retryTimer.current);connectedRef.current=false;attempts.current=0;stopShare();calls.current.forEach(c=>c.close());calls.current=[];peer.current?.destroy();peer.current=null;placeholderRef.current?.getTracks().forEach(t=>t.stop());placeholderRef.current=null;localRef.current?.getTracks().forEach(t=>t.stop());localRef.current=null;setLocal(null);setRemote(null);setRemoteScreen(null);setConnected(false);setStatus("Chamada encerrada.")}
 useEffect(()=>()=>{clearTimeout(retryTimer.current);peer.current?.destroy();localRef.current?.getTracks().forEach(t=>t.stop());screenRef.current?.getTracks().forEach(t=>t.stop());placeholderRef.current?.getTracks().forEach(t=>t.stop())},[]);
 const big=remoteScreen||screen||remote||local;
 const fullScreen=()=>{const el=document.querySelector(".mainVideo");if(el?.webkitEnterFullscreen)el.webkitEnterFullscreen();else if(el?.requestFullscreen)el.requestFullscreen();else document.querySelector(".stage")?.requestFullscreen?.().catch(()=>setStatus("Tela cheia indisponível neste navegador."))};
 return <div className="appShell"><nav className="rail" aria-label="Servidores"><div className="railLogo">T</div><div className="railDivider"/><button className="railServer active" title="TelaLink">TL</button><button className="railServer" onClick={newRoom} title="Criar sala">+</button><div className="railBottom">●</div></nav><aside className="channels"><div className="serverTitle">TelaLink <span>⌄</span></div><div className="channelScroll"><div className="channelSection">SALAS DE VOZ <span>＋</span></div><button className="channelItem selected" onClick={()=>{if(!room)newRoom()}}>◖))　Geral</button><div className="channelMembers"><span className="onlineDot"/> Você {peer.current?"· conectado":""}</div>{connected&&<div className="channelMembers"><span className="onlineDot"/> Convidado</div>}<div className="channelSection spaceTop">TRANSMISSÃO</div><div className="channelItem passive">▣　Compartilhar tela</div><div className="channelSection spaceTop">INFORMAÇÕES</div><div className="channelItem passive">#　Sala privada</div></div><div className="userDock"><div className="avatar">EU</div><div className="userInfo"><strong>Você</strong><small>{connected?"Em chamada":"Disponível"}</small></div><span className="dockIcon">⚙</span></div></aside><main className="content"><header><div className="brand"><span className="headerIcon">◖))</span><div><strong>Geral</strong><small> / TelaLink</small></div></div><div className="live"><span className={connected?"dot on":"dot"}/>{connected?"Conectado":peer.current?"Na sala":"Desconectado"}</div></header>
 <section className="intro"><span className="eyebrow">CANAL DE VOZ / GERAL</span><h1>{room?"Sua sala de voz":"Pronto para conversar?"}</h1><p>{room?"Convide alguém e compartilhe sua tela, como em uma sala de voz.":"Crie uma sala e envie o convite. Sem cadastro, sem instalação."}</p></section>
 {!room?<section className="start card"><div className="bigIcon">↗</div><h2>Entre na conversa</h2><p>Salas para duas pessoas. Sem conta, sem instalação.</p><button className="primary" onClick={newRoom}>Criar sala privada</button></section>:
 <><section className="toolbar card"><div className="roomLabel"><span className="eyebrow">LINK DA SUA SALA</span><div className="roomUrl">{link()}</div></div><button onClick={copy}>Copiar convite</button>{!peer.current?<button className="primary" onClick={join}>{host?"Iniciar chamada":"Entrar na chamada"}</button>:<button className="danger" onClick={leave}>Sair</button>}</section>
 {peer.current&&!local&&<div className="iosNote" role="note">Você entrou sem câmera e microfone. Ainda pode assistir à transmissão e compartilhar a tela do computador.</div>}{ios&&<div className="iosNote" role="note">📱 Modo Safari: você pode conversar e assistir à tela compartilhada. Para transmitir sua própria tela, use um computador.</div>}{playBlocked&&<button className="primary audioResume" onClick={resumeAudio}>▶ Toque para ativar o áudio da chamada</button>}
 <section className="videos"><div className="stage card"><div className="stageTop"><span>{remoteScreen?"Tela compartilhada":screen?"Sua tela":remote?"Convidado":"Prévia da chamada"}</span><button onClick={fullScreen}>⛶ Tela cheia</button></div>{big?<video ref={el=>{if(el&&el.srcObject!==big)el.srcObject=big}} autoPlay playsInline webkit-playsinline="true" muted={big===local||big===screen} className="mainVideo"/>:<div className="placeholder"><span>▣</span><h3>A transmissão aparecerá aqui</h3><p>Entre na sala e convide alguém para começar.</p></div>}</div>
 <aside className="sidebar"><div className="tile card"><span>Você</span>{local?<video ref={localVideo} muted autoPlay playsInline/>:<div className="emptyTile">Câmera desligada</div>}</div><div className="tile card"><span>Convidado</span>{remote?<video ref={remoteVideo} autoPlay playsInline/>:<div className="emptyTile">Aguardando participante</div>}</div></aside></section>
 <section className="controls card"><div className="group"><button disabled={!local?.getAudioTracks().length} onClick={toggleMic}>{mic?"🎙 Microfone ligado":"🔇 Microfone desligado"}</button><button disabled={!local?.getVideoTracks().length} onClick={toggleCam}>{cam?"📷 Câmera ligada":"🚫 Câmera desligada"}</button><button className={screen?"danger":"primary"} disabled={!peer.current||ios} onClick={share}>{screen?"Parar compartilhamento":"▣ Compartilhar tela"}</button></div>{!ios&&<div className="group settings"><label>Qualidade da tela<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="480">480p (internet lenta)</option><option value="720">720p</option><option value="1080">1080p</option></select></label><label>FPS da tela<select value={fps} onChange={e=>setFps(e.target.value)}><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label><label className="check"><input type="checkbox" checked={shareAudio} onChange={e=>setShareAudio(e.target.checked)}/> Áudio do computador</label></div>}</section></>}
 <div className="status" role="status"><span className="dot"/>{status}</div><footer>TelaLink · Chamada privada via WebRTC</footer></main></div>;
}
createRoot(document.getElementById("root")).render(<App/>);
