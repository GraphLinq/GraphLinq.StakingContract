const GlqStakingContract = artifacts.require("GlqStakingContract");
const ERC20Contract = artifacts.require("FakeERC20");
const truffleAssert = require("truffle-assertions");

const getBigNumberAmount = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether")
}

contract("GlqStakingContract", async accounts => {

    it("deposit without having enough funds should fail", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const amountToDeposit = getBigNumberAmount(50000000).toString();

        await truffleAssert.reverts(
            deployedContract.depositGlq(amountToDeposit),
            "Insufficient funds from the sender"
        );
    });

    it("deposit without setting enough allowance should fail", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const amountToDeposit = getBigNumberAmount(500000).toString();
        await truffleAssert.reverts(
            deployedContract.depositGlq(amountToDeposit),
            "ERC20: transfer amount exceeds allowance"
        );
    });

    it("staking for the first time should Emit NewStakerRegistered event and the tier should be 3", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const token = await ERC20Contract.deployed();
        
        const amountToDeposit = getBigNumberAmount(500000).toString();

        await token.approve(deployedContract.address, amountToDeposit);
        const tx = await deployedContract.depositGlq(amountToDeposit);

        truffleAssert.eventEmitted(tx, 'NewStakerRegistered');
        const totalStakers = await deployedContract.getTotalStakers();
        const totalStaked = await deployedContract.getTotalStaked();
        const myDeposit = await deployedContract.getDepositedGLQ(accounts[0]);
        const position = await deployedContract.getPosition(accounts[0]);
        const myTier = await deployedContract.getWalletCurrentTier(accounts[0]);
        const topStakers = await deployedContract.getTopStakers();
        assert.equal(totalStakers,1);
        assert.equal(totalStaked,getBigNumberAmount(500000));
        assert.equal(myDeposit, getBigNumberAmount(500000));
        assert.equal(position, 1);
        assert.equal(myTier, 3);
        assert.equal(topStakers.addresses[0], accounts[0]);

        const contractBalance = await token.balanceOf(deployedContract.address);
        assert.equal(contractBalance, getBigNumberAmount(500000));
    });

    it("staking for the second time should not Emit NewStakerRegistered event", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const token = await ERC20Contract.deployed();
        
        const amountToDeposit = getBigNumberAmount(500000).toString();

        await token.approve(deployedContract.address, amountToDeposit);
        const tx = await deployedContract.depositGlq(amountToDeposit);

        truffleAssert.eventNotEmitted(tx, 'NewStakerRegistered');
        const totalStakers = await deployedContract.getTotalStakers();
        const totalStaked = await deployedContract.getTotalStaked();
        const myDeposit = await deployedContract.getDepositedGLQ(accounts[0]);
        assert.equal(totalStakers,1);
        assert.equal(totalStaked,getBigNumberAmount(1000000));
        assert.equal(myDeposit, getBigNumberAmount(1000000));
    });

    it("withdrawing", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const token = await ERC20Contract.deployed();
        //send some tokens to compensate for the claimed rewards
        await token.transfer(deployedContract.address, getBigNumberAmount(5000))
        const tx = await deployedContract.withdrawGlq();

        const totalStakers = await deployedContract.getTotalStakers();
        const totalStaked = await deployedContract.getTotalStaked();
        const myDeposit = await deployedContract.getDepositedGLQ(accounts[0]);
        assert.equal(totalStakers,0);
        assert.equal(totalStaked,getBigNumberAmount(0));
        assert.equal(myDeposit, getBigNumberAmount(0));
    });

    it("staking multiple accounts", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const token = await ERC20Contract.deployed();

        const amountToDeposit = getBigNumberAmount(500).toString();

        for(let i = 1; i < 21; i++) {
            await token.transfer(accounts[i], amountToDeposit);
            await token.approve(deployedContract.address, amountToDeposit, {from: accounts[i]});
            await deployedContract.depositGlq(amountToDeposit, {from: accounts[i]});
            const totalStaked = await deployedContract.getTotalStaked();
            const totalStakers = await deployedContract.getTotalStakers();
            const myDeposit = await deployedContract.getDepositedGLQ(accounts[i]);
            const position = await deployedContract.getPosition(accounts[i]);
            assert.equal(totalStakers,i);
            assert.equal(totalStaked,amountToDeposit * i);
            assert.equal(myDeposit, amountToDeposit);
            assert.equal(position, i);
        }
    });

    it("emergency withdrawing should fail if not authorized", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        truffleAssert.reverts(deployedContract.emergencyWithdraw({from: accounts[1]}), "The emergency withdraw feature is not enabled");
    });

    it("emergency withdrawing multiple", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        await deployedContract.setEmergencyWithdraw(true);
        const token = await ERC20Contract.deployed();

        for(let i = 1; i < 11; i++) {
            await deployedContract.emergencyWithdraw({from: accounts[i]});
            let balance = await token.balanceOf(accounts[i]);
            assert.equal(balance,getBigNumberAmount(500));
        }
        
        const totalStakers = await deployedContract.getTotalStakers();
        const totalStaked = await deployedContract.getTotalStaked();
        assert.equal(totalStakers,10);
        assert.equal(totalStaked,getBigNumberAmount(500) * 10);
    });

    it("withdrawing multiple", async () => {
        const deployedContract = await GlqStakingContract.deployed();
        const token = await ERC20Contract.deployed();

        for(let i = 11; i < 21; i++) {
            await deployedContract.withdrawGlq({from: accounts[i]});
        }
        
        const totalStakers = await deployedContract.getTotalStakers();
        const totalStaked = await deployedContract.getTotalStaked();
        assert.equal(totalStakers,0);
        assert.equal(totalStaked,getBigNumberAmount(0));
    });
});