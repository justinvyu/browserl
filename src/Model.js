
function mlp(inputSize, hiddenLayers, outputSize, outputActivation = null, batchInput = false) {
    const model = tf.sequential();
    if (batchInput) {
        model.add(tf.layers.dense(
            {
                batchInputShape: [null, inputSize],
                units: hiddenLayers[0],
                activation: 'relu',
                useBias: true
            }
        ));
    } else {
        model.add(tf.layers.dense({inputShape: [inputSize], units: hiddenLayers[0], activation: 'relu', useBias: true}));
    }
    
    for (var i = 1; i < hiddenLayers.length; i += 1) {
        model.add(tf.layers.dense({units: hiddenLayers[i], activation: 'relu', useBias: true}));
    }
    if (outputActivation != null) {
        model.add(tf.layers.dense({units: [outputSize], activation: outputActivation, useBias: true}));
    } else {
        model.add(tf.layers.dense({units: outputSize, useBias: true}));
    }
    return model;
}