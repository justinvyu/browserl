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
        if (start - end < 0) {
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
                learningStarts = 1000,
                gamma = 1.0,
                targetNetworkUpdateFreq = 500) {
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

        this.timestep = 0;
        this.replayBuffer = new ReplayBuffer(this.bufferSize);
        this.policy = new EpsilonGreedyPolicy(this.Q, this.env, new LinearSchedule(1, 0.1, 0.001));
        this.optimizer = tf.train.adam(this.lr);

        this.render = render;
        this.ctx = ctx;

        this.history = [];

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
                this.targetQ.layers[i].setWeights(this.Q.layers[i].getWeights());
            }
        });
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
            const bellmanError = this.optimizer.minimize(() => {
                // TODO: turn this into a converToTensor function
                // TODO: put this all into one giant tidy
                const trainBatch = tf.tidy(() => {
                    const {obs, action, reward, nextObs, done} = this.replayBuffer.sample(this.batchSize);
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
                });

                // Q
                const currObsQVals = this.Q.predict(trainBatch.obs);
                // target Q of next state
                const nextObsTargetQVals = this.targetQ.predict(trainBatch.nextObs);

                // Mask Q with the action taken
                // currObsQVals = batchSize x numActions
                // tf.oneHot(...) = batchSize x numActions
                // Then reduce along the 1st axis (summing over the rows), to get batchSize x 1
                const selectedQ = tf.tidy(() => {
                    // return tf.sum(currObsQVals.mul(tf.oneHot(trainBatch.action, this.env.actionSpace.numActions)), 1);
                    return tf.sum(currObsQVals.mul(
                        tf.oneHot(trainBatch.action,
                                  this.env.actionSpace.numActions).reshape(currObsQVals.shape)), 1, true);
                });

                // Take max of Q in next state, want batchSize x 1
                const maxNextObsQ = tf.tidy(() => {
                    const _maxNextObsQ = tf.max(nextObsTargetQVals, 1, true);
                    return _maxNextObsQ.mul(tf.scalar(1).sub(trainBatch.done));
                });

                // Q(s, a) = r(s, a) + gamma * max_a' Q_target(s', a')
                const tdTarget = tf.tidy(() => {
                    return trainBatch.reward.add(tf.scalar(this.gamma).mul(maxNextObsQ));
                });

                // Compute TD error
                const loss = tf.losses.huberLoss(tdTarget, selectedQ);
                return loss;
            }, true); // do I need to add the varList? how to get that?
            // lossHistory.push({'x': this.timestep, 'y': bellmanError.dataSync()[0]});
        }

        /* === Update the target Q network === */
        if (this.timestep % this.targetNetworkUpdateFreq == 0) {
            this.updateTarget();
        }

        /* === Reset the environment === */
        if (done) {
            this.history.push({ x: this.history.length, y: this.env.score });
            console.log("Episode Return: " + this.env.score);
            this.env.reset();
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
                        const surface = { name: 'Return per episode', tab: 'Charts' };
                        const data = { values: [this.history] };
                        tfvis.render.linechart(surface, data);
                        clearInterval(interval);
                    }
                }, 50);
            } else {
                const lossHistory = [];
                for (var step = 0; step < numTimesteps; step += 1) {
                    this.trainStep();
                }
            }
        }
    }
}