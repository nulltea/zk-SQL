pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "./hashTable.circom";
include "./utils.circom";

template UPDATE(nColumns,nRows,nAND,nOR) {
    signal input header[nColumns];
    signal input table[nRows][nColumns];
    signal input tableCommit;

    signal input setExpressions[nColumns][2];
    signal input whereConditions[nOR][nAND][3];
    signal input argsCommit;

    signal output newTableCommit;
    signal modified[nRows][nColumns];

    var i;
    var j;
    var k;


    // Hash arguments
    component preImage = CalculateTotal(nColumns * 2 + nOR*nAND*3);
    component argsHasher = Poseidon(1);

    for (i=0;i<nColumns;i++) {
        preImage.nums[i*2] <== setExpressions[i][0];
        preImage.nums[i*2+1] <== setExpressions[i][1];
    }
    for (i=0;i<nOR;i++) {
        for (j=0;j<nAND;j++) {
            var idx = nColumns*2+i*nAND*3+j*3;
            preImage.nums[idx] <== whereConditions[i][j][0];
            preImage.nums[idx+1] <== whereConditions[i][j][1];
            preImage.nums[idx+2] <== whereConditions[i][j][2];
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

    // TODO: find a way to encapsulate filtering logic.
    component isFilterColumn[nRows][nOR][nColumns];
    component equalCell[nRows][nOR][nColumns];
    component filterRowAND[nRows][nOR];
    component filterRow[nRows];
    component skipORCond[nOR];

    component isSetColumn[nRows][nColumns];
    signal cellToUpdate[nRows][nColumns];
    component cellNotToUpdate[nRows][nColumns];
    component newCellValues[nRows][nColumns];

    for (k=0; k<nOR; k++) {
        skipORCond[k] = MultiOR(nAND);

        for (j=0; j<nAND; j++) {
            skipORCond[k].in[j] <== whereConditions[k][j][0];
        }
    }

    for (i=0; i<nRows; i++) {
        filterRow[i] = MultiOR(nOR);
        for (k=0; k<nOR; k++) {
            filterRowAND[i][k] = MultiAND(nAND);

            for (j=0; j<nAND; j++) {
                isFilterColumn[i][k][j] = IsEqual();
                isFilterColumn[i][k][j].in[0] <== header[j];
                isFilterColumn[i][k][j].in[1] <== whereConditions[k][j][0];

                equalCell[i][k][j] = IsFiltered();
                equalCell[i][k][j].in[0] <== table[i][j] * isFilterColumn[i][k][j].out;
                equalCell[i][k][j].op <== whereConditions[k][j][1];
                equalCell[i][k][j].in[1] <== whereConditions[k][j][2] * isFilterColumn[i][k][j].out;
                
                filterRowAND[i][k].in[j] <== equalCell[i][k][j].out;
            }

            filterRow[i].in[k] <== filterRowAND[i][k].out * skipORCond[k].out;
        }

        for (j=0; j<nColumns; j++) {
            isSetColumn[i][j] = IsEqual();
            isSetColumn[i][j].in[0] <== header[j];
            isSetColumn[i][j].in[1] <== setExpressions[j][0];

            cellToUpdate[i][j] <== filterRow[i].out * isSetColumn[i][j].out;
            cellNotToUpdate[i][j] = NOT();
            cellNotToUpdate[i][j].in <== cellToUpdate[i][j];

            newCellValues[i][j] = CalculateTotal(2);
            newCellValues[i][j].nums[0] <== table[i][j] * cellNotToUpdate[i][j].out;
            newCellValues[i][j].nums[1] <== setExpressions[j][1] * cellToUpdate[i][j];

            modified[i][j] <== newCellValues[i][j].sum;
        }
    }

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


component main {public [tableCommit, argsCommit]} = UPDATE(5, 10, 5, 2);
