//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.0;

interface IVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}


contract ZkSQL {
    enum SqlOperation{ INSERT, UPDATE, DELETE }
    event RequestPosted(address issuer, uint256 commitment);
    event TableUpdated(string table, uint256 commitment);

    address public immutable insertVerifier;
    address public immutable updateVerifier;
    address public immutable deleteVerifier;
    mapping(string => uint256) public tableCommitments;
    mapping(uint256 => string) public requestsCommitments;

    constructor(address insertVerifier_, address updateVerifier_, address deleteVerifier_) {
        insertVerifier = insertVerifier_;
        updateVerifier = updateVerifier_;
        deleteVerifier = deleteVerifier_;
        tableCommitments["table1"] = 6192063684007625405622444875231245009508356906093894343979231563958794510376;
    }

    function request(string memory table, uint256 argsCommitment)
        public
    {
        requestsCommitments[argsCommitment] = table;
        emit RequestPosted(msg.sender, argsCommitment);
    }

    function execRequest(SqlOperation opcode, uint256 argsCommitment, uint256 newCommitment, bytes memory proof)
        public returns (bool)
    {
        address verifier = verifierForOperation(opcode);

        string memory table = requestsCommitments[argsCommitment];
        // require(table.length != 0, "unknown request");

        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = newCommitment;
        publicInputs[1] = tableCommitments[table];
        publicInputs[2] = argsCommitment;
        require(IVerifier(verifier).verifyProof(proof, publicInputs), "SNARK verification failed");

        tableCommitments[table] = newCommitment;
        emit TableUpdated(table, newCommitment);

        return true;
    }

    function verifierForOperation(SqlOperation opcode)
        internal view returns (address)
    {
        if (SqlOperation.INSERT == opcode) {
            return insertVerifier;
        } else if (SqlOperation.UPDATE == opcode) {
            return updateVerifier;
        } else if (SqlOperation.DELETE == opcode) {
            return deleteVerifier;
        }

        revert("unknown operation");
    }
}
