class ReplayBuffer {
    constructor(size) {
        this.maxSize = size;
        this.buffer = [];
        this.nextIndex = 0;
    }

    add(obs, action, reward, nextObs, done) {
        const data = { obs, action, reward, nextObs, done };
        if (this.nextIndex >= this.buffer.length) {
            this.buffer.push(data);
        } else {
            this.buffer[this.nextIndex] = data;
        }
        this.nextIndex = (this.nextIndex + 1) % this.maxSize;
    }

    sample(batchSize) {
        // Sample without replacement
        var sample = _.sample(this.buffer, batchSize);
        var _obs = [], _act = [], _rew = [], _nextObs = [], _done = [];
        for (var i = 0; i < batchSize; i += 1) {
            const {obs, action, reward, nextObs, done} = sample[i];
            _obs.push(obs);
            _act.push(action);
            _rew.push(reward);
            _nextObs.push(nextObs);
            _done.push(done);
        }
        return {
            'obs': _obs,
            'action': _act,
            'reward': _rew,
            'nextObs': _nextObs,
            'done': _done
        };
    }
}

class EpsilonGreedyPolicy {
    constructor(Q, env, epsilonSchedule) {
        this.Q = Q;
        this.env = env;
        this.epsilonSchedule = epsilonSchedule;
    }

    getAction(obs) {
        // TODO: change this to take in batches of observations
        // Search through all actions and pick the max Q-value
        if (Math.random() < this.epsilonSchedule.getAndAdvance()) {
            return this.env.actionSpace.sample();
        } else {
            // Greedy strategy
            return tf.tidy(() => {
                // Convert input obs into a tensor
                const obs_t = tf.tensor2d(obs, [1].concat(this.env.observationSpace.shape));
                const qVals = this.Q.predict(obs_t);
                // Take argmax along 1st axis
                return tf.argMax(qVals, 1).dataSync()[0];
            });
        }
    }
}

class LinearSchedule {
    constructor(start, end, step) {
        this.eps = start;
        this.end = end;
        this.step = step;
        if (start - end > 0) {
            this.step *= -1;
        }
    }

    getAndAdvance() {
        const old = this.eps;
        if (this.step < 0) {
            this.eps = Math.max(this.end, this.eps + this.step);
        } else {
            this.eps = Math.min(this.end, this.eps + this.step);
        }
        return old;
    }
}

class DeepQLearner {
    /**
     * Returns an object that can be trained for a number of timesteps and
     * can be used to output a policy.
     * @param {Environment} env 
     * @param {*} Q 
     * @param {*} targetQ 
     * @param {float} lr 
     * @param {int} bufferSize 
     * @param {int} trainFreq 
     * @param {int} batchSize 
     * @param {int} learningStarts 
     * @param {float} gamma 
     * @param {int} targetNetworkUpdateFreq 
     */
    constructor(env,
                Q,
                targetQ,
                render = false,
                ctx = null,
                lr = 5e-4,
                bufferSize = 5e4,
                trainFreq = 1,
                batchSize = 32,
                learningStarts = 32,
                gamma = 0.999,
                tau = 0.999,
                targetNetworkUpdateFreq = 500,
                printFreq = 1000) {
        this.env = env;
        this.Q = Q;
        this.targetQ = targetQ;
        this.lr = lr;
        this.bufferSize = bufferSize;
        this.trainFreq = trainFreq;
        this.batchSize = batchSize;
        this.learningStarts = learningStarts;
        this.gamma = gamma;
        this.targetNetworkUpdateFreq = targetNetworkUpdateFreq;
        this.printFreq = printFreq;

        this.timestep = 0;
        this.replayBuffer = new ReplayBuffer(this.bufferSize);
        this.policy = new EpsilonGreedyPolicy(this.Q, this.env, new LinearSchedule(1, 0, 0.0001));
        this.optimizer = tf.train.adam(this.lr);

        this.render = render;
        this.ctx = ctx;

        this.history = [];
        this.lossHistory = [];

        // Target Q only updated via copying from the online Q function
        this.targetQ.trainable = false;
        this.tau = tau;
        this.updateTarget();
    }

