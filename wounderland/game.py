"""wounderland.game"""

import os
import copy

from wounderland.utils import GameMap, GameKey
from wounderland import utils
from .maze import Maze
from .agent import Agent


class Game:
    """The Game"""

    def __init__(self, static_root, config, logger=None):
        self.static_root = static_root
        self.logger = logger or utils.IOLogger()
        self.maze = Maze(self.load_static(config["maze"]["path"]), self.logger)
        self.agents = {}
        if "agent_base" in config:
            agent_base = self.load_static(config["agent_base"]["path"])
        else:
            agent_base = {}
        for name, agent in config["agents"].items():
            agent_config = copy.deepcopy(agent_base)
            agent_config.update(self.load_static(agent["path"]))
            self.agents[name] = Agent(agent_config, self.maze, self.logger)

    def agent_think(self, name, status):
        return self.agents[name].think(status, self.agents)

    def load_static(self, path):
        return utils.load_dict(os.path.join(self.static_root, path))

    def get_agent(self, name):
        return self.agents[name]


def create_game(static_root, config, logger=None):
    """Create the game"""

    GameMap.set(GameKey.GAME, Game(static_root, config, logger=logger))
    return {"start": True}


def get_game():
    """Get the gloabl game"""

    return GameMap.get(GameKey.GAME)
