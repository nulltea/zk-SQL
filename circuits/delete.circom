pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template DELETE(c,r) {
    signal input header[c];
    signal input table[r][c];
    signal input tableCommit;

    // signal input fields[c];
    signal input whereColumn[c];
    signal input whereValues[c];

    signal output newTableCommit;
    signal output out[r][c];

    var i;
    var j;

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

    // Check that the table corresponds to the commitment
    hasher.out === tableCommit;

    component equalColumn[r][c];
    component equalCell[r][c];
    component filterRow[r];
    component rowsToDelete[r];

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

        // TODO: find a way to skip rows without "Non-quadratic constraint"
        // if (filterRow[i].out == 1) {
        //     rowIdx++;
        // }
        // out[rowIdx][j] <== this won't work
        //
        // It might be possible to do something like `QuinSelector` but it won't be optimal.
        // For now "skipped" rows will be zeroed, so it won't affect summed preimage and hash commitment.

        rowsToDelete[i] = NOT();
        rowsToDelete[i].in <== filterRow[i].out;

        for (j=0; j<c; j++) {
            out[i][j] <== table[i][j] * rowsToDelete[i].out;
        }
    }

    // TODO: replace code above with SELECT component.

    // Hash table and header again to produce new commitment.
    component newHasher = HashTable(c,r);

    for (i=0;i<c;i++) {
        newHasher.header[i] <== header[i];
    }

    for (i=0;i<r;i++) {
        for (j=0;j<c;j++) {
            newHasher.table[i][j] <== out[i][j];
        }
    }

    newTableCommit <== newHasher.out;
}

component main {public [tableCommit, whereColumn, whereValues]} = DELETE(5, 5);
