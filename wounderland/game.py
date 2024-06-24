"""wounderland.game"""

import os
import copy
import shutil

from wounderland.utils import WounderMap, WounderKey
from wounderland import utils
from .maze import Maze
from .agent import Agent
from .user import User


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
        storage_root = os.path.join(self.static_root, "storage")
        if os.path.isdir(storage_root) and not config.get("keep_storage", True):
            logger.info("Remove storage @ " + str(storage_root))
            shutil.rmtree(storage_root)
        if not os.path.isdir(storage_root):
            os.makedirs(storage_root)
        for name, agent in config["agents"].items():
            agent_config = utils.update_dict(
                copy.deepcopy(agent_base), self.load_static(agent["path"])
            )
            if agent.get("update"):
                agent_config = utils.update_dict(agent_config, agent["update"])
            agent_config["storage_root"] = os.path.join(storage_root, name)
            self.agents[name] = Agent(agent_config, self.maze, self.logger)
        self.user = None

    def get_agent(self, name):
        return self.agents[name]

    def agent_think(self, name, status):
        agent = self.get_agent(name)
        plan = agent.think(status, self.agents)
        info = {
            "associate": agent.associate.abstract(),
            "concepts": {
                "concept.{}".format(i): c.abstract()
                for i, c in enumerate(agent.concepts)
            },
            "actions": {
                "action.{}".format(i): a.abstract() for i, a in enumerate(agent.actions)
            },
            "schedule": agent.schedule.abstract(),
            "address": agent.get_tile().get_address(as_list=False),
        }
        if agent.llm_available():
            info["llm"] = agent._llm.get_summary()
        title = "{} @ {}".format(name, utils.get_timer().get_date("%H:%M:%S"))
        self.logger.info("{}{}\n".format(utils.split_line(title), agent))
        return {"plan": plan, "info": info}

    def load_static(self, path):
        return utils.load_dict(os.path.join(self.static_root, path))

    def reset_user(self, name, keys, email=None):
        self.user = User(name, keys, email=email)
        for _, agent in self.agents.items():
            agent.reset_user(self.user)

    def remove_user(self):
        for _, agent in self.agents.items():
            agent.remove_user()
        self.user = None


def create_game(static_root, config, logger=None):
    """Create the game"""

    utils.set_timer(**config.get("time", {}))
    WounderMap.set(WounderKey.GAME, Game(static_root, config, logger=logger))
    return WounderMap.get(WounderKey.GAME)


def get_game():
    """Get the gloabl game"""

    return WounderMap.get(WounderKey.GAME)
