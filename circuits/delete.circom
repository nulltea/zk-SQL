pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template DELETE(nColumns,nRows,nAND,nOR) {
    signal input header[nColumns];
    signal input table[nRows][nColumns];
    signal input tableCommit;

    signal input whereConditions[nOR][nAND][2];
    signal input argsCommit;

    signal output newTableCommit;
    signal modified[nRows][nColumns];

    var i;
    var j;
    var k;

    // Hash arguments
    component preImage = CalculateTotal(nOR*nAND*2);
    component argsHasher = Poseidon(1);

    for (i=0;i<nOR;i++) {
        for (j=0;j<nAND;j++) {
            var idx = i*nAND*2+j*2;
            preImage.nums[idx] <== whereConditions[i][j][0];
            preImage.nums[idx+1] <== whereConditions[i][j][1];
        }
    }
    
    argsHasher.inputs[0] <== preImage.sum;
    argsHasher.out === argsCommit;

    // Hash table along with header
    component hasher = HashTable(nColumns,nRows);

    for (i=0;i<nColumns;i++) {
        hasher.header[i] <== header[i];
    }

    for (i=0;i<nRows;i++) {
        for (j=0;j<nColumns;j++) {
            hasher.table[i][j] <== table[i][j];
        }
    }

    // Check that the table corresponds to the commitment
    hasher.out === tableCommit;

    component isFilterColumn[nRows][nOR][nColumns];
    component equalCell[nRows][nOR][nColumns];
    component filterRowAND[nRows][nOR];
    component filterRow[nRows];
    component skipORCond[nOR];
    component skipAll = SumEquals(nOR);
    component rowsToDelete[nRows];
    skipAll.sum <== 0;

    for (k=0; k<nOR; k++) {
        skipORCond[k] = MultiOR(nAND);

        for (j=0; j<nAND; j++) {
            skipORCond[k].in[j] <== whereConditions[k][j][0];
        }

        skipAll.nums[k] <== skipORCond[k].out;
    }

    for (i=0; i<nRows; i++) {
        filterRow[i] = MultiOR(nOR);
        for (k=0; k<nOR; k++) {
            filterRowAND[i][k] = MultiAND(nAND);

            for (j=0; j<nAND; j++) {
                isFilterColumn[i][k][j] = IsEqual();
                isFilterColumn[i][k][j].in[0] <== header[j];
                isFilterColumn[i][k][j].in[1] <== whereConditions[k][j][0];

                equalCell[i][k][j] = IsEqual();
                equalCell[i][k][j].in[0] <== whereConditions[k][j][1] * isFilterColumn[i][k][j].out;
                equalCell[i][k][j].in[1] <== table[i][j] * isFilterColumn[i][k][j].out;
                
                filterRowAND[i][k].in[j] <== equalCell[i][k][j].out;
            }

            filterRow[i].in[k] <== filterRowAND[i][k].out * skipORCond[k].out + skipAll.out;
        }

        rowsToDelete[i] = NOT();
        rowsToDelete[i].in <== filterRow[i].out;

        for (j=0; j<nColumns; j++) {
            modified[i][j] <== table[i][j] * rowsToDelete[i].out;
        }
    }

    // TODO: replace code above with SELECT component.

    // Hash table and header again to produce new commitment.
    component newHasher = HashTable(nColumns,nRows);

    for (i=0;i<nColumns;i++) {
        newHasher.header[i] <== header[i];
    }

    for (i=0;i<nRows;i++) {
        for (j=0;j<nColumns;j++) {
            newHasher.table[i][j] <== modified[i][j];
        }
    }

    newTableCommit <== newHasher.out;
}

component main {public [tableCommit, argsCommit]} = DELETE(5, 10, 5, 2);
