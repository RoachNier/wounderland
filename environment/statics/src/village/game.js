import Village from './scenes/village.js'
import Persona from '../base/agent.js';

const config = {
    type: Phaser.AUTO,
    pixelArt: true,
    scale: {
        parent: env.parent,
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
    },
    dom: {
        createContainer: true
    },
    scene: [Village, Persona],
    physics: {
        default: "arcade",
        arcade: {
            debug: true,
        }
    }
}

const game = new Phaser.Game(config);
game.scene.start("village", env);