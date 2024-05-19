import Maze from "./maze.js"
import Agent from "./agent.js"
import utils from "./utils.js";

export default class Land extends Phaser.Scene {
    init(data) {
        this.msg = data;
        this.assets_root = data.assets_root;
        this.urls = data.urls;
    }

    preload() {
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
        this.game_config = {};
        for (const [name, config] of Object.entries(this.config.config)) {
            if (name == "agents") {
                this.game_config[name] = {};
                for (const a_name of this.msg.agents) {
                    this.game_config[name][a_name] = config[a_name];
                    this.load.json('config.agent.' + a_name, this.getAsset(config[a_name].path));
                }
            } else {
                this.game_config[name] = config;
                this.load.json('config.' + name, this.getAsset(config.path));
            }
        }
        // start game
        this.game_status = { start: false };
        let callback = (info) => {
            this.game_status = info;
        }
        utils.jsonRequest(this.urls.start_game, this.game_config, callback);
    }

    create() {
        // create maze
        this.maze = new Maze(this, this.cache.json.get('config.maze'));

        // create agent
        this.agents = {};
        const agent_base_config = this.cache.json.get("config.agent_base");
        for (const name of this.msg.agents) {
            let agent_config = this.cache.json.get("config.agent." + name);
            if (agent_base_config) {
                agent_config = { ...agent_base_config, ...agent_config }
            }
            this.agents[name] = new Agent(this, agent_config, this.msg.urls);
            for (const agent of Object.values(this.agents)) {
                this.agents[name].addCollider(agent);
            }
        }
        // add colliders
        for (const layer of Object.values(this.maze.layers)) {
            if (layer.info.collision) {
                for (const agent of Object.values(this.agents)) {
                    agent.addCollider(layer.layer);
                }
            }
        }
        // change player
        this.changePlayer(this.msg.agents[this.msg.agents.length - 1]);

        // set events
        this.cursors = this.input.keyboard.createCursorKeys()
        this.input.on('gameobjectdown', this.objClicked);
        this.on_config = false;
    }

    update() {
        if (this.game_status.start) {
            for (const agent of Object.values(this.agents)) {
                agent.update();
            }
        }
        this.configAgent();
        if (this.cursors.space.isDown && !this.on_config) {
            this.on_config = true;
        }
        if (this.cursors.space.isUp && this.on_config) {
            console.log("debugging...");
            this.on_config = false;
        }
    }

    configAgent() {
        var player = this.msg.player;
        if (Object.keys(player.update).length > 0) {
            if (player.update.player) {
                this.changePlayer(player.update.player);
            }
            if (this.player && (typeof player.update.follow !== "undefined")) {
                this.maze.setFollow(this.player, player.update.follow);
            }
            if (this.player && (typeof player.update.control !== "undefined")) {
                this.player.setControl(player.update.control);
            }
            player.update = {};
        }
        if (this.player && this.msg.agent.display.profile) {
            this.msg.agent.profile.status = utils.textBlock(this.player.getStatus());
        }
    }

    changePlayer(name) {
        if (this.player) {
            this.player.setControl(false);
            this.maze.setFollow(this.player, false);
        }
        this.player = this.agents[name];
        this.maze.locate(this.player);
        var agent = this.msg.agent;
        if (this.player && agent.display.profile) {
            this.msg.player.portrait = this.player.portrait || "";
            agent.profile.status = utils.textBlock(this.player.getStatus());
            agent.profile.describe = utils.textBlock(this.player.getDescribe());
        }
    }

    objClicked = (pointer, obj) => {
        if (obj instanceof Agent) {
            this.changePlayer(obj.name);
        }
    }

    getAsset(path) {
        var abs_path = path;
        if (abs_path.startsWith("http")) {
            return abs_path;
        }
        return this.assets_root + "/" + abs_path;
    }
}