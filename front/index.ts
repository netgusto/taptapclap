import {
    Sprite as PIXISprite,
    Application as PIXIApplication,
    Rectangle as PIXIRectangle,
    AnimatedSprite as PIXIAnimatedSprite,
    Point as PIXIPoint,
    Texture as PIXITexture
} from 'pixi.js';
import clapping_image_path from "./assets/clapping-hands.png";
import frogsheet from "./assets/frog.json";
import frogtexture from "./assets/frog.png";
import carltonsheet from "./assets/carlton.json";
import carltontexture from "./assets/carlton.png";
import fireworkssheet from "./assets/fireworks.json";
import fireworkstexture from "./assets/fireworks.png";

import io from 'socket.io-client';

interface Clap {
    sprite: PIXISprite;
    clipx: number;
    clipy: number;
    TTL: number;
    rotation: number;
    berserk: boolean;
}

const CLAP_WIDTH = 120;
const CLAP_TTL = 180;   // 3s
const BERSERK_THRESHOLD = 20;

(window as any).clap = function(container: HTMLElement) {

    const socket = io(document.location.href);
    socket.on('connect', () => {
        start(socket, container);
    });
}

function start(socket, container: HTMLElement) {

    let berserkMode = false;

    const app = new PIXIApplication({ width: container.clientWidth, height: container.clientHeight});
    container.appendChild(app.view);
    window.addEventListener("resize", (e) => {
        app.renderer.resize(container.clientWidth, container.clientHeight);
        app.stage.hitArea = new PIXIRectangle(0, 0, app.renderer.width, app.renderer.height);
    });

    // load the texture we need
    app.loader.add('clap', clapping_image_path);
    app.loader.add('frogtexture', frogtexture);
    app.loader.add('carltontexture', carltontexture);
    app.loader.add('fireworkstexture', fireworkstexture);

    app.loader.load((_, resources) => {

        const frogFrames = framesForAnimatedSpritesheet(frogsheet, resources.frogtexture.texture.baseTexture);
        const carltonFrames = framesForAnimatedSpritesheet(carltonsheet, resources.carltontexture.texture.baseTexture);
        const fireworksFrames = framesForAnimatedSpritesheet(fireworkssheet, resources.fireworkstexture.texture.baseTexture);

        const claps: Array<Clap> = [];

        app.stage.interactive = true;
        app.stage.hitArea = new PIXIRectangle(0, 0, app.renderer.width, app.renderer.height);
        const onclick = (e) => {

            const clap = {
                sprite: new PIXISprite(resources.clap.texture),
                clipx: e.data.global.x / app.renderer.width,
                clipy: e.data.global.y / app.renderer.height,
                TTL: CLAP_TTL,
                rotation: (Math.random() < .5 ? 1 : -1) * 0.01,
                berserk: false,
            }
            claps.push(clap);

            // Add the clap to the stage
            app.stage.addChild(clap.sprite);

            // broadcast about the clap
            socket.emit("clap", { clipx: clap.clipx.toPrecision(3), clipy: clap.clipy.toPrecision(3) });
        };
        app.stage.on("mousedown", onclick);
        app.stage.on("touchstart", onclick);

        socket.on("clap", (data: { clipx: number, clipy: number }) => {
            const clap = {
                sprite: new PIXISprite(resources.clap.texture),
                clipx: data.clipx,
                clipy: data.clipy,
                TTL: 200,
                rotation: (Math.random() < .5 ? 1 : -1) * 0.01,
                berserk: false,
            };
            claps.push(clap);

            // Add the clap to the stage
            app.stage.addChild(clap.sprite);
        });

        let berserkSetup = false;
        let berserkdancers = [];

        // Game loop
        app.ticker.add(() => {

            const collect: Array<number> = [];

            if (berserkMode && berserkSetup == false) {

                const firework = new PIXIAnimatedSprite(fireworksFrames);
                firework.anchor.x = 0.5;
                firework.anchor.y = 0.5;
                firework.x = (0.5 + Math.random() * 0.3) * app.renderer.width;
                firework.y = (0.2 + Math.random() * 0.2) * app.renderer.height;
                firework.animationSpeed = 0.3;
                firework.play();
                firework.onLoop = () => {
                    firework.x = (0.5 + Math.random() * 0.3) * app.renderer.width;
                    firework.y = (0.2 + Math.random() * 0.2) * app.renderer.height;
                };
                app.stage.addChild(firework);
                berserkdancers.push(firework);

                const carlton = new PIXIAnimatedSprite(carltonFrames);

                carlton.anchor.x = 0.5;
                carlton.anchor.y = 1.0;

                carlton.x = 190;
                carlton.y = app.renderer.height - 30;

                carlton.animationSpeed = 0.3;;
                carlton.play();
                app.stage.addChild(carlton);
                berserkdancers.push(carlton);


                berserkSetup = true;
            }

            // update claps
            claps.map((clap, idx) => {
                if (berserkMode && !clap.berserk) {
                    clap.sprite.destroy();

                    const animatedSprite = new PIXIAnimatedSprite(frogFrames);
                    animatedSprite.animationSpeed = 0.3 + Math.random() * 0.5;
                    animatedSprite.play();
                    app.stage.addChild(animatedSprite);

                    clap.sprite = animatedSprite;
                    clap.berserk = true;
                }

                // Rotate around the center
                clap.sprite.anchor.x = 0.5;
                clap.sprite.anchor.y = 0.5;

                clap.sprite.x = clap.clipx * app.renderer.width;
                clap.sprite.y = clap.clipy * app.renderer.height;

                const scale = app.renderer.width / (12 * CLAP_WIDTH);    // target size: display 12 claps on width
                clap.sprite.scale = new PIXIPoint(scale, scale);
                clap.sprite.rotation += clap.rotation;
                clap.TTL--;

                if (clap.TTL < 0) {
                    clap.sprite.alpha -= 0.1;
                    if (clap.sprite.alpha <= 0) {
                        collect.push(idx)
                    }
                }
            });

            collect.sort((a, b) => b < a ? 1 : -1).forEach(idx => {
                console.log("collect!");
                const clap = claps[idx];
                clap.sprite.destroy();
                claps.splice(idx, 1);
            });

            if (!berserkMode) {
                if(claps.length >= BERSERK_THRESHOLD) {
                    berserkMode = true;
                }
            } else {
                if(claps.length == 0) {
                    berserkMode = false;
                    berserkSetup = false;
                    berserkdancers.map(d => d.destroy());
                    berserkdancers = [];
                }
            }
        });
    });
}

function framesForAnimatedSpritesheet(sheet, basetexture) {
    const frames = [];
    for (const frame of Object.values(sheet.frames)) {
        const f = frame.frame;
        frames.push(new PIXITexture(basetexture, new PIXIRectangle(f.x, f.y, f.w, f.h)));
    }

    return frames;
}