pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/mimc.circom";

template HashTable(c,r) {
    signal input header[c];
    signal input table[r][c];

    signal output out;

    var n = c + (c * r);
    component hasher = MultiMiMC7(n, 2);
    hasher.k <== 1;

    var i;
    for (i=0;i<c;i++) {
        hasher.in[i] <== header[i];
    }

    var j;
    for (i=0;i<r;i++) {
        for (j=0;j<c;j++) {
            // nColumns + current_row * nColumns + nCell;
            var idx = c+i*c+j;
            hasher.in[idx] <== table[i][j];
        }
    }

    log(hasher.out);

    out <== hasher.out;
}