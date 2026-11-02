# TelaLink

Aplicativo web experimental de videochamadas para duas pessoas com câmera, microfone e compartilhamento de tela.

## Rodar

```bash
npm install
npm run dev
```

## Publicar

Importe este repositório em https://vercel.com/new. Framework Vite, Build Command `npm run build`, Output Directory `dist`.

## Notas

- 1080p/60 FPS são solicitações de captura, não garantias de entrega.
- Captura de áudio do computador depende do navegador e do sistema.
- O identificador da sala no link não substitui autenticação; não compartilhe com desconhecidos.
- PeerJS usa sinalização pública por padrão e a ligação P2P pode falhar em algumas redes sem TURN próprio.
- Use HTTPS em produção para permitir câmera, microfone e compartilhamento.
