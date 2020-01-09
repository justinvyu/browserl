class Pellet {
    constructor(env, spawnX, spawnY) {
        // TODO: Abstract the notion of a position in the map as a class/interface
        this.env = env;
        this.x = spawnX;
        this.y = spawnY;

        this.env.model[this.x][this.y].add(this);
    }
}