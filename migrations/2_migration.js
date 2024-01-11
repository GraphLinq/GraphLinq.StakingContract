const fs = require("fs").promises;
const StakingContract = artifacts.require("GlqStakingContract");
const web3 = require("web3")

async function readStaked() {
    const data = await fs.readFile('./staked.json', { encoding: 'utf8' });
    return JSON.parse(data)
}

async function readStakers() {
    const data = await fs.readFile('./stakers.json', { encoding: 'utf8' });
    return JSON.parse(data)
}

const chunkArray = (arr, size) =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

async function setClaimMigration(staked, contract)
{
    for (var x of staked)
    {
        if (x.amount != "0")
        x.amount = web3.utils.toBN(x.amount).add(web3.utils.toBN(x.amount).mul(web3.utils.toBN('10')).div(web3.utils.toBN('100'))).toString()
    }

    const chunks = chunkArray(staked, 500)
    let chunkIndex = 1;
    for (const chunk of chunks) {
        let addrs = chunk.map(x => x.addr);
        let amounts = chunk.map(x => x.amount);
        const result = await contract.setClaimMigration(addrs, amounts, chunk.length)
        if (result) {
            let total = 0
            amounts.forEach(x => total += x/1e18);
            console.log(`(Chunk: ${chunkIndex++}) ${chunk.length} addressed bridged sent to bridge out for a total of ${total} GLQ`)
        }
    }
}

async function setStakers(stakers, contract)
{
    return new Promise( async (res, rej) => {
        try {
            const chunkSize = 200
            const chunks = chunkArray(stakers, 200)
            let offsetIndex = 0

            for (const chunk of chunks) {
                console.log(chunk.length)
                const tx = await contract.setMigrationStaker(chunk, offsetIndex*chunkSize)
                console.log(tx)
                offsetIndex++;
            }

            res()
        } catch (e) {
            console.error(e)
        }
    })
}

async function setWithdrawedBonus(stakers, contract)
{
    return new Promise( async (res, rej) => {
        try {
                var withdrawed = 0
                stakers.forEach(x => {
                    if (x.index_at === 0) withdrawed++;
                })

                const tx = await contract.setIndexWithdrawed(withdrawed)
                if (tx) {
                    console.log(`withdrawed bonus set to ${withdrawed}`)
                }                
            res()
        } catch (e) {
            console.error(e)
        }
    })
}

module.exports = async function(callback) {
    const contract = await StakingContract.deployed();
    // const staked = await readStaked()
    const stakers = await readStakers()
    //setClaimMigration(staked, contract)
    await setStakers(stakers, contract)
    await setWithdrawedBonus(stakers, contract)

}

