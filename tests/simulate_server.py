import os
import copy
import time
from wounderland.game import create_game, get_game
from wounderland import utils


class SimulateServer:
    def __init__(self, static_root, config):
        self.static_root = static_root
        create_game(static_root, config)
        self.game = get_game()
        self.tile_size = self.game.maze.tile_size
        self.agent_status = {}
        if "agent_base" in config:
            agent_base = self.load_static(config["agent_base"]["path"])
        else:
            agent_base = {}
        for name, agent in config["agents"].items():
            agent_config = copy.deepcopy(agent_base)
            agent_config.update(self.load_static(agent["path"]))
            self.agent_status[name] = {
                "direction": agent_config["direction"],
                "position": agent_config["position"],
                "speed": agent_config["move"]["speed"],
            }
        self.think_interval = max(
            a.think_config["interval"] for a in self.game.agents.values()
        )
        self.logger = self.game.logger

    def simulate(self, step):
        for i in range(step):
            self.logger.info("Simulate Step " + str(i))
            for name, status in self.agent_status.items():
                plan = self.game.agent_think(name, status)
                print("plan of {}:{}".format(name, plan))
            # time.sleep(self.think_interval/1000)

    def load_static(self, path):
        return utils.load_dict(os.path.join(self.static_root, path))