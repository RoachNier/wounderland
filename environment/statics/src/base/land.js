import tileMapCreator from "./tilemap.js"
import LandCamera from "./camera.js"
import Agent from "./agent.js"

export default class Land extends Phaser.Scene {
    init(data) {
        this.env = data;
        this.assets_root = data.assets_root;
    }

    preload() {
        this.on_debug = false;
        this.config = this.config();
        // load assets
        for (const [name, asset] of Object.entries(this.config.assets)) {
            if (asset.type == "tilemapTiledJSON") {
                this.load.tilemapTiledJSON(name, this.getAsset(asset.path));
            } else if (asset.type == "image") {
                this.load.image(name, this.getAsset(asset.path));
            } else if (asset.type == "atlas") {
                this.load.atlas(name, this.getAsset(asset.texture), this.getAsset(asset.sprite));
            }
        }
        // load config
        for (const [name, config] of Object.entries(this.config.config)) {
            if (name == "agents") {
                for (const [a_name, a_config] of Object.entries(config)) {
                    this.load.json('config.agent.' + a_name, this.getAsset(a_config.path));
                }
            } else if (config.load == "frontend" || config.load == "both") {
                this.load.json('config.' + name, this.getAsset(config.path));
            }
        }
    }

    create() {
        const land_config = this.cache.json.get('config.land');
        const map_creator = new tileMapCreator(this, land_config.map);
        this.map = map_creator.create();

        // create agent
        this.agents = {};
        const agent_base_config = this.cache.json.get("config.agent.base");
        for (const name of this.env.agents) {
            let agent_config = this.cache.json.get("config.agent." + name);
            if (agent_base_config) {
                agent_config = { ...agent_base_config, ...agent_config }
            }
            this.agents[name] = new Agent(this, agent_config);
            for (const agent of Object.values(this.agents)) {
                this.agents[name].addCollider(agent);
            }
        }
        // add colliders
        for (const [name, layer] of Object.entries(map_creator.layers)) {
            if (layer.info.collision) {
                for (const agent of Object.values(this.agents)) {
                    agent.addCollider(layer.layer);
                }
            }
        }

        // create camera
        this.camera = new LandCamera(this, land_config.camera);

        // set events
        this.cursors = this.input.keyboard.createCursorKeys()
        this.input.on('gameobjectdown', this.objClicked);

        // change player
        this.changePlayer(this.env.agents[this.env.agents.length - 1]);

        // start backend
        var retrieve_xobj = new XMLHttpRequest();
        retrieve_xobj.overrideMimeType("application/json");
        retrieve_xobj.open('POST', this.env.start_url, true);
        retrieve_xobj.send(JSON.stringify(this.config.config));
    }

    update() {
        for (const agent of Object.values(this.agents)) {
            agent.update();
        }
        if (this.cursors.space.isDown) {
            this.on_debug = true;
        }
        if (this.cursors.space.isUp && this.on_debug) {
            this.debug();
            this.on_debug = false;
        }
    }

    getAsset(path) {
        var abs_path = path;
        if (abs_path.startsWith("http")) {
            return abs_path;
        }
        return this.assets_root + "/" + abs_path;
    }

    debug = () => {
        for (const agent of Object.values(this.agents)) {
            console.log(agent.toString());
        }
    }

    changePlayer(name) {
        if (this.player) {
            this.player.setControl(false);
            this.camera.setFollow(this.player, false);
        }
        this.player = this.agents[name];
        this.camera.locate(this.player);
        console.log("Change player to " + this.player);
    }

    objClicked = (pointer, obj) => {
        if (obj instanceof Agent) {
            this.changePlayer(obj.name);
        }
    }

}