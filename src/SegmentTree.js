class SegmentTree {
    constructor(capacity, operation, naturalElement) {
        this.capacity = capacity;
        this.value = Array(2 * capacity).fill(naturalElement);
        this.operation = operation;
    }

    reduceHelper(start, end, node, nodeStart, nodeEnd) {
        if (start == nodeStart && end == nodeEnd) {
            return self.value[node];
        }
        const mid = Math.floor((nodeStart + nodeEnd) / 2);
        if (end <= mid) {
            return this.reduceHelper(start, end, 2 * node, nodeStart, mid);
        } else {
            if (mid + 1 <= start) {
                return this.reduceHelper(start, end, 2 * node + 1, mid + 1, nodeEnd);
            } else {
                return this.operation(this.reduceHelper(start, mid, 2 * node, nodeStart, mid),
                                      this.reduceHelper(mid + 1, end, 2 * node + 1, mid + 1, nodeEnd));
            }
        }
    }

    reduce(start = 0, end = null) {
        if (end == null) {
            end = this.capacity;
        }
        if (end < 0) {
            end += this.capacity;
        }
        end -= 1;
        return this.reduceHelper(start, end, 1, 0, this.capacity - 1);
    }

    set(idx, val) {
        idx += this.capacity;
        this.value[idx] = val;
        idx = Math.floor(idx / 2);
        while (idx >= 1) {
            this.value[idx] = this.operation(this.value[2 * idx],
                                             this.value[2 * idx + 1]);
            idx = Math.floor(idx / 2);
        }
    }

    get(idx) {
        return this.value[this.capacity + idx];
    }
}

class SumSegmentTree extends SegmentTree {
    constructor(capacity) {
        super(capacity, (a, b) => { return a + b }, 0.0);
    }

    sum(start = 0, end = null) {
        return super.reduce(start, end);
    }

    findPrefixSumIdx(prefixSum) {
        idx = 1;
        while (idx < this.capacity) { // while non-leaf
            if (this.value[2 * idx] > prefixSum) {
                idx *= 2;
            } else {
                prefixSum -= this.value[2 * idx];
                idx = 2 * idx + 1;
            }
        }
        return idx - this.capacity;
    }
}

class MinSegmentTree extends SegmentTree {
    constructor(capacity) {
        super(capacity, (a, b) => { return Math.min(a, b) }, Infinity);
    }

    min(start = 0, end = null) {
        return super.reduce(start, end);
    }
}