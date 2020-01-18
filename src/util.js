function huberLoss(x, delta = 1.0) {
    return tf.tidy(() => {
        return tf.where(tf.abs(x).less(tf.scalar(delta)),
                        tf.square(x).mul(tf.scalar(0.5)),
                        tf.scalar(delta).mul(tf.abs(x).sub(tf.scalar(0.5 * delta))));
    });
}