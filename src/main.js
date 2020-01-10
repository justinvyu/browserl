var env;
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

function main() {
    var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
    var interval = null;

    $("#start").click((e) => {
        if (interval != null) {
            clearInterval(interval);
        }

        var width = parseInt($("#width-input").val());
        var height = parseInt($("#height-input").val());
        var numEnemies = parseInt($("#num-enemies-input").val());

        env = new Environment(width, height, numEnemies);
        canvas.width = env.width * env.squareSize;
        canvas.height = env.height * env.squareSize;
        env.render(ctx);

        interval = setInterval(() => {
            var playerAction = _.random(0, 4);
            // console.log(translate[playerAction]);
            var output = env.step(playerAction);
            console.log(output);
            env.render(ctx);
            if (output.done) {
                console.log(env);
                clearInterval(interval);
            }
        }, 100);
    });

    document.getElementById("start").click();
}

main();