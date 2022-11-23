import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  var mockOracle: any;
  var weth: any;
  var mockNFT: any;
  var lendPool: any;
  var wethGateway: any;
  var mockNFTB: any;

  const MockOracle = await ethers.getContractFactory("MockOracle");
  mockOracle = await MockOracle.deploy();

  mockOracle.deployed();
  console.log(mockOracle.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
