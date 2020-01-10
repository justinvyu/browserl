VALID_ENTRIES = ['Player', 'Enemy', 'Pellet'];

/* === COLORS === */
GREEN = "#2ecc71";
DARKGREEN = "#0d3a20";
RED = "#e74c3c";
DARKRED = "#440e08";
DARK = "#2f3542";
LIGHT = "#ecf0f1";
YELLOW = "#f1c40f";
PURPLE = "#9b59b6";
BLUE = "#3498db";

GRID_ENCODE_LOOKUP = {
    'Invalid': -1,
    'Empty': 0,
    'Player': 1,
    'Enemy': 2,
    'Pellet': 3,
    'AttackPellet': 4,
    'HealthPellet': 5,
}

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
        var className = entity.constructor.name;
        if (className.includes("Pellet")) {
            className = "Pellet";
        }
        if (typeof(entity) != "object" || 
            !(entity instanceof Entity || entity instanceof Pellet)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
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
        var className = entity.constructor.name;
        if (className.includes("Pellet")) {
            className = "Pellet";
        }
        if (typeof(entity) != "object" || 
            !(entity instanceof Entity || entity instanceof Pellet)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
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
    atCapacity() { return this.containsPlayer() && this.containsEnemy(); }
    isEmpty() {
        return !this.containsPlayer() && !this.containsEnemy() && !this.containsPellet();
    }
}

class Environment {
    constructor(width, height, numEnemies,
                observationKeys = ["vision", "health", "damage"],
                graphics = true) {
        this.width = width;
        this.height = height;
        this.startingEnemies = numEnemies;

        this.graphics = graphics;
        this.squareSize = 50;

        // This determines which observation keys are concatenated together when calling `getObservation`
        this.observationKeys = observationKeys;

        this.reset();
    }

    drawSquare(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * this.squareSize,
                     y * this.squareSize,
                     this.squareSize,
                     this.squareSize);
    }

    drawText(ctx, x, y, str, color) {
        ctx.fillStyle = color;
        ctx.fillText(String(str),
                     (x + 0.5) * this.squareSize,
                     (y + 0.7) * this.squareSize);
    }

    render(ctx) {
        var gameStateStr = "";
        if (this.graphics) {
            if (ctx == undefined) {
                console.log("Canvas context is undefined, please pass it into the draw method");
            } else {
                var squareSize = this.squareSize;

                ctx.font = "25px Helvetica";
                ctx.textAlign = "center";
                ctx.strokeStyle = LIGHT;
                ctx.lineWidth = 2;

                ctx.save();
                for (var x = 0; x < this.width; x += 1) {
                    for (var y = 0; y < this.height; y += 1) {
                        var space = this.model[x][y];
                        ctx.strokeRect(x * squareSize,
                                    y * squareSize,
                                    squareSize,
                                    squareSize);
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
                            this.drawSquare(ctx, x, y, GREEN);
                            this.drawText(ctx, x, y, space.getPlayer().health, DARKGREEN);
                        } else if (space.containsEnemy()) {
                            this.drawSquare(ctx, x, y, RED);
                            this.drawText(ctx, x, y, space.getEnemy().health, DARKRED);
                        } else if (space.containsPellet()) {
                            var pellet = space.getPellet();
                            if (pellet instanceof AttackPellet) {
                                this.drawSquare(ctx, x, y, PURPLE);
                            } else if(pellet instanceof HealthPellet) {
                                this.drawSquare(ctx, x, y, BLUE);
                            } else {
                                this.drawSquare(ctx, x, y, YELLOW);
                            }
                        } else {
                            this.drawSquare(ctx, x, y, DARK);
                        }
                    }
                }
                ctx.restore();
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
        gameStateStr += "</br>ENEMIES LEFT: " + this.numEnemies;
        $("#gameText").html(gameStateStr);
    }

    getObservation() {
        var obs = [];
        _.each(this.observationKeys, (key, idx, list) => {
            obs = obs.concat(this.observationLookup[key]());
        });
        return obs;
    }

    encodeSquare(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return GRID_ENCODE_LOOKUP["Invalid"];
        }
        var space = this.model[x][y];
        if (space.isEmpty()) {
            return GRID_ENCODE_LOOKUP["Empty"];
        }

        var encoding = 0;
        if (space.containsPlayer()) {
            encoding = encoding * 10 + GRID_ENCODE_LOOKUP["Player"];
        }
        if (space.containsEnemy()) {
            encoding = encoding * 10 + GRID_ENCODE_LOOKUP["Enemy"];
        }
        if (space.containsPellet()) {
            encoding = encoding * 10 + GRID_ENCODE_LOOKUP[space.getPellet().constructor.name];
        }
        return encoding;
    }

    encodeGrid(tl_x, tl_y, br_x, br_y, flattened = true) {
        if (tl_x >= br_x || tl_y >= br_y) {
            console.log("INVALID TOP LEFT AND BOTTOM RIGHT COORDINATES");
            return [];
        }
        var encoded = [];
        for (var y = tl_y; y <= br_y; y += 1) {
            if (!flattened) {
                encoded.push([]);
            }
            for (var x = tl_x; x <= br_x; x += 1) {
                if (!flattened) {
                    encoded[encoded.length - 1].push(this.encodeSquare(x, y));
                } else {
                    encoded.push(this.encodeSquare(x, y));
                }
            }
        }
        return encoded;
    }

    getReward() {
        // TODO
        return 0;
    }

    getGameState() {
        // var start = performance.now();
        var gameState = {};
        if (this.player.health <= 0) {
            gameState.done = true;
        } else {
            gameState.done = false;
        }
        gameState.reward = this.getReward();
        gameState.observation = this.getObservation();
        // console.log("elapsed: " + (performance.now() - start));
        return gameState;
    }

    spawnPellets() {
        var numPelletsToSpawn = _.random(0, 2);
        var pelletSpawns = _.sample(_.range(this.width * this.height), numPelletsToSpawn);
        _.each(pelletSpawns, (spawnLoc, idx, list) => {
            var pelletX = Math.floor(spawnLoc / this.height);
            var pelletY = spawnLoc % this.height;
            if (this.model[pelletX][pelletY].isEmpty()) {
                var rand = _.random(0, 99);
                var pellet;
                if (rand < 10) {  // 10% chance for AttackPellet
                    pellet = new AttackPellet(this, pelletX, pelletY, this.pelletId);
                } else if (rand < 20) {  // 10% chance for HealthPellet
                    pellet = new HealthPellet(this, pelletX, pelletY, this.pelletId);
                } else {  // 80% chance for regular Pellet
                    pellet = new Pellet(this, pelletX, pelletY, this.pelletId);
                }
                this.pellets[this.pelletId] = pellet;
                this.pelletId += 1;
            }
        });
    }

    step(action) {
        this.spawnPellets();
        this.player.act(action);
        _.each(this.enemies, (enemy, idx, list) => {
            enemy.act();
        });
        return this.getGameState();
    }

    reset() {
        this.numEnemies = this.startingEnemies;
        this.score = 0;

        /* === Initialize environment model === */

        this.model = [];
        for (var x = 0; x < this.width; x += 1) {
            this.model.push([]);
            for (var y = 0; y < this.height; y += 1) {
                this.model[x].push(new Space());
            }
        }

        /* === Spawn player === */

        var midX = Math.floor(this.width / 2);
        var midY = Math.floor(this.height / 2);
        this.player = new Player(this, midX, midY);

        /* === Spawn enemies === */

        this.enemies = [];
        var enemySpawns = _.sample(_.range(this.width * this.height), this.numEnemies);
        _.each(enemySpawns, (el, idx, list) => {
            var enemyX = Math.floor(el / this.height);
            var enemyY = el % this.height;
            this.enemies[idx] = new Enemy(this, enemyX, enemyY, idx);
        });

        /* === Initialize pellets dictionary === */

        this.pellets = {};
        this.pelletId = 0;

        /* === Set up the observation and action spaces === */

        this.observationSpace = {
            'vision': Math.pow(2 * this.player.fov + 1, 2),
            'health': 1,
            'damage': 1,
        }
        this.observationLookup = {
            'vision': () => { return this.player.getVision(); },
            'health': () => { return this.player.getHealth(); },
            'damage': () => { return this.player.getDamage(); },
        }
        this.actionSpace = this.player.validActions.length;

        return this.getObservation();
    }
}