# Tap Tap Clap

Remote Clapping Apparatus. Broadcasts your group reactions visually.

Tap or click anywhere on the page and it gets broadcast to everybody present.

Works nicely on a mobile device that you can use while videoconferencing on the desktop.

## Stack

- **Frontend**: Pixi.js 8 + TypeScript, built with Vite
- **Backend**: Cloudflare Worker + Durable Objects (WebSocket relay)
- **Deploy**: Cloudflare Workers at [taptapclap.sigmoid.lol](https://taptapclap.sigmoid.lol)

## Development

```bash
npm install

# Frontend dev server (with WebSocket proxy to worker)
npm run dev

# Worker dev server (run in a separate terminal)
npm run dev:worker
```

## Deploy

```bash
npm run deploy
```
