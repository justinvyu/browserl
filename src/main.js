
function main() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(0, 0, 150, 75);

    // Create the game environment
    var env = new Environment(9, 9, 10);
    env.draw();

    var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
    
    var interval = setInterval(() => {
        var playerAction = _.random(0, 4);
        console.log(translate[playerAction]);
        var output = env.step(playerAction);
        env.draw();
        if (output.done) {
            clearInterval(interval);
        }
    }, 100);
}

main();