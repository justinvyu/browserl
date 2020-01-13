var UP = 0;
var RIGHT = 1;
var DOWN = 2;
var LEFT = 3;
var ATTACK = 4;

class Entity {
    constructor(env, hp, damage, spawnX, spawnY) {
        this.env = env
        this._health = hp;
        this.maxHealth = hp;

        this.damage = damage;

        this.x = spawnX;
        this.y = spawnY;

        this.env.model[this.x][this.y].add(this);
        this.validActions = [UP, RIGHT, DOWN, LEFT, ATTACK];
    }

    get health() {
        return this._health;
    }

    set health(value) {
        if (this._health > this.maxHealth && value < this._health) {
            this._health = value;
        } else {
            this._health = Math.max(Math.min(this.maxHealth, value), 0);
        }
    }

    getHealth() {
        return this.health;
    }

    getDamage() {
        return this.damage;
    }

    getVision() {
        return this.env.encodeGrid(this.x - this.fov,
                                   this.y - this.fov,
                                   this.x + this.fov,
                                   this.y + this.fov);
    }

    getPotentialLocation(dx, dy) {
        var x, y;
        if (dx > 0) {
            x = Math.min(this.x + dx, this.env.width - 1);
        } else {
            x = Math.max(this.x + dx, 0);
        }
        if (dy > 0) {
            y = Math.min(this.y + dy, this.env.height - 1);
        } else {
            y = Math.max(this.y + dy, 0);
        }
        return [x, y];
    }

    move(dx, dy) {
        // TODO: Fix this to not allow 2 entities to move into the same square
        var loc = this.getPotentialLocation(dx, dy);
        var newX = loc[0];
        var newY = loc[1];
        // Try adding to the new location, if it's possible to move there, then
        // remove from the current Space and update the (x, y) coordinate.
        if (this.env.model[newX][newY].add(this)) {
            this.env.model[this.x][this.y].remove(this);
            this.x = newX;
            this.y = newY;
        }
    }

    isDead() {
        return this.health <= 0;
    }

    /**
     * Returns true if other entity dies from the attack, false otherwise.
     * @param {Entity} other 
     */
    attack(other) {
        other.health -= this.damage;
        return other.isDead();
    }

    eat(pellet) {
        pellet.actOn(this);
    }
    
    isValidAction(action) {
        return this.validActions.includes(action);
    }

    act(action) {
        if (this.isValidAction(action)) {
            if (action == UP) {
                this.move(0, -1);
            } else if (action == RIGHT) {
                this.move(1, 0);
            } else if (action == DOWN) {
                this.move(0, 1);
            } else if (action == LEFT) {
                this.move(-1, 0);
            } 
        } else {
            console.log("Invalid action, must be one of: ", this.validActions);
        }
    }
}

class Player extends Entity {
    constructor(env, spawnX, spawnY, fov = 2) {
        super(env, 50, 1, spawnX, spawnY);
        this.fov = fov;  // Number of squares away that can be seen, centered at the player
        this.killedEnemy = false;  // Indicator if the player killed an enemy this turn.
    }

    act(action) {
        if (action == ATTACK) {
            // Attack the enemy in this position
            if (this.env.model[this.x][this.y].containsEnemy()) {
                this.killedEnemy = this.attack(this.env.model[this.x][this.y].getEnemy());
            }
        } else {
            super.act(action);
            this.killedEnemy = false;
        }
        // Possible or a pellet to spawn after the player acts? When should pellet spawning happen?
        if (this.env.model[this.x][this.y].containsPellet()) {
            super.eat(this.env.model[this.x][this.y].getPellet());
        } else {
            this.health -= 1;
        }
    }
}

class Enemy extends Entity {
    constructor(env, spawnX, spawnY, id) {
        super(env, 5, 1, spawnX, spawnY);
        this.id = id;
        this.deathTrigger = false;
        this.validActions = [ATTACK];  // Do this to simplify the environment
    }

    act() {
        if (!super.isDead()) {
            // TODO: add player tracking / random actions mixed
            // super.act(_.random(this.validActions.length - 1));
            super.act(_.sample(this.validActions));
            if (this.env.model[this.x][this.y].containsPlayer()) {
                // console.log("Attacking player: " + this.env.player.health);
                super.attack(this.env.model[this.x][this.y].getPlayer());
                // console.log("New health: " + this.env.player.health);
            }
            if (this.env.model[this.x][this.y].containsPellet()) {
                super.eat(this.env.model[this.x][this.y].getPellet());
            }
        } else if (!this.deathTrigger) {
            this.env.model[this.x][this.y].remove(this);
            this.x = -1;
            this.y = -1;
            this.env.numEnemies -= 1;
            this.deathTrigger = true;
        }
    }
}