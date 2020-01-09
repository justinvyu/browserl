function main() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");

    var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
    var interval = null;

    var width = 13;
    var height = 13;
    var numEnemies = 15;

    $("#start").click((e) => {
        if (interval != null) {
            clearInterval(interval);
        }

        var env = new Environment(width, height, numEnemies);
        canvas.width = env.width * 50;
        canvas.height = env.height * 50;
        env.draw(ctx);

        interval = setInterval(() => {
            var playerAction = _.random(0, 4);
            // console.log(translate[playerAction]);
            var output = env.step(playerAction);
            console.log("# pellets: " + Object.keys(env.pellets).length);
            env.draw(ctx);
            if (output.done) {
                clearInterval(interval);
            }
        }, 50);
    });
}

main();

var testEnv = new Environment(7, 7, 5);
