var UP = 0;
var RIGHT = 1;
var DOWN = 2;
var LEFT = 3;

class Entity {
    constructor(env, hp, attack, spawnX, spawnY) {
        this.env = env
        this.health = hp; 
        this.attack = attack;

        this.x = spawnX;
        this.y = spawnY;

        this.validActions = [UP, RIGHT, DOWN, LEFT];
    }

    move(dx, dy) {
        if (dx > 0) {
            this.x = Math.min(this.x + dx, this.env.width - 1);
        } else {
            this.x = Math.max(this.x + dx, 0);
        }
        if (dy > 0) {
            this.y = Math.min(this.y + dy, this.env.height - 1);
        } else {
            this.y = Math.max(this.y + dy, 0);
        }
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
            console.log("Invalid aciton, must be one of: ", this.validActions);
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

    act() {
        super.act(_.random(this.validActions.length - 1));
    }
}