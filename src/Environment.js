VALID_ENTRIES = ['Player', 'Enemy', 'Pellet'];

GREEN = "#2ecc71";
RED = "#e74c3c";
DARK = "#2f3542";
LIGHT = "#ecf0f1";

class Space {
    constructor() {
        this.contents = {
            'Player': null,
            'Enemy': null,
            'Pellet': null,
        };
    }
    add(entity) {
        // Returns True if successfully added, false if an invalid entity passed in
        // or if there already exists an entity of that type
        if (typeof(entity) != "object" || 
            !VALID_ENTRIES.includes(entity.constructor.name)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        var className = entity.constructor.name;
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
            !VALID_ENTRIES.includes(entity.constructor.name)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        var className = entity.constructor.name;
        if (this.contents[className] == null) {
            console.log(className + " does not exist in this space");
            return false;
        }
        this.contents[className] = null;
        return true;
    }

    getPlayer() { return this.contents['Player']; }
    getEnemy() { return this.contents['Enemy']; }
    getPellet() { return this.contents['Pellet']; }
    containsPlayer() { return this.contents['Player'] != null }
    containsEnemy() { return this.contents['Enemy'] != null; }
    containsPellet() { return this.contents['Pellet'] != null; }

    atCapacity() {
        return this.containsPlayer() && this.containsEnemy();
    }
    isEmpty() {
        return (
            this.contents.player == null &&
            this.contents.enemy == null &&
            this.contents.pellet == null);
    }
}

class Environment {
    constructor(width, height, numEnemies) {
        this.width = width;
        this.height = height;

        // this.numPlayers = numPlayers;
        this.numEnemies = numEnemies;
        this.clock = 0; // Game clock;

        // Initialize the environment model
        this.model = [];
        for (var x = 0; x < width; x += 1) {
            this.model.push([]);
            for (var y = 0; y < height; y += 1) {
                this.model[x].push(new Space());
            }
        }
        // this.model = [...Array(height)].map(x => Array(width).fill(new Space()));

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

        this.pellets = {};
        this.graphics = true;

        // TODO: define observation space
        // TODO: define action space
    }

    draw(ctx) {
        var gameStateStr = "";
        if (this.graphics) {
            if (ctx == undefined) {
                console.log("Canvas context is undefined, please pass it into the draw method");
            } else {
                var squareSize = 50;
                var canvasWidth = squareSize * this.width;
                var canvasHeight = squareSize * this.height;

                // ctx.fillStyle = "black";
                // ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.strokeStyle = LIGHT;
                ctx.lineWidth = 2;

                for (var x = 0; x < this.width; x += 1) {
                    for (var y = 0; y < this.height; y += 1) {
                        ctx.strokeRect(x * squareSize,
                                    y * squareSize,
                                    squareSize,
                                    squareSize);
                        var space = this.model[x][y];
                        if (space.atCapacity()) {
                            ctx.fillStyle = GREEN;
                            ctx.fillRect(x * squareSize,
                                         y * squareSize,
                                         squareSize / 2,
                                         squareSize / 2);
                            ctx.fillStyle = RED;
                            ctx.fillRect((x + 0.5) * squareSize,
                                         (y + 0.5) * squareSize,
                                         squareSize / 2,
                                         squareSize / 2);
                            ctx.fillStyle = DARK;
                            ctx.fillRect((x + 0.5) * squareSize,
                                        y * squareSize,
                                        squareSize / 2,
                                        squareSize / 2);
                            ctx.fillRect(x * squareSize,
                                        (y + 0.5) * squareSize,
                                        squareSize / 2,
                                        squareSize / 2);
                            continue;
                        } else if (space.containsPlayer()) {
                            ctx.fillStyle = GREEN;
                        } else if (space.containsEnemy()) {
                            ctx.fillStyle = RED;
                        } else if (space.containsPellet()) {
                            ctx.fillStyle = DARK;
                        } else {
                            ctx.fillStyle = DARK;
                        }
                        ctx.fillRect(x * squareSize,
                                     y * squareSize,
                                     squareSize,
                                     squareSize);
                    }
                }
            }
        } else {
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

            for (var y = 0; y < this.height; y += 1) {
                for (var x = 0; x < this.width; x += 1) {
                    gameStateStr += gameState[y][x] + " ";
                }
                gameStateStr += "</br>";
            }
        }
        gameStateStr += "</br>HP: " + this.player.health + " " + "NUM ENEMIES: " + this.numEnemies;
        $("#gameText").html(gameStateStr);
    }

    getObservation() {
        // Returns obs, reward, done
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

    spawnPellets() {
        // Spawn pellet
        // var numPelletsToSpawn = _.random(0, 3);
        // var pelletSpawns = _.sample(_.range(this.width * this.height), numPelletsToSpawn);
        // _.each(pelletSpawns, (spawnLoc, idx, list) => {
        //     var enemyX = Math.floor(spawnLoc / this.height);
        //     var enemyY = spawnLoc % this.height;
        // });
    }

    step(action) {
        this.spawnPellets();
        this.player.act(action);
        _.each(this.enemies, (enemy, idx, list) => {
            enemy.act();
        });
        return this.getObservation();
    }
}