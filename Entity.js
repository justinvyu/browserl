var UP = 0;
var RIGHT = 1;
var DOWN = 2;
var LEFT = 3;
var ATTACK = 4;

class Entity {
    constructor(env, hp, attack, spawnX, spawnY) {
        this.env = env
        this.health = hp; 
        this.attack = attack;

        this.x = spawnX;
        this.y = spawnY;
        this.env.numEntities[this.x][this.y] += 1;

        this.validActions = [UP, RIGHT, DOWN, LEFT, ATTACK];
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
        this.env.numEntities[this.x][this.y] -= 1;
        var loc = this.getPotentialLocation(dx, dy);
        this.x = loc[0];
        this.y = loc[1];
        this.env.numEntities[this.x][this.y] += 1;
    }

    attack(other) {
        other.health -= this.attack;
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
            } else if (action == ATTACK) {
                // Attack the enemy in this position
            }
        } else {
            console.log("Invalid action, must be one of: ", this.validActions);
        }
    }
}

class Player extends Entity {
    constructor(env, spawnX, spawnY) {
        super(env, 50, 1, spawnX, spawnY);
    }
}

class Enemy extends Entity {
    constructor(env, spawnX, spawnY) {
        // var hp = _.random(1, 10);
        // var attack = _.random(1, 5);
        super(env, 5, 2, spawnX, spawnY);
    }

    move(dx, dy) {
        var loc = this.getPotentialLocation(dx, dy);
        if (this.env.numEntities[loc[0]][loc[1]] <= 1) {
            super.move(dx, dy);
        }
    }

    act() {
        super.act(_.random(this.validActions.length - 1));
        if (this.env.player.x == this.x && this.env.player.y == this.y) {
            super.attack(this.env.player);
        }
    }
}