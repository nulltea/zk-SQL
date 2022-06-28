#!/bin/bash

CIRCUIT_NAME=$1
OUTPUT_DIR=../lib/circuits

cd circuits

mkdir -p $OUTPUT_DIR
mkdir -p $OUTPUT_DIR/$CIRCUIT_NAME

if [ -f ./powersOfTau28_hez_final_16.ptau ]; then
    echo "powersOfTau28_hez_final_16.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_16.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau
fi

echo "Compiling $CIRCUIT_NAME.circom..."

# compile circuit

circom $CIRCUIT_NAME.circom --r1cs --wasm --sym -o $OUTPUT_DIR/$CIRCUIT_NAME
snarkjs r1cs info $OUTPUT_DIR/$CIRCUIT_NAME/$CIRCUIT_NAME.r1cs

# Start a new zkey and make a contribution

snarkjs plonk setup $OUTPUT_DIR/$CIRCUIT_NAME/$CIRCUIT_NAME.r1cs powersOfTau28_hez_final_16.ptau $OUTPUT_DIR/$CIRCUIT_NAME/circuit_final.zkey
## snarkjs zkey contribute build/$CIRCUIT_NAME/circuit_0000.zkey build/$CIRCUIT_NAME/circuit_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey $OUTPUT_DIR/$CIRCUIT_NAME/circuit_final.zkey $OUTPUT_DIR/$CIRCUIT_NAME/verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier $OUTPUT_DIR/$CIRCUIT_NAME/circuit_final.zkey ../contracts/${CIRCUIT_NAME}Verifier.sol

cd ..
