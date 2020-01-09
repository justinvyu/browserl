
function main() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(0, 0, 150, 75);

    var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
    var interval = null;

    $("#start").click((e) => {
        if (interval != null) {
            clearInterval(interval);
        }

        var env = new Environment(11, 11, 10);
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