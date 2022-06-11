#!/bin/bash

CIRCUIT_NAME=$1

cd circuits

mkdir -p build
mkdir -p build/$CIRCUIT_NAME

if [ -f ./powersOfTau28_hez_final_16.ptau ]; then
    echo "powersOfTau28_hez_final_16.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_16.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau
fi

echo "Compiling $CIRCUIT_NAME.circom..."

# compile circuit

circom $CIRCUIT_NAME.circom --r1cs --wasm --sym -o build/$CIRCUIT_NAME
snarkjs r1cs info build/$CIRCUIT_NAME/$CIRCUIT_NAME.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup build/$CIRCUIT_NAME/$CIRCUIT_NAME.r1cs powersOfTau28_hez_final_16.ptau build/$CIRCUIT_NAME/circuit_0000.zkey
snarkjs zkey contribute build/$CIRCUIT_NAME/circuit_0000.zkey build/$CIRCUIT_NAME/circuit_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey build/$CIRCUIT_NAME/circuit_final.zkey build/$CIRCUIT_NAME/verification_key.json

# generate solidity contract
# snarkjs zkey export solidityverifier $CIRCUIT_NAME/circuit_final.zkey ../${CIRCUIT_NAME}Verifier.sol

cd ..
