const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/

for (const file of fs.readdirSync("./contracts")) {
	let content = fs.readFileSync(`./contracts/${file}`, { encoding: 'utf-8' });
	let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');

	fs.writeFileSync(`./contracts/${file}`, bumped);
}

