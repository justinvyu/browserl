var env;
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

// function main() {
//     var translate = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'ATTACK'];
//     var interval = null;

//     $("#start").click(e => {
//         console.log("start");
//         if (interval != null) {
//             clearInterval(interval);
//         }

//         var width = parseInt($("#width-input").val());
//         var height = parseInt($("#height-input").val());
//         var numEnemies = parseInt($("#num-enemies-input").val());
//         var keyboardControl = $('#keyboard-input').is(':checked');

//         env = new Environment(width, height, numEnemies);
//         canvas.width = env.width * env.squareSize;
//         canvas.height = env.height * env.squareSize;
//         env.render(ctx);

//         if (keyboardControl) {
//             $(document).keydown(e => {
//                 if (e.keyCode == 32) {
//                     e.preventDefault();
//                 }
//                 var keyCode = e.keyCode;
//                 var action;
//                 if (keyCode == 37) {
//                     action = 3;
//                 } else if (keyCode == 38) {
//                     action = 0;
//                 } else if (keyCode == 39) {
//                     action = 1;
//                 } else if (keyCode == 40) {
//                     action = 2;
//                 } else if (keyCode == 32) {
//                     action = 4; 
//                 } else {
//                     action = _.random(0, 4);
//                 }
//                 var output = env.step(action);
//                 console.log(output);
//                 env.render(ctx);
//                 if (output.done) {
//                     console.log(env);
//                     $(document).off("keydown");
//                 }
//             });
//         } else {
//             interval = setInterval(() => {
//                 var playerAction = _.random(0, 4);
//                 // console.log(translate[playerAction]);
//                 var output = env.step(playerAction);
//                 console.log(output);
//                 env.render(ctx);
//                 if (output.done) {
//                     console.log(env);
//                     clearInterval(interval);
//                 }
//             }, 100);
//         }
//     });

//     document.getElementById("start").click();
// }

// main();

env = new Environment(3, 3, 2);

canvas.width = env.width * env.squareSize;
canvas.height = env.height * env.squareSize;
env.render(ctx);

const Q = mlp(env.observationSpace.shape[0], [50, 50], env.actionSpace.numActions);
const targetQ = mlp(env.observationSpace.shape[0], [50, 50], env.actionSpace.numActions);
const dqn = new DeepQLearner(env, Q, targetQ, true, ctx);
// const dqn = new DeepQLearner(env, Q, targetQ);

$("#start").click(e => {
    dqn.train(5000);
});