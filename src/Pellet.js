class Pellet {
    constructor(env, spawnX, spawnY, id) {
        // TODO: Abstract the notion of a position in the map as a class/interface
        this.env = env;
        this.x = spawnX;
        this.y = spawnY;
        this.id = id;

        this.env.model[this.x][this.y].add(this);
    }

    actOn(entity) {
        entity.health += 5;
        this.env.model[this.x][this.y].remove(this);
        delete this.env.pellets[this.id];
    }
}