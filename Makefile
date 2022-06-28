install:
	yarn install

build:
	bash scripts/compile-circuit.sh select
	bash scripts/compile-circuit.sh insert
	bash scripts/compile-circuit.sh update
	bash scripts/compile-circuit.sh delete
	yarn hardhat compile
	yarn hardhat typechain

ui-dev:
	yarn start-ui

node-dev:
	yarn start-node
