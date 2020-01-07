/*
class Space {
    constructor() {
        this.contents = {
            'Player': null,
            'Enemy': null,
            'Pellet': null,
        };
        this.validEntities = Object.keys(this.contents);
    }
    add(entity) {
        // Returns True if successfully added, false if an invalid entity passed in
        // or if there already exists an entity of that type
        if (typeof(entity) != "object" || 
            !this.validEntities.includes(entity.constructor.name)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        className = entity.constructor.name;
        if (this.contents[className] != null) {
            console.log(className + " already exists in this space");
            return false;
        }
        this.contents[className] = entity;
        return true;
    }
    remove(entity) {
        // Returns True if successfully removed, false if an invalid entity passed in
        // or if there does not exist an entity of that type
        if (typeof(entity) != "object" || 
            !this.validEntities.includes(entity.constructor.name)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        className = entity.constructor.name;
        if (this.contents[className] == null) {
            console.log(className + " does not exist in this space");
            return false;
        }
        this.contents[className] = entity;
        return true;
    }
    isEmpty() {
        return (
            this.contents.player == null &&
            this.contents.enemy == null &&
            this.contents.pellet == null);
    }
}
*/

class Environment {
    constructor(width, height, numEnemies) {
        this.width = width;
        this.height = height;

        // this.numPlayers = numPlayers;
        this.numEnemies = numEnemies;
        this.clock = 0; // Game clock;
        this.numEntities = [...Array(height)].map(x => Array(width).fill(0));

        // Initialize the environment model as a 2D array of strings
        // this.model = [...Array(size)].map(x => Array(size).fill("_"));

        // Initialize the player into the environment
        // this.model[Math.floor(size / 2)][Math.floor(size / 2)] = "P";
        var midX = Math.floor(width / 2);
        var midY = Math.floor(height / 2);
        this.player = new Player(this, midX, midY);

        // Initialize enemies into the environment
        this.enemies = [];
        var enemySpawns = _.sample(_.range(width * height), numEnemies);
        _.each(enemySpawns, (el, idx, list) => {
            var enemyX = Math.floor(el / height);
            var enemyY = el % height;
            this.enemies[idx] = new Enemy(this, enemyX, enemyY, idx);
        });

        // TODO: define observation space
        // TODO: define action space
    }

    draw() {
        var gameState = [...Array(this.width)].map(x => Array(this.height).fill("_"));
        gameState[this.player.y][this.player.x] = "P";

        _.each(this.enemies, (enemy, idx, list) => {
            if (!enemy.isDead()) {
                if (gameState[enemy.y][enemy.x] != "_") {
                    gameState[enemy.y][enemy.x] += "/E";
                } else {
                    gameState[enemy.y][enemy.x] = "E";
                }
            }
        });

        var gameStateStr = "";
        for (var y = 0; y < this.height; y += 1) {
            for (var x = 0; x < this.width; x += 1) {
                gameStateStr += gameState[y][x] + " ";
            }
            gameStateStr += "</br>";
        }

        gameStateStr += "</br>HP: " + this.player.health + " " + "NUM ENEMIES: " + this.numEnemies;
        $("#gameText").html(gameStateStr);
    }

    step(action) {
        // Returns new observation, reward, done, and info
        this.player.act(action);
        _.each(this.enemies, (enemy, idx, list) => {
            enemy.act();
        });
        var output = {};
        var obs, reward, done;
        if (this.player.health <= 0) {
            output.done = true;
        } else {
            output.done = false;
        }
        output.reward = 0;
        output.obs = [0, 0, 0];
        return output;
    }

    getObservation() {

    }
}