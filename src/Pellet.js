class Pellet {
    constructor(env, spawnX, spawnY, id) {
        // TODO: Abstract the notion of a position in the map as a class/interface
        this.env = env;
        this.x = spawnX;
        this.y = spawnY;
        this.id = id;

        this.env.model[this.x][this.y].add(this);
    }

    despawn() {
        this.env.model[this.x][this.y].remove(this);
        // console.log("before deleting: " + Object.keys(this.env.pellets).length);
        delete this.env.pellets[this.id];
        // console.log("after deleting: " + Object.keys(this.env.pellets).length);
    }

    actOn(entity) {
        entity.health += 5;
        this.despawn();
    }
}

class AttackPellet extends Pellet {
    constructor(env, spawnX, spawnY, id) {
        super(env, spawnX, spawnY, id);
    }

    actOn(entity) {
        entity.damage += 1;
        super.actOn(entity);
    }
}

class HealthPellet extends Pellet {
    constructor(env, spawnX, spawnY, id) {
        super(env, spawnX, spawnY, id);
    }

    actOn(entity) {
        entity._health += 10;  // Ignores the health cap (overhealing)
        super.despawn();
    }
}