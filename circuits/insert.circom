pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template INSERT(c,r) {
    signal input header[c];
    signal input table[r][c];
    signal input tableCommit;

    signal input insertRow[c];
    signal output out[r+1][c];
    signal output newTableCommit;

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
        for (j=0; j<c; j++) {
            out[i][j] <== table[i][j];
        }   
    }

    for (j=0; j<c; j++) {
        out[r][j] <== insertRow[j];
    }

    component newHasher = HashTable(c,r+1);

    for (i=0;i<c;i++) {
        newHasher.header[i] <== header[i];
    }

    for (i=0;i<r+1;i++) {
        for (j=0;j<c;j++) {
            newHasher.table[i][j] <== out[i][j];
        }
    }

    newTableCommit <== newHasher.out;
}

component main {public [tableCommit, insertRow]} = INSERT(5, 5);
