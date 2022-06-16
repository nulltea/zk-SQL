pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template UPDATE(c,r) {
    signal input header[c];
    signal input table[r][c];
    signal input tableCommit;

    signal input setFields[c];
    signal input setValues[c];
    
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

    // TODO: find a way to encapsulate filtering logic.
    component equalColumn[r][c];
    component equalSetField[r][c];
    component notGates[r][c];
    signal cellToUpdate[r][c];
    component newCellValues[r][c];
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
            equalSetField[i][j] = IsEqual();
            equalSetField[i][j].in[0] <== header[j];
            equalSetField[i][j].in[1] <== setFields[j];

            cellToUpdate[i][j] <== filterRow[i].out * equalSetField[i][j].out;

            newCellValues[i][j] = CalculateTotal(2);

            notGates[i][j] = NOT();
            notGates[i][j].in <== cellToUpdate[i][j];

            newCellValues[i][j].nums[0] <== table[i][j] * notGates[i][j].out;
            newCellValues[i][j].nums[1] <== setValues[j] * cellToUpdate[i][j];

            out[i][j] <== newCellValues[i][j].sum;
        }
    }

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

component main {public [tableCommit, whereColumn, whereValues, setFields, setValues]} = UPDATE(5, 5);
