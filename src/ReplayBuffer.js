class ReplayBuffer {
    constructor(size) {
        this.capacity = size;
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
        this.nextIndex = (this.nextIndex + 1) % this.capacity;
    }

    encodeSample(idxes) {
        var _obs = [], _act = [], _rew = [], _nextObs = [], _done = [];
        for (var i = 0; i < idxes.length; i += 1) {
            const {obs, action, reward, nextObs, done} = this.buffer[idxes[i]];
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

    sample(batchSize) {
        // Sample without replacement
        var idxes = _.sample(_.range(this.buffer.length - 1), batchSize);
        return this.encodeSample(idxes);
    }
}

class PrioritizedReplayBuffer extends ReplayBuffer {
    constructor(size, alpha) {
        super(size);
        this.alpha = alpha;
        
        var treeCapacity = 1
        while (treeCapacity < size) {
            treeCapacity *= 2;
        }

        this.sumTree = new SumSegmentTree(treeCapacity);
        this.minTree = new MinSegmentTree(treeCapacity);
        this.maxPriority = 1.0;
    }

    add(obs, action, reward, nextObs, done) {
        const idx = this.nextIndex;
        super.add(obs, action, reward, nextObs, done);
        this.sumTree.set(idx, Math.pow(this.maxPriority, this.alpha));
        this.minTree.set(idx, Math.pow(this.maxPriority, this.alpha));
    }

    sampleProportional(batchSize) {
        const reservoir = [];
        const pTotal = this.sumTree.sum(0, this.buffer.length - 1);
        const everyRangeLen = pTotal / batchSize; 
        var mass, idx;
        for (var i = 0; i < batchSize; i += 1) {
            mass = Math.random() * everyRangeLen + i * everyRangeLen;
            idx = this.sumTree.findPrefixSumIdx(mass);
            reservoir.push(idx);
        }
        return reservoir;
    }

    sample(batchSize, beta) {
        const idxes = this.sampleProportional(batchSize);

        const weights = [];
        const total = this.sumTree.sum();
        const pMin = this.minTree.min() / total;
        const maxWeight = Math.pow((pMin * this.buffer.length), -beta);
        var pSample, weight, idx;
        for (var i = 0; i < idxes.length; i += 1) {
            idx = idxes[i];
            pSample = this.sumTree.get(idx) / total;
            weight = Math.pow((pSample * this.buffer.length), -beta);
            weights.push(weight / maxWeight);
        }

        const batch = super.encodeSample(idxes);
        return {
            batch, weights, idxes
        };
    }

    updatePriorities(idxes, priorities) {
        // Both need to be the same length
        var idx, priority;
        for (var i = 0; i < idxes.length; i += 1) {
            idx = idxes[i];
            priority = priorities[i];
            this.sumTree.set(idx, Math.pow(priority, this.alpha));
            this.minTree.set(idx, Math.pow(priority, this.alpha));
            this.maxPriority = Math.max(this.maxPriority, priority);
        }
    }
}