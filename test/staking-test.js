const artifacts = require('../build/contracts/GlqStakingContract.json')
const contract = require('truffle-contract')

const {
    time
  } = require('@openzeppelin/test-helpers');

const GlqStakingContract = contract(artifacts);
GlqStakingContract.setProvider(web3.currentProvider);

const getBigNumberAmount = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether")
}

const getDecimalAmount = (bigNumber) => {
    return web3.utils.fromWei(bigNumber.toString(), "ether")
}

const addIncentive = (contract, amount) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.addIncentive(amount, {from: web3.eth.defaultAccount})
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
}
 
const removeIncentive = (contract, amount) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.removeIncentive(amount, {from: web3.eth.defaultAccount})
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
}

const getAmountIncentive = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getTotalIncentive({from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getWalletCurrentTier = (contract, addr) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getWalletCurrentTier(addr, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const depositGLQ = (contract, amount) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.depositGlq(amount, {from: web3.eth.defaultAccount})
            cb()
        } catch(e) { console.error(e) }
    })
}

const getTotalDeposited = (contract, addr) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getDepositedGLQ(addr, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getTotalStakers = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getTotalStakers({from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const getPosition = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getPosition(acc, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
}


const withdrawGlq = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.withdrawGlq({from: web3.eth.defaultAccount})
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
} 

const getGlqToClaim = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getGlqToClaim(acc, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
} 

const getWaitingPercentAPR = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.getWaitingPercentAPR(acc, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
} 

const getSpentTest = (contract, acc) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.spent(acc, {from: web3.eth.defaultAccount})
            cb(res)
        } catch(e) { console.error(e) }
    })
} 


const test = (contract) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.test({from: web3.eth.defaultAccount})
            console.log(res.toString())
            cb(res)
        } catch(e) { console.error(e) }
    })
}

const setApyPercentRewards = (contract, t1, t2, t3) => {
    return new Promise(async (cb) => {
        try {
            const res = await contract.setApyPercentRewards(t1, t2, t3, {from: web3.eth.defaultAccount})
            console.log(res)
            cb()
        } catch(e) { console.error(e) }
    })
}

module.exports = async (callback) => {
    let accounts = await web3.eth.getAccounts()
    web3.eth.defaultAccount = accounts[0]

    const deployedContract = await GlqStakingContract.deployed()
    const amountToDeposit = getBigNumberAmount(1000000).toString()

    // Set Apy Percent Rewards
    var t1 = getBigNumberAmount(15).toString()
    var t2 = getBigNumberAmount(7.5).toString()
    var t3 = getBigNumberAmount(5).toString()
    // var t1 = getBigNumberAmount(50).toString()
    // var t2 = getBigNumberAmount(25).toString()
    // var t3 = getBigNumberAmount(12.5).toString()
    console.log(t1)
    console.log(t2)
    console.log(t3)
    await setApyPercentRewards(deployedContract, t1, t2, t3)

    // const result = await getSpentTest(deployedContract, accounts[0])
    // console.log(result.toString())
    // callback()
    // return;

    // Deposit as Staker
    //await depositGLQ(deployedContract, amountToDeposit)
    
    // Withdraw as Staker
    //await withdrawGlq(deployedContract)

    // Fetch amount deposited
    // const deposited = getDecimalAmount(await getTotalDeposited(deployedContract, accounts[0]))
    // // //console.log(`Deposited: ${deposited}`)

    // // // Fetch Current Tier
    // const tier = await getWalletCurrentTier(deployedContract, accounts[0])
    // // //console.log(tier.toString())

    // // // Claim Glq
    // const toClaim = await getGlqToClaim(deployedContract, accounts[0])
    // //console.log(getDecimalAmount(toClaim))
  
    // // // Percent APR on next claim
    // const toClaimAPR = await getWaitingPercentAPR(deployedContract, accounts[0])
    // console.log(getDecimalAmount(toClaimAPR))

    // // // Fetch Rank Position
    // const position = await getPosition(deployedContract, accounts[0]);
    // console.log(`Deposited: ${deposited}, Tier: ${tier.toString()}, Rank: ${position.toString()}, GLQ to claim: ${getDecimalAmount(toClaim)} GLQ` +
    // ` (represent ${getDecimalAmount(toClaimAPR)}%)`)

    // Add Incentive Test
    //await addIncentive(deployedContract, amountToDeposit)

    // Remove Incentive Test
    //await removeIncentive(deployedContract, amountToDeposit)

    // Display Added Incentive
    //const amountIncentive = getDecimalAmount(await getAmountIncentive(deployedContract))
    //console.log(amountIncentive)


    // Fetch total count of stakers
    //console.log(`Total stakers: ${(await getTotalStakers(deployedContract)).toString()}`)


    callback();
}