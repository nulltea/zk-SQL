pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/binsum.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

// This circuit returns the sum of the inputs.
// n must be greater than 0.
template CalculateTotal(n) {
    signal input nums[n];
    signal output sum;

    signal sums[n];
    sums[0] <== nums[0];

    for (var i=1; i < n; i++) {
        sums[i] <== sums[i - 1] + nums[i];
    }

    sum <== sums[n - 1];
}

// This circuit returns the sum of the inputs.
// n must be greater than 0.
template SumEquals(n) {
    signal input nums[n];
    signal input sum;
    signal output out;

    signal sums[n];
    sums[0] <== nums[0];

    for (var i=1; i < n; i++) {
        sums[i] <== sums[i - 1] + nums[i];
    }

    component isEqual = IsEqual();

    isEqual.in[0] <== sums[n - 1];
    isEqual.in[1] <== sum;

    out <== isEqual.out;
}

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

template IsNotZero() {
    signal input in;
    signal output out;

    component inv = IsZero();
    component not = NOT();

    inv.in <== in;
    not.in <== inv.out;

    out <== not.out;
}

template MultiOR(n) {
    signal input in[n];
    signal output out;
    component total;
    component or;
    if (n==1) {
        out <== in[0];
    } else {
        total = CalculateTotal(n);
        or = IsNotZero();
        for (var i=0;i<n;i++) {
            total.nums[i] <== in[i];
        }

        or.in <== total.sum;
        out <== or.out;
    }
}

template IsFiltered() {
    signal input in[2];
    signal input op;
    signal output out;

    component eq = IsEqual();
    component isEq = IsEqual();
    eq.in[0] <== in[0];
    eq.in[1] <== in[1];
    isEq.in[0] <== op;
    isEq.in[1] <== 0;

    component ne = NOT();
    component isNe = IsEqual();
    ne.in <== eq.out;
    isNe.in[0] <== op;
    isNe.in[1] <== 1;

    // component lt = LessThan(32);
    // component isLt = IsEqual();
    // lt.in[0] <== in[0];
    // lt.in[1] <== in[1];
    // isLt.in[0] <== op;
    // isLt.in[1] <== 2;

    // component gt = GreaterThan(32);
    // component isGt = IsEqual();
    // gt.in[0] <== in[0];
    // gt.in[1] <== in[1];
    // isGt.in[0] <== op;
    // isGt.in[1] <== 3;

    // component lte = LessEqThan(32);
    // component isLte = IsEqual();
    // lte.in[0] <== in[0];
    // lte.in[1] <== in[1];
    // isLte.in[0] <== op;
    // isLte.in[1] <== 4;

    // component gte = GreaterEqThan(32);
    // component isGte = IsEqual();
    // gte.in[0] <== in[0];
    // gte.in[1] <== in[1];
    // isGte.in[0] <== op;
    // isGte.in[1] <== 5;

    component res = CalculateTotal(2);
    res.nums[0] <== eq.out * isEq.out;
    res.nums[1] <== ne.out * isNe.out;
    // res.nums[2] <== lt.out * isLt.out;
    // res.nums[3] <== gt.out * isGt.out;
    // res.nums[4] <== lte.out * isLte.out;
    // res.nums[5] <== gte.out * isGte.out;

    out <== res.sum;
}