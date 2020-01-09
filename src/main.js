
function main() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");

    var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
    var interval = null;

    var width = 7;
    var height = 7;
    var numEnemies = 5;

    $("#start").click((e) => {
        if (interval != null) {
            clearInterval(interval);
        }

        var env = new Environment(width, height, numEnemies);
        canvas.width = env.width * 50;
        canvas.height = env.height * 50;
        env.draw(ctx);

        interval = setInterval(() => {
            console.log(env.model);
            var playerAction = _.random(0, 4);
            console.log(translate[playerAction]);
            var output = env.step(playerAction);
            env.draw(ctx);
            if (output.done) {
                clearInterval(interval);
            }
        }, 100);
    });
}

main();