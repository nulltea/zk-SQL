pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template INSERT(c,r) {
    signal input header[c];
    signal input table[r][c];
    signal input tableCommit;

    signal input insertValues[c];
    signal input argsCommit;
    
    signal output newTableCommit;
    signal modified[r+1][c];

    var i;
    var j;

    // Hash arguments
    component argsHasher = Poseidon(c);

    for (i=0;i<c;i++) {
        argsHasher.inputs[i] <== insertValues[i];
    }

    argsHasher.out === argsCommit;


    // Hash table along with header
    component hasher = HashTable(c,r);

    for (i=0;i<c;i++) {
        hasher.header[i] <== header[i];
    }
    for (i=0;i<r;i++) {
        for (j=0;j<c;j++) {
            hasher.table[i][j] <== table[i][j];
        }
    }

    // Check that the table corresponds to commitment
    hasher.out === tableCommit;

    component equalColumn[r][c];
    component equalCell[r][c];
    component filterRow[r];

    for (i=0; i<r; i++) {
        for (j=0; j<c; j++) {
            modified[i][j] <== table[i][j];
        }
    }

    for (j=0; j<c; j++) {
        modified[r][j] <== insertValues[j];
    }

    // Hash table and header again to produce new commitment.
    component newHasher = HashTable(c,r+1);

    for (i=0;i<c;i++) {
        newHasher.header[i] <== header[i];
    }

    for (i=0;i<r+1;i++) {
        for (j=0;j<c;j++) {
            newHasher.table[i][j] <== modified[i][j];
        }
    }

    newTableCommit <== newHasher.out;
}

component main {public [tableCommit, argsCommit]} = INSERT(5, 5);