    initialExploration() {
        console.log("STARTING INITIAL RANDOM EXPLORATION");
        return new Promise((resolve, reject) => {
            var randAction, currObs;
            if (this.render) {
                const interval = setInterval(() => {
                    randAction = this.env.actionSpace.sample();
                    currObs = this.env.getObservation();
                    const {obs, reward, done} = this.env.step(randAction);
                    this.replayBuffer.add(currObs, randAction, reward, obs, done);
                    this.timestep += 1;
                    this.env.render(this.ctx);
                    // TODO: Make this cleaner
                    if (done) {
                        this.env.reset();
                    }
                    if (this.timestep >= this.learningStarts) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                while (this.timestep < this.learningStarts) {
                    randAction = this.env.actionSpace.sample();
                    currObs = this.env.getObservation();
                    const {obs, reward, done} = this.env.step(randAction);
                    this.replayBuffer.add(currObs, randAction, reward, obs, done);
                    this.timestep += 1;
                    if (done) {
                        this.env.reset();
                    }
                }
                resolve();
            }
        });
    }

    updateTarget() {
        // TODO: Polyak averaging
        tf.tidy(() => {
            for (var i = 0; i < this.targetQ.layers.length; i += 1) {
                // Directly copying weights
                // this.targetQ.layers[i].setWeights(this.Q.layers[i].getWeights());

                // Soft target update
                const weights = this.Q.getWeights();
                const targetWeights = this.targetQ.getWeights();
                for (var j = 0; j < weights.length; j += 1) {
                    targetWeights[j].assign(tf.scalar(this.tau)
                                              .mul(weights[j]).add(tf.scalar(1 - this.tau)
                                                                      .mul(targetWeights[j])));
                }
                // this.targetQ.layers[i].setWeights(
                //     tf.scalar(this.tau)
                //       .mul(this.Q.layers[i].getWeights())
                //       .add(tf.scalar(1 - this.tau)
                //              .mul(this.targetQ.layers[i].getWeights())));
            }
        });
    }

    convertToTensor(batch) {
        const {obs, action, reward, nextObs, done} = batch;
        return {
            'obs': tf.tensor(obs,
                                [this.batchSize].concat(this.env.observationSpace.shape)),
            'action': tf.tensor2d(action,
                                    [this.batchSize].concat(this.env.actionSpace.shape), 'int32'),
            'reward': tf.tensor2d(reward,
                                    [this.batchSize, 1]),
            'nextObs': tf.tensor(nextObs,
                                    [this.batchSize].concat(this.env.observationSpace.shape)),
            'done': tf.tensor2d(done,
                                [this.batchSize, 1], 'bool'),
        }
    }

    trainStep() {
        /* === Policy takes an action === */
        const currObs = this.env.getObservation();
        const action = this.policy.getAction(currObs);
        const {obs, reward, done} = this.env.step(action);

        /* === Add to the replay buffer === */
        this.replayBuffer.add(currObs, action, reward, obs, done);

        /* === Train the Q function every `trainFreq` steps === */
        if (this.timestep % this.trainFreq == 0) {
            const bellmanError = this.optimizer.minimize(() => { return tf.tidy(() => {
                /* === Sample training batch from replay buffer === */
                const trainBatch = this.convertToTensor(this.replayBuffer.sample(this.batchSize));

                /* === Calculate Q(s, a) and Q'(s', a') === */
                const currObsQVals = this.Q.predict(trainBatch.obs);
                const nextObsTargetQVals = this.targetQ.predict(trainBatch.nextObs);

                /* === Calculate Q(s, a) for the actual action taken === */
                // Mask Q with the action taken
                // currObsQVals = batchSize x numActions
                // tf.oneHot(...) = batchSize x numActions
                // Then reduce along the 1st axis (summing over the rows), to get batchSize x 1
                const selectedQ = tf.sum(currObsQVals.mul(
                    tf.oneHot(trainBatch.action, this.env.actionSpace.numActions).reshape(currObsQVals.shape)), 1, true);

                /* === Sample training batch from replay buffer === */
                // Double DQN, y = r + gamma * Q_target(s', argmax_{a'} Q(s', a'))
                // const nextObsQVals = this.Q.predict(trainBatch.nextObs);  // Q-values of s' w.r.t online Q function
                // const acts = tf.argMax(nextObsQVals, 1);                  // Take the argMax to get the best actions
                // const select = tf.oneHot(acts, this.env.actionSpace.numActions);  // Construct select matrix and multiply/reduce as above
                // const maxNextObsQ = tf.sum(nextObsTargetQVals.mul(select), 1, true).mul(tf.scalar(1).sub(trainBatch.done));

                // Regular DQN
                const _maxNextObsQ = tf.max(nextObsTargetQVals, 1, true);
                const maxNextObsQ = _maxNextObsQ.mul(tf.scalar(1).sub(trainBatch.done));

                /* === Calculate Q-learning TD target === */
                const tdTarget = trainBatch.reward.add(tf.scalar(this.gamma).mul(maxNextObsQ));

                /* === Compute loss === */
                const loss = tf.losses.huberLoss(tdTarget, selectedQ);
                return loss;
            }) }, true, this.Q.getWeights());
            // this.lossHistory.push({'x': this.timestep, 'y': bellmanError.dataSync()[0]});
            this.lossHistory.push(bellmanError.dataSync()[0]);
        }

        /* === Update the target Q network === */
        if (this.timestep % this.targetNetworkUpdateFreq == 0) {
            this.updateTarget();
        }

        /* === Reset the environment === */
        if (done) {
            // this.history.push({ x: this.history.length, y: this.env.score });
            this.history.push(this.env.score);
            console.log("Episode Return: " + this.env.score);
            this.env.reset();
        }

        if (this.timestep % this.printFreq == 0) {
            console.log("Timestep #" + this.timestep);
        }

        this.timestep += 1;
    }

    train(numTimesteps) {
        if (this.timestep < this.learningStarts) {
            this.initialExploration().then(() => { this.train(numTimesteps) });
        } else {
            console.log("STARTING TRAINING");
            if (this.render) {
                const startTimestep = this.timestep;
                const interval = setInterval(() => {
                    this.trainStep();
                    this.env.render(this.ctx);
                    if (this.timestep - startTimestep > numTimesteps) {
                        const surface = { name: 'Training Plots', tab: 'Charts' };
                        const dataReturns = { values: [this.history] };
                        tfvis.render.linechart(surface, dataReturns);
                        const dataLosses = { values: [this.lossHistory] };
                        tfvis.render.linechart(surface, dataLosses);
                        clearInterval(interval);
                    }
                }, 25);
            } else {
                for (var step = 0; step < numTimesteps; step += 1) {
                    this.trainStep();
                }
            }
        }
    }
}