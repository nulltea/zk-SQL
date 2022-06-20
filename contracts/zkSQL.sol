//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.0;

interface IInsertVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

contract ZkSQL {
    address public immutable verifier;
    mapping(string => uint256) public tableCommitments;

    constructor(address verifier_) {
        verifier = verifier_;
        tableCommitments["table1"] = 6192063684007625405622444875231245009508356906093894343979231563958794510376;
    }

    function insert(string memory table, uint256[] memory values, uint256 newCommitment, bytes memory proof)
        public returns (bool)
    {
        uint256[] memory publicInputs = new uint256[](values.length + 2);
        publicInputs[0] = newCommitment;
        publicInputs[1] = tableCommitments[table];
        for (uint i = 0; i < values.length; i++) {
            publicInputs[2 + i] = values[i];
        }
        require(IInsertVerifier(verifier).verifyProof(proof, publicInputs), "SNARK verification failed");

        tableCommitments[table] = newCommitment;

        return true;
    }
}
