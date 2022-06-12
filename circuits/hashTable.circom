pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./utils.circom";


template HashTable(c,r) {
    signal input header[c];
    signal input table[r][c];

    signal output out;

    var n = c + (c * r);

    component preImage = CalculateTotal(n);
    component hasher = Poseidon(1);

    var i;
    for (i=0;i<c;i++) {
        preImage.nums[i] <== header[i];
    }

    var j;
    for (i=0;i<r;i++) {
        for (j=0;j<c;j++) {
            // nColumns + current_row * nColumns + nCell;
            var idx = c+i*c+j;
            preImage.nums[idx] <== table[i][j];
        }
    }

    hasher.inputs[0] <== preImage.sum;

    out <== hasher.out;
}