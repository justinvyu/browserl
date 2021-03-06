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
    constructor(start, end, numSteps) {
        this.val = start;
        this.end = end;
        this.numSteps = numSteps;
        this.step = (end - start) / numSteps;
    }

    getAndAdvance() {
        const old = this.val;
        if (this.step < 0) {
            this.val = Math.max(this.end, this.val + this.step);
        } else {
            this.val = Math.min(this.end, this.val + this.step);
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
                prioritizedReplay = true,
                prioritizedReplayAlpha = 0.6,
                prioritizedReplayBeta0 = 0.4,
                prioritizedReplayBetaIters = 1e4,
                prioritizedReplayEps = 1e-6,
                trainFreq = 1,
                batchSize = 32,
                learningStarts = 1000,
                gamma = 0.999,
                tau = 0.999,
                targetNetworkUpdateFreq = 500,
                printFreq = 1000) {
        this.env = env;
        this.Q = Q;
        this.targetQ = targetQ;
        this.lr = lr;
        this.bufferSize = bufferSize;

        this.prioritizedReplay = prioritizedReplay;
        this.prioritizedReplayAlpha = prioritizedReplayAlpha;
        this.prioritizedReplayEps = prioritizedReplayEps;

        this.trainFreq = trainFreq;
        this.batchSize = batchSize;
        this.learningStarts = learningStarts;
        this.gamma = gamma;
        this.targetNetworkUpdateFreq = targetNetworkUpdateFreq;
        this.printFreq = printFreq;

        this.timestep = 0;

        if (this.prioritizedReplay) {
            this.replayBuffer = new PrioritizedReplayBuffer(this.bufferSize, this.prioritizedReplayAlpha);
            this.betaSchedule = new LinearSchedule(prioritizedReplayBeta0, 1.0, prioritizedReplayBetaIters);

        } else {
            this.replayBuffer = new ReplayBuffer(this.bufferSize);
            this.betaSchedule = null;
        }

        this.policy = new EpsilonGreedyPolicy(this.Q, this.env, new LinearSchedule(1, 0, 1e4));
        this.optimizer = tf.train.adam(this.lr);

        this.render = render;
        this.ctx = ctx;

        this.history = [];
        this.lossHistory = [];

        // Target Q only updated via copying from the online Q function
        this.targetQ.trainable = false;
        this.tau = tau;
        this.updateTarget(1); // Start with equal weights
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

    updateTarget(tau) {
        // TODO: Polyak averaging
        tf.tidy(() => {
            for (var i = 0; i < this.targetQ.layers.length; i += 1) {
                // Directly copying weights
                // this.targetQ.layers[i].setWeights(this.Q.layers[i].getWeights());

                // Soft target update
                const weights = this.Q.getWeights();
                const targetWeights = this.targetQ.getWeights();
                for (var j = 0; j < weights.length; j += 1) {
                    targetWeights[j].assign(tf.scalar(tau)
                                              .mul(weights[j]).add(tf.scalar(1 - tau)
                                                                      .mul(targetWeights[j])));
                }
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

    trainStep(stopGradient = false) {
        /* === Policy takes an action === */
        const currObs = this.env.getObservation();
        const action = this.policy.getAction(currObs);
        const {obs, reward, done} = this.env.step(action);

        /* === Add to the replay buffer === */
        this.replayBuffer.add(currObs, action, reward, obs, done);

        /* === Train the Q function every `trainFreq` steps === */
        if (this.timestep % this.trainFreq == 0) {
            // const {values, grads} = tf.variableGrads(() => { return tf.tidy(() => {
            const bellmanError = this.optimizer.minimize(() => { return tf.tidy(() => {
                /* === Sample training batch from replay buffer === */
                var trainBatch, importanceWeights, batchIdxes;
                if (this.prioritizedReplay) {
                    const {batch, weights, idxes} = this.replayBuffer.sample(this.batchSize, this.betaSchedule.getAndAdvance());
                    trainBatch = this.convertToTensor(batch);
                    batchIdxes = idxes;
                    importanceWeights = tf.tensor(weights, [this.batchSize, 1]);
                } else {
                    trainBatch = this.convertToTensor(this.replayBuffer.sample(this.batchSize));
                    importanceWeights = tf.ones([this.batchSize, 1]);
                }

                /* === Calculate Q(s, a) and Q'(s', a') === */
                const currObsQVals = this.Q.predict(trainBatch.obs);
                const nextObsTargetQVals = this.targetQ.predict(trainBatch.nextObs);

                /* === Calculate Q(s, a) for the actual action taken === */
                // Mask Q with the action taken
                // currObsQVals = batchSize x numActions
                // tf.oneHot(...) = batchSize x numActions
                // Then reduce along the 1st axis (summing over the rows), to get batchSize x 1
                const selectedQ = tf.sum(currObsQVals.mul(
                    tf.oneHot(trainBatch.action, this.env.actionSpace.numActions)
                      .reshape(currObsQVals.shape)), 1, true);

                /* === Sample training batch from replay buffer === */
                // Double DQN, y = r + gamma * Q_target(s', argmax_{a'} Q(s', a'))
                const nextObsQVals = this.Q.predict(trainBatch.nextObs);  // Q-values of s' w.r.t online Q function
                const acts = tf.argMax(nextObsQVals, 1);                  // Take the argMax to get the best actions
                const select = tf.oneHot(acts, this.env.actionSpace.numActions);  // Construct select matrix and multiply/reduce as above
                const _maxNextObsQ = tf.sum(nextObsTargetQVals.mul(select), 1, true).mul(tf.scalar(1).sub(trainBatch.done));
                // Hacky way to do stop gradient, since the target shouldn't affect the gradient
                const maxNextObsQ = tf.tensor2d(_maxNextObsQ.dataSync(), _maxNextObsQ.shape);
                
                // Regular DQN
                // const _maxNextObsQ = tf.max(nextObsTargetQVals, 1, true);
                // const maxNextObsQ = _maxNextObsQ.mul(tf.scalar(1).sub(trainBatch.done));

                /* === Calculate Q-learning TD target === */
                const tdTarget = trainBatch.reward.add(tf.scalar(this.gamma).mul(maxNextObsQ));
                const tdError = selectedQ.sub(tdTarget);

                /* === Compute loss === */
                const loss = tf.losses.huberLoss(tdTarget, selectedQ, importanceWeights);

                // const errors = huberLoss(tdError);
                // errors.print();
                // const loss = errors.mul(importanceWeights).mean();
                // loss.print();

                if (this.prioritizedReplay) {
                    const newPriorities = tf.abs(tdError).add(this.prioritizedReplayEps);
                    this.replayBuffer.updatePriorities(batchIdxes, newPriorities.dataSync());
                }
                
                return loss;
            }) }, true, this.Q.getWeights());
            // })});
            // Object.keys(grads).forEach(varName => grads[varName].print());

            // this.lossHistory.push({'x': this.timestep, 'y': bellmanError.dataSync()[0]});
            this.lossHistory.push(bellmanError.dataSync()[0]);
        }

        /* === Update the target Q network === */
        if (this.timestep % this.targetNetworkUpdateFreq == 0) {
            this.updateTarget(this.tau);
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
                        const dataReturns = { values: [{x: _.range(this.history.length), y: this.history}] };
                        tfvis.render.linechart(surface, dataReturns);
                        const dataLosses = { values: [{x: _.range(this.lossHistory.length), y: this.lossHistory}] };
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