const GlqStakingContract = artifacts.require("GlqStakingContract");
const ERC20Contract = artifacts.require("FakeERC20");
const truffleAssert = require("truffle-assertions");

const getBigNumberAmount = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether")
}

const getDecimalAmount = (bigNumber) => {
    return web3.utils.fromWei(bigNumber.toString(), "ether")
}

const addIncentive = (contract, amount) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.addIncentive(amount)
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
}
 
const removeIncentive = (contract, amount) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.removeIncentive(amount)
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
}

const getAmountIncentive = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getTotalIncentive()
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getWalletCurrentTier = (contract, addr) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getWalletCurrentTier(addr)
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getTotalDeposited = (contract, addr) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getDepositedGLQ(addr)
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getPosition = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getPosition(acc)
            cb(res)
        } catch(e) { console.error(e) }
    })
}


const withdrawGlq = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.withdrawGlq()
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
} 

const getGlqToClaim = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getGlqToClaim(acc)
            cb(res)
        } catch(e) { console.error(e) }
    })
} 

const getWaitingPercentAPR = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getWaitingPercentAPR(acc)
            cb(res)
        } catch(e) { console.error(e) }
    })
} 


const test = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.test()
            console.log(res.toString())
            cb(res)
        } catch(e) { console.error(e) }
    })
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
});

// module.exports = async (callback) => {
//     let accounts = await web3.eth.getAccounts()
//     web3.eth.defaultAccount = accounts[0]

//     const deployedContract = await GlqStakingContract.deployed()
//     const amountToDeposit = getBigNumberAmount(500000).toString()

//     // Deposit as Staker
//     await depositGLQ(deployedContract, amountToDeposit)
    
//     // Withdraw as Staker
//     await withdrawGlq(deployedContract)

//     // Fetch amount deposited
//     const deposited = getDecimalAmount(await getTotalDeposited(deployedContract, accounts[0]))
//     //console.log(`Deposited: ${deposited}`)

//     // Fetch Current Tier
//     const tier = await getWalletCurrentTier(deployedContract, accounts[0])
//     //console.log(tier.toString())

//     // Claim Glq
//     const toClaim = await getGlqToClaim(deployedContract, accounts[0])
//     //console.log(getDecimalAmount(toClaim))
  
//     // Percent APR on next claim
//     const toClaimAPR = await getWaitingPercentAPR(deployedContract, accounts[0])
//     //console.log(getDecimalAmount(toClaimAPR))

//     // Fetch Rank Position
//     const position = await getPosition(deployedContract, accounts[0]);
//     console.log(`Deposited: ${deposited}, Tier: ${tier.toString()}, Rank: ${position.toString()}, GLQ to claim: ${getDecimalAmount(toClaim)} GLQ` +
//     ` (represent ${getDecimalAmount(toClaimAPR)}%)`)

//     // Add Incentive Test
//     await addIncentive(deployedContract, amountToDeposit)

//     // Remove Incentive Test
//     await removeIncentive(deployedContract, amountToDeposit)

//     // Display Added Incentive
//     const amountIncentive = getDecimalAmount(await getAmountIncentive(deployedContract))
//     console.log(amountIncentive)


//     // Fetch total count of stakers
//     console.log(`Total stakers: ${(await getTotalStakers(deployedContract)).toString()}`)


//     callback();
// }