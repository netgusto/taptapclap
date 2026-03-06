import {
  Application,
  Sprite,
  AnimatedSprite,
  Texture,
  Rectangle,
  Assets,
} from "pixi.js";

import frogSheet from "./assets/frog.json";
import carltonSheet from "./assets/carlton.json";
import fireworksSheet from "./assets/fireworks.json";

interface Clap {
  sprite: Sprite;
  clipx: number;
  clipy: number;
  TTL: number;
  rotation: number;
  berserk: boolean;
}

const CLAP_WIDTH = 120;
const CLAP_TTL = 180; // ~3s at 60fps
const BERSERK_THRESHOLD = 8;

// --- WebSocket connection ---

function connectWebSocket(
  onClap: (data: { clipx: number; clipy: number }) => void,
): WebSocket {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "clap") {
        onClap({ clipx: data.clipx, clipy: data.clipy });
      }
    } catch {
      // ignore
    }
  });

  ws.addEventListener("close", () => {
    setTimeout(() => {
      const newWs = connectWebSocket(onClap);
      Object.assign(socketRef, { ws: newWs });
    }, 1000);
  });

  return ws;
}

const socketRef: { ws: WebSocket | null } = { ws: null };

function sendClap(clipx: number, clipy: number) {
  if (socketRef.ws?.readyState === WebSocket.OPEN) {
    socketRef.ws.send(
      JSON.stringify({
        type: "clap",
        clipx: clipx.toFixed(3),
        clipy: clipy.toFixed(3),
      }),
    );
  }
}

// --- Spritesheet frame parser ---

function framesForSheet(
  sheet: {
    frames: Record<
      string,
      { frame: { x: number; y: number; w: number; h: number } }
    >;
  },
  baseTexture: Texture,
): Texture[] {
  const source = baseTexture.source;
  return Object.values(sheet.frames).map((entry) => {
    const { x, y, w, h } = entry.frame;
    return new Texture({
      source,
      frame: new Rectangle(x, y, w, h),
    });
  });
}

// --- Main app ---

async function main() {
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.body.appendChild(app.canvas);

  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.stage.hitArea = new Rectangle(
      0,
      0,
      app.renderer.width,
      app.renderer.height,
    );
  });

  // Load textures
  const clapTex = await Assets.load<Texture>(
    new URL("./assets/clapping-hands.png", import.meta.url).href,
  );
  const frogTex = await Assets.load<Texture>(
    new URL("./assets/frog.png", import.meta.url).href,
  );
  const carltonTex = await Assets.load<Texture>(
    new URL("./assets/carlton.png", import.meta.url).href,
  );
  const fireworksTex = await Assets.load<Texture>(
    new URL("./assets/fireworks.png", import.meta.url).href,
  );

  const frogFrames = framesForSheet(frogSheet, frogTex);
  const carltonFrames = framesForSheet(carltonSheet, carltonTex);
  const fireworksFrames = framesForSheet(fireworksSheet, fireworksTex);

  const claps: Clap[] = [];
  let berserkMode = false;
  let berserkSetup = false;
  let berserkDancers: (Sprite | AnimatedSprite)[] = [];

  // Make stage interactive
  app.stage.eventMode = "static";
  app.stage.hitArea = new Rectangle(
    0,
    0,
    app.renderer.width,
    app.renderer.height,
  );

  function addClap(clipx: number, clipy: number, ttl = CLAP_TTL) {
    const clap: Clap = {
      sprite: new Sprite(clapTex),
      clipx,
      clipy,
      TTL: ttl,
      rotation: (Math.random() < 0.5 ? 1 : -1) * 0.01,
      berserk: false,
    };
    claps.push(clap);
    app.stage.addChild(clap.sprite);
  }

  // Click/tap handler
  const onClick = (e: any) => {
    const clipx = e.global.x / app.renderer.width;
    const clipy = e.global.y / app.renderer.height;
    addClap(clipx, clipy);
    sendClap(clipx, clipy);
  };
  app.stage.on("pointerdown", onClick);

  // WebSocket: receive claps from others
  socketRef.ws = connectWebSocket((data) => {
    addClap(data.clipx, data.clipy);
  });

  // Game loop
  app.ticker.add(() => {
    const collect: number[] = [];

    if (berserkMode && !berserkSetup) {
      const firework = new AnimatedSprite(fireworksFrames);
      firework.anchor.set(0.5, 0.5);
      firework.x = (0.5 + Math.random() * 0.3) * app.renderer.width;
      firework.y = (0.2 + Math.random() * 0.2) * app.renderer.height;
      firework.animationSpeed = 0.3;
      firework.play();
      firework.onLoop = () => {
        firework.x = (0.5 + Math.random() * 0.3) * app.renderer.width;
        firework.y = (0.2 + Math.random() * 0.2) * app.renderer.height;
      };
      app.stage.addChild(firework);
      berserkDancers.push(firework);

      const carlton = new AnimatedSprite(carltonFrames);
      carlton.anchor.set(0.5, 1.0);
      carlton.x = 190;
      carlton.y = app.renderer.height - 30;
      carlton.animationSpeed = 0.3;
      carlton.play();
      app.stage.addChild(carlton);
      berserkDancers.push(carlton);

      berserkSetup = true;
    }

    // Update claps
    claps.forEach((clap, idx) => {
      if (berserkMode && !clap.berserk) {
        clap.sprite.destroy();

        const animatedSprite = new AnimatedSprite(frogFrames);
        animatedSprite.animationSpeed = 0.3 + Math.random() * 0.5;
        animatedSprite.play();
        app.stage.addChild(animatedSprite);

        clap.sprite = animatedSprite;
        clap.berserk = true;
      }

      clap.sprite.anchor.set(0.5, 0.5);
      clap.sprite.x = clap.clipx * app.renderer.width;
      clap.sprite.y = clap.clipy * app.renderer.height;

      const scale = app.renderer.width / (12 * CLAP_WIDTH);
      clap.sprite.scale.set(scale, scale);
      clap.sprite.rotation += clap.rotation;
      clap.TTL--;

      if (clap.TTL < 0) {
        clap.sprite.alpha -= 0.1;
        if (clap.sprite.alpha <= 0) {
          collect.push(idx);
        }
      }
    });

    // Remove expired claps (iterate in reverse to preserve indices)
    collect
      .sort((a, b) => b - a)
      .forEach((idx) => {
        if (idx < claps.length) {
          claps[idx].sprite.destroy();
          claps.splice(idx, 1);
        }
      });

    // Berserk mode management
    if (!berserkMode) {
      if (claps.length >= BERSERK_THRESHOLD) {
        berserkMode = true;
      }
    } else {
      if (claps.length === 0) {
        berserkMode = false;
        berserkSetup = false;
        berserkDancers.forEach((d) => d.destroy());
        berserkDancers = [];
      }
    }
  });
}

main();
