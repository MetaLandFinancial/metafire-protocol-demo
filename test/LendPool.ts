import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFunction } from "hardhat/internal/hardhat-network/stack-traces/model";



describe("Lend Protocol", function () {
  console.log("------start test -------");
  const oneEther = ethers.BigNumber.from("1000000000000000000");
  var mockOracle: any;
  var weth: any;
  var mockNFT: any;
  
  
  this.beforeEach(async () => {

    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy();
    console.log("oracle address= " + mockOracle.address);
    const WETH = await ethers.getContractFactory("WETHMocked");
    weth = await WETH.deploy();

    const MockNFT = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFT.deploy();


  });

  describe("Mock Oracle",() => {
    it("Get NFT price", async function() {
      await mockOracle.deployed();
      
      const priceOfNFT = await mockOracle.getNFTPrice('0x846684d5db5A149bAb306FeeE123a268a9E8A7E4','0x846684d5db5A149bAb306FeeE123a268a9E8A7E4');

      expect(priceOfNFT).to.equal(oneEther);
    })
  })

  describe("WETH",() => {
    it("Mint WETH", async function() {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await weth.deployed();
      
      //deposit Ether to WETH
      await weth.deposit({value: ethers.utils.parseUnits("1","ether")});
      const wethBalance = await weth.balanceOf(owner.address);

      expect(wethBalance).to.equal(oneEther);
    })

    it("Withdraw ETH", async function() {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await weth.deployed();
      
      //deposit and withdraw Ether to WETH
      await weth.deposit({value: ethers.utils.parseUnits("1","ether")});
      await weth.withdraw(ethers.utils.parseUnits("1","ether"));
      const wethBalance = await weth.balanceOf(owner.address);
      console.log(wethBalance);
      expect(wethBalance).to.equal(0);
    })
  })

  describe("Mock NFT",() => {
    it("Mint NFT", async function() {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await mockNFT.deployed();
      
      //mint nft
      await mockNFT.mint(owner.address);
      const nftBalance = await mockNFT.balanceOf(owner.address);
      expect(nftBalance).to.equal(1);
    })
  })

  describe("Lend Pool", async () => {
 

    it("Deposit 1 Ether from WETHGateway to Lend Pool", async function() {
      const [owner, addr1, addr2] = await ethers.getSigners();
      var lendPool: any;
      var wethGateway: any;
      
      const LendPool = await ethers.getContractFactory("LendPool");
      const WETHGateway = await ethers.getContractFactory("WETHGateway");
      
      /**
       * @param {uint256} Borrow rate: set borrow rate to 10%: 1 = 0.01%
       * @param {address} Oracle addree 
       **/
      lendPool = await LendPool.deploy(1000, mockOracle.address);
      wethGateway = await WETHGateway.deploy(weth.address, lendPool.address);
      await mockOracle.deployed();
      await wethGateway.deployed();
      await lendPool.deployed();

      await lendPool.approveWETHGateway(weth.address, wethGateway.address);
      await wethGateway.depositETH(owner.address,{value: ethers.utils.parseUnits("1","ether")});

      // check WETH balance of lend pool
      const balanceOfPool = await weth.balanceOf(lendPool.address);
      expect(balanceOfPool).to.equal(oneEther);

      //check balance of depositor
      const balanceOfDep = await lendPool.getDepositBalance(owner.address);
      expect(balanceOfDep).to.equal(oneEther);
    })
  })



});