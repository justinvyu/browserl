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
        if (typeof(entity) != "object" || 
            !(entity instanceof Entity || entity instanceof Pellet)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        var className = entity.constructor.name;
        if (className.includes("Pellet")) {
            className = "Pellet";
        }
        if (this.contents[className] != null) {
            // console.log(className + " already exists in this space");
            return false;
        }
        this.contents[className] = entity;
        return true;
    }

    remove(entity) {
        // Returns True if successfully removed, false if an invalid entity passed in
        // or if there does not exist an entity of that type
        if (typeof(entity) != "object" || 
            !(entity instanceof Entity || entity instanceof Pellet)) {
            console.log("Must pass in an object of the type Player, Enemy, or Pellet");
            return false;
        }
        var className = entity.constructor.name;
        if (className.includes("Pellet")) {
            className = "Pellet";
        }
        if (this.contents[className] == null) {
            // console.log(className + " does not exist in this space");
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
                // observationKeys = ["vision", "health", "damage", "x", "y"],
                observationKeys = ["x", "y"],
                graphics = true) {
        this.width = width;
        this.height = height;

        // JUST TO MAKE THE ENVIRONMENT SIMPLER === START
        // numEnemies = 15;
        // this.enemySpawns = [55, 110, 3, 80, 1, 64, 7, 36, 95, 35, 28, 24, 81, 76, 114];
        // this.pelletSpawns = [
        //     {x: 5, y: 10, type: 'Pellet'},
        //     {x: 2, y: 1, type: 'Pellet'},
        //     {x: 10, y: 5, type: 'Pellet'},
        //     {x: 1, y: 8, type: 'Pellet'},
        //     {x: 1, y: 1, type: 'Pellet'},
        //     {x: 7, y: 1, type: 'Pellet'},
        //     {x: 1, y: 6, type: 'Pellet'},
        //     {x: 2, y: 7, type: 'Pellet'},
        //     {x: 5, y: 2, type: 'Pellet'},
        //     {x: 9, y: 0, type: 'Pellet'},
        //     {x: 5, y: 3, type: 'Pellet'},
        // ];

        numEnemies = 2;
        this.enemySpawns = [5, 6];
        this.pelletSpawns = [
            {x: 2, y: 2, type: 'Pellet'},
        ];
        // JUST TO MAKE THE ENVIRONMENT SIMPLER === END

        this.startingEnemies = numEnemies;

        this.graphics = graphics;
        this.squareSize = 50;

        // This determines which observation keys are concatenated together when calling `getObservation`
        this.observationKeys = observationKeys;

        this.reset();
    }

    drawSquare(ctx, x, y, color, width = this.squareSize, height = this.squareSize) {
        ctx.fillStyle = color;
        ctx.fillRect(x * this.squareSize,
                     y * this.squareSize,
                     width, height);
    }

    drawText(ctx, x, y, str, color, font = "25px Helvetica",
             offsetX = 0.5 * this.squareSize, offsetY = 0.7 * this.squareSize) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(String(str),
                     (x * this.squareSize + offsetX),
                     (y * this.squareSize + offsetY));
    }

    inPlayerFOV(x, y) {
        return x >= this.player.x - this.player.fov && x <= this.player.x + this.player.fov &&
               y >= this.player.y - this.player.fov && y <= this.player.y + this.player.fov;
    }

    render(ctx) {
        var gameStateStr = "";
        if (this.graphics) {
            if (ctx == undefined) {
                console.log("Canvas context is undefined, please pass it into the draw method");
            } else {
                var squareSize = this.squareSize;

                ctx.textAlign = "center";
                ctx.strokeStyle = LIGHT;
                ctx.lineWidth = 2;

                ctx.save();
                for (var x = 0; x < this.width; x += 1) {
                    for (var y = 0; y < this.height; y += 1) {
                        var space = this.model[x][y];

                        // Draw the border
                        ctx.strokeRect(x * squareSize,
                                    y * squareSize,
                                    squareSize,
                                    squareSize);

                        if (space.containsPlayer() && space.containsEnemy()) {
                            this.drawSquare(ctx, x, y, GREEN, squareSize / 2, squareSize / 2);
                            this.drawSquare(ctx, x + 0.5, y + 0.5, RED, squareSize / 2, squareSize / 2);
                            this.drawSquare(ctx, x + 0.5, y, DARK, squareSize / 2, squareSize / 2);
                            this.drawSquare(ctx, x, y + 0.5, DARK, squareSize / 2, squareSize / 2);
                            this.drawText(ctx, x, y, space.getPlayer().health, DARK,
                                          "16px Helvetica", squareSize / 4, squareSize / 3);
                            this.drawText(ctx, x + 0.5, y + 0.5, space.getEnemy().health, DARK,
                                          "16px Helvetica", squareSize / 4, squareSize / 3);
                        } else if (space.containsPlayer()) {
                            this.drawSquare(ctx, x, y, GREEN);
                            this.drawText(ctx, x, y, space.getPlayer().health, DARK);
                        } else if (space.containsEnemy()) {
                            this.drawSquare(ctx, x, y, RED);
                            this.drawText(ctx, x, y, space.getEnemy().health, DARK);
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

                        if (this.inPlayerFOV(x, y) && !space.containsPlayer()) {
                            this.drawSquare(ctx, x, y, "rgba(236, 240, 241, 0.1)");
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
        var reward;
        if (this.player.isDead()) {
            // reward = -100;
            // reward = 1;
            reward = 0;
        } else if (this.player.killedEnemy) {
            reward = 2;
        } else if (this.player.atePellet) {
            reward = 5;
        } else if (this.model[this.player.x][this.player.y].containsEnemy()) {
            reward = -1;
        } else {
            reward = 0;
        }
        return reward;
    }

    getGameState() {
        // var start = performance.now();
        var gameState = {};
        // if (this.player.health <= 0) {
        //     gameState.done = true;
        // } else {
        //     gameState.done = false;
        // }
        gameState.reward = this.getReward();
        gameState.done = (gameState.reward == 5 || gameState.reward == -1 || this.player.health <= 0);
        gameState.obs = this.getObservation();
        // console.log("elapsed: " + (performance.now() - start));
        return gameState;
    }

    spawnPellets() {
        var numPelletsToSpawn = _.random(0, 1);
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
        // this.spawnPellets();
        this.player.act(action);
        _.each(this.enemies, (enemy, idx, list) => {
            enemy.act();
        });
        this.score += this.getReward();
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

        // var midX = Math.floor(this.width / 2);
        // var midY = Math.floor(this.height / 2);
        // const randX = _.random(this.width - 1);
        // const randY = _.random(this.height - 1);
        this.player = new Player(this, 0, 0);

        /* === Spawn enemies === */

        this.enemies = [];
        if (this.enemySpawns == undefined) {
            this.enemySpawns = _.sample(_.range(this.width * this.height), this.numEnemies);
        } 
        _.each(this.enemySpawns, (el, idx, list) => {
            var enemyX = Math.floor(el / this.height);
            var enemyY = el % this.height;
            this.enemies[idx] = new Enemy(this, enemyX, enemyY, idx);
        });

        /* === Initialize pellets dictionary === */

        this.pellets = {};
        this.pelletId = 0;

        // JUST TO MAKE THE ENVIRONMENT SIMPLER === START
        for (var i = 0; i < this.pelletSpawns.length; i += 1) {
            const {x, y, type} = this.pelletSpawns[i];
            this.pellets[this.pelletId] = new Pellet(this, x, y, this.pelletId);
            this.pelletId += 1;
        }
        // JUST TO MAKE THE ENVIRONMENT SIMPLER === END

        /* === Set up the observation and action spaces === */

        // this.observationShapes = {
        //     'vision': Math.pow(2 * this.player.fov + 1, 2),
        //     'health': 1,
        //     'damage': 1,
        // }
        this.observationSpace = {
            // 'shape': [Math.pow(2 * this.player.fov + 1, 2) + 1 + 1],  // Player FOV
            // 'shape': [this.width * this.height + 1 + 1 + 1 + 1],      // Full game state
            'shape': [2],
        }
        this.observationLookup = {
            // 'vision': () => { return this.player.getVision(); },
            'vision': () => { return this.encodeGrid(0, 0, this.width - 1, this.height - 1); },
            'health': () => { return this.player.getHealth(); },
            'damage': () => { return this.player.getDamage(); },
            'x': () => { return this.player.x; },
            'y': () => { return this.player.y; },
        }
        this.actionSpace = {
            'numActions': this.player.validActions.length,
            'shape': [1],
            'sample': () => { return _.random(this.player.validActions.length - 1); }
        }

        return this.getObservation();
    }
}