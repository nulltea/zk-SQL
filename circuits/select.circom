pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template SELECT(c,r) {
    signal input header[c];
    signal input table[r][c];
    signal input tableCommit;

    // signal input fields[c];
    signal input whereColumn[c];
    signal input whereValues[c];

    signal input results[r][c];

    signal output out[r][c];

    var i;
    var j;
    component hasher = HashTable(c,r);

    for (i=0;i<c;i++) {
        hasher.header[i] <== header[i];
    }

    for (i=0;i<r;i++) {
        for (j=0;j<c;j++) {
            hasher.table[i][j] <== table[i][j];
        }
    }

    hasher.out === tableCommit;

    component equalColumn[r][c];
    component equalCell[r][c];
    component filterRow[r];

    for (i=0; i<r; i++) {
        filterRow[i] = MultiAND(c);

        for (j=0; j<c; j++) {
            equalColumn[i][j] = IsEqual();
            equalColumn[i][j].in[0] <== header[j];
            equalColumn[i][j].in[1] <== whereColumn[j];

            equalCell[i][j] = IsEqual();
            equalCell[i][j].in[0] <== whereValues[j] * equalColumn[i][j].out;
            equalCell[i][j].in[1] <== table[i][j] * equalColumn[i][j].out;
            
            filterRow[i].in[j] <== equalCell[i][j].out;
        }   

        for (j=0; j<c; j++) {
            out[i][j] <== table[i][j] * filterRow[i].out;
            results[i][j] === out[i][j];
        }
    }
}

component main {public [tableCommit, whereColumn, whereValues, results]} = SELECT(5, 5);
