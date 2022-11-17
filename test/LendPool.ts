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
  var lendPool: any;
  var wethGateway: any;
  
  this.beforeEach(async () => {

    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy();
    // console.log("oracle address= " + mockOracle.address);
    const WETH = await ethers.getContractFactory("WETHMocked");
    weth = await WETH.deploy();

    const MockNFT = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFT.deploy();

    const LendPool = await ethers.getContractFactory("LendPool");
    lendPool = await LendPool.deploy();
    const WETHGateway = await ethers.getContractFactory("WETHGateway");
    wethGateway = await WETHGateway.deploy(weth.address, lendPool.address, mockNFT.address);


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
      // console.log(wethBalance);
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

    // it("Init contract", async function() {
    //   const [owner, addr1, addr2] = await ethers.getSigners();
    //   const LendPool = await ethers.getContractFactory("LendPool");
    //   const lendPool = await LendPool.deploy();
    //   await lendPool.deployed();
    // })
 
    it("Variable Deposit and Fixed Deposit", async function() {

      await lendPool.deployed();
      const [owner, addr1, addr2] = await ethers.getSigners();

      // variable deposit
      await wethGateway.depositETH(owner.address, 0,{value: ethers.utils.parseUnits("1","ether")});
      
      // check WETH balance of variable lend pool
      const balanceOfPool = await weth.balanceOf(lendPool.address);
      expect(balanceOfPool).to.equal(oneEther);

      // check the depositor balance 
      const vUserDepositData = await lendPool.getDepositData(owner.address,0);
      expect(vUserDepositData.balance).to.equal(oneEther);

      // fixed deposit
      await wethGateway.depositETH(owner.address, 1,{value: ethers.utils.parseUnits("1","ether")});

      // check the depositor balance 
      const fUserDepositData = await lendPool.getDepositData(owner.address,1);
      expect(fUserDepositData.balance).to.equal(oneEther);
    })

    it("Time-dependent tests", async function() {

      await lendPool.deployed();
      const [owner, addr1, addr2] = await ethers.getSigners();

      // getting timestamp
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;

      // increase time
      await ethers.provider.send("evm_increaseTime", [3600*24*365]);
      await ethers.provider.send("evm_mine");

      // getting timestamp
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter  = await ethers.provider.getBlock(blockNumAfter);
      const timestampAfter  = blockAfter.timestamp;
      expect(timestampAfter).to.equal(timestampBefore + 3600*24*365);
    })



    it("1 year Variable Withdraw", async function() {

      await lendPool.deployed();
      const [owner, addr1, addr2] = await ethers.getSigners();

      // variable deposit  11 ether
      await wethGateway.connect(addr1).depositETH(addr1.address,0,{value: ethers.utils.parseUnits("10","ether")});
      await wethGateway.depositETH(owner.address, 0,{value: ethers.utils.parseUnits("1","ether")});
      const balanceOfPool = await weth.balanceOf(lendPool.address);

      //check weth balance of the pool
      expect(balanceOfPool).to.equal(oneEther.mul(11));
      
      await lendPool.approveWETHGateway(weth.address, wethGateway.address);

      await ethers.provider.send("evm_increaseTime", [3600*24*365]);
      await ethers.provider.send("evm_mine");

      // deposit for 1 year and receive 5% interest
      await wethGateway.withdrawETH(oneEther.mul(105).div(100),owner.address,0);

      
      const depositData = await lendPool.getDepositData(owner.address,0);
      expect(depositData.balance).to.equal(0);
      // console.log(depositData.balance);
    })

    it("3 months fixed Withdraw", async function() {

      await lendPool.deployed();
      const [owner, addr1, addr2] = await ethers.getSigners();

      // fixed rate deposit: 11 ether
      await wethGateway.connect(addr1).depositETH(addr1.address,1,{value: ethers.utils.parseUnits("10","ether")});
      await wethGateway.depositETH(owner.address, 1,{value: ethers.utils.parseUnits("1","ether")});
      const balanceOfPool = await weth.balanceOf(lendPool.address);

      //check weth balance of the pool
      expect(balanceOfPool).to.equal(oneEther.mul(11));
      
      await lendPool.approveWETHGateway(weth.address, wethGateway.address);

      await ethers.provider.send("evm_increaseTime", [3600*24*90]);
      await ethers.provider.send("evm_mine");

      // update state
      await lendPool.updateDepositState(1, owner.address);

      // deposit for 90days and receive 2.46% interest
      const depositData = await lendPool.getDepositData(owner.address,1); 
      const expectedBalance = oneEther.mul(10246).div(10000); 
      expect(depositData.balance).to.equal(expectedBalance);
    })





  })

});