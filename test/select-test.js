const chai = require("chai");
const path = require("path");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
const buildPoseidon = require("circomlibjs").buildPoseidon;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

describe("Word Mastermind", function () {
    this.timeout(100000000);
    let circuit;
    let poseidonJs;
    // List of valid words to assert during circuit compile, must be agreed before game.
    const header = [1, 2, 3, 4, 5];
    const table = [
        [1, 4, 3, 4, 3],
        [2, 3, 4, 3, 8],
        [3, 4, 5, 8, 4],
        [4, 5, 6, 7, 2],
        [5, 4, 7, 8, 9],
    ];

    before(async () => {
        circuit = await wasm_tester("circuits/select.circom");
        await circuit.loadConstraints();
        poseidonJs = await buildPoseidon();
    });

    it("SELECT * table1 WHERE '2' = 4", async () => {
        const results = [
            [1, 4, 3, 4, 3],
            [0, 0, 0, 0, 0],
            [3, 4, 5, 8, 4],
            [0, 0, 0, 0, 0],
            [5, 4, 7, 8, 9],
        ]
        const INPUT = {
            header: header,
            table: table,
            tableCommit: 20580794855113813079052122243750196633667716007705766396329389083153612451814n,
            whereColumn: [0, 2, 0, 0, 0],
            whereValues: [0, 4, 0, 0, 0],
            results: results,
        };

        const witness = await circuit.calculateWitness(INPUT, true);

        // assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        // assert(Fr.eq(Fr.e(witness[1]),Fr.e(solutionHash1)), "must produce same hash");
    });

    it("SELECT * table1 WHERE '2' = 4 AND '4' = 8", async () => {
        const results = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [3, 4, 5, 8, 4],
            [0, 0, 0, 0, 0],
            [5, 4, 7, 8, 9],
        ]
        const INPUT = {
            header: header,
            table: table,
            tableCommit: 20580794855113813079052122243750196633667716007705766396329389083153612451814n,
            whereColumn: [0, 2, 0, 4, 0],
            whereValues: [0, 4, 0, 8, 0],
            results: results,
        };

        const witness = await circuit.calculateWitness(INPUT, true);

        // assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        // assert(Fr.eq(Fr.e(witness[1]),Fr.e(solutionHash1)), "must produce same hash");
    });
});

  