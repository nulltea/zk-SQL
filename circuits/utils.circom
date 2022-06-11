pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/binsum.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

// template RowIndexOrLast(r) {
//     signal input rowIndex;
//     signal input condintion;

//     signal output out;

//     out <== rowIndex * condintion + (r - 1) * (1 - condintion)
// }

template IsEqualWord(n) {
    signal input word[n];
    signal input test[n];
    signal output out;

    component isEqual[n + 1];
    component sum = MultiSum(32, n);

    var i;
    for (i=0;i<n;i++) {
        isEqual[i] = IsEqual();
        isEqual[i].in[0] <== word[i];
        isEqual[i].in[1] <== test[i];
        sum.in[i] <== isEqual[i].out;
    }

    isEqual[n] = IsEqual();
    isEqual[n].in[0] <== sum.out;
    isEqual[n].in[1] <== n;

    out <== isEqual[n].out;
}

template MultiSum(n, nops) {
    signal input in[nops];
    signal output out;

    component n2b[nops];
    component sum = BinSum(n,nops);
    component b2n = Bits2Num(n);

    var i;
    var j;
    for (i=0; i<nops; i++) {
        n2b[i] = Num2Bits(n);
        n2b[i].in <== in[i];

        for (j=0; j<n; j++) {
            sum.in[i][j] <== n2b[i].out[j];
        }
    }

    for (i=0; i<n; i++) {
        b2n.in[i] <== sum.out[i];
    }

    out <== b2n.out;
}

