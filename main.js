
function main() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FF0000";
    // ctx.fillRect(0, 0, 150, 75);

    // Create the game environment
    var env = new Environment(7, 7, 3);
    env.draw();
    
    setInterval(() => {
        env.step(_.random(0, 3));
        env.draw();
    }, 500);
}

main();