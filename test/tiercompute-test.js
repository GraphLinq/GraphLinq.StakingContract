const TierComputeContract = artifacts.require("TestableTierCompute");
const truffleAssert = require("truffle-assertions");

async function fetchState(contract) {
    let tier1Head = (await contract.tier1_head()).toNumber();
    let tier2Head = (await contract.tier2_head()).toNumber();
    let tier3Head = (await contract.tier3_head()).toNumber();
    let last = (await contract.last()).toNumber();
    let totalStakes = (await contract.total_stakes()).toNumber();
    let totalTier1 = (await contract.total_tier1()).toNumber();
    let totalTier2 = (await contract.total_tier2()).toNumber();
    let totalTier3 = totalStakes - totalTier1 - totalTier2;

    return {
        tier1Head,
        tier2Head,
        tier3Head,
        last,
        totalStakes,
        totalTier1,
        totalTier2,
        totalTier3
    }
}

contract("TierCompute", async accounts => {
    it("intialization should set the correct values", async () => {
        const deployedContract = await TierComputeContract.deployed();
        const state = await fetchState(deployedContract);
        assert.equal(state.totalStakes, 0);
        assert.equal(state.last, 0);
        assert.equal(state.totalTier1, 0);
        assert.equal(state.totalTier2, 0);
        assert.equal(state.totalTier3, 0);
    });

    it("removing unknown id should fail", async () => {
        const deployedContract = await TierComputeContract.deployed();
        truffleAssert.reverts(deployedContract.remove(0), "User not found");
    });

    it("adding one should place in tier3", async () => {
        const deployedContract = await TierComputeContract.deployed();
        await deployedContract.add();
        const state = await fetchState(deployedContract);
        assert.equal(state.totalStakes, 1);
        assert.equal(state.last, 1);
        assert.equal(state.totalTier1, 0);
        assert.equal(state.totalTier2, 0);
        assert.equal(state.totalTier3, 1);

        const tier = (await deployedContract.getTier(1)).toNumber();
        assert.equal(tier, 3);
    });

    it("removing last user should place the contract in init state", async () => {
        const deployedContract = await TierComputeContract.deployed();
        await deployedContract.remove(1);
        const state = await fetchState(deployedContract);
        assert.equal(state.totalStakes, 0);
        assert.equal(state.last, 0);
        assert.equal(state.totalTier1, 0);
        assert.equal(state.totalTier2, 0);
        assert.equal(state.totalTier3, 0);
    });

    it("removing first of 10 users should work", async () => {
        const deployedContract = await TierComputeContract.deployed();
        for(let i = 0; i < 10; i++)
            await deployedContract.add();
        let state = await fetchState(deployedContract);
        assert.equal(state.tier1Head, 2);
        assert.equal(state.totalStakes, 10);
        assert.equal(state.last, 11);
        await deployedContract.remove(2);
        state = await fetchState(deployedContract);
        assert.equal(state.tier1Head, 3);
        assert.equal(state.totalStakes, 9);
        assert.equal(state.last, 11);
    });

    it("removing last of 9 users should work", async () => {
        const deployedContract = await TierComputeContract.deployed();
        let state = await fetchState(deployedContract);
        assert.equal(state.tier1Head, 3);
        assert.equal(state.totalStakes, 9);
        assert.equal(state.last, 11);
        await deployedContract.remove(11);
        state = await fetchState(deployedContract);
        assert.equal(state.tier1Head, 3);
        assert.equal(state.totalStakes, 8);
        assert.equal(state.last, 10);
    });
    it("removing remaining 8 users should work", async () => {
        const deployedContract = await TierComputeContract.deployed();
        for(let i = 3; i <= 10; i++) {
            await deployedContract.remove(i);
        }
        const state = await fetchState(deployedContract);
        assert.equal(state.totalStakes, 0);
        assert.equal(state.last, 0);
        assert.equal(state.totalTier1, 0);
        assert.equal(state.totalTier2, 0);
        assert.equal(state.totalTier3, 0);
    });

    it("next created user id should be 12", async () => {
        const deployedContract = await TierComputeContract.deployed();
        await deployedContract.add();
        const state = await fetchState(deployedContract);
        assert.equal(state.last, 12);
    });

    it("stakers should be properly tiered after adding 24 more users", async () => {
        const deployedContract = await TierComputeContract.deployed();
        for(let i = 0; i < 24; i++) {
            await deployedContract.add();
        }

        let tier1 = await deployedContract.getTier1();
        let tier2 = await deployedContract.getTier2();
        let tier3 = await deployedContract.getTier3();

        assert.equal(tier1.length, 3);
        assert.equal(tier2.length, 10);
        assert.equal(tier3.length, 12);
    });

    it("stakers should be properly tiered after adding 20 more users", async () => {
        const deployedContract = await TierComputeContract.deployed();
        
        // add 20 more
        for(let i = 0; i < 20; i++) {
            await deployedContract.add();
        }

        let tier1 = await deployedContract.getTier1();
        let tier2 = await deployedContract.getTier2();
        let tier3 = await deployedContract.getTier3();

        assert.equal(tier1.length, 6);
        assert.equal(tier2.length, 18);
        assert.equal(tier3.length, 21);
    });

    it("stakers should be properly tiered after removing all tier1 users", async () => {
        const deployedContract = await TierComputeContract.deployed();
        
        let tier1 = await deployedContract.getTier1();
        let tier2 = await deployedContract.getTier2();
        let tier3 = await deployedContract.getTier3();;

        // remove all tier1
        for(let i = 0; i < tier1.length; i++)
            await deployedContract.remove(tier1[tier1.length - i - 1]);

        tier1 = await deployedContract.getTier1();
        tier2 = await deployedContract.getTier2();
        tier3 = await deployedContract.getTier3();

        assert.equal(tier1.length, 5);
        assert.equal(tier2.length, 15);
        assert.equal(tier3.length, 19);
    });

    it("stakers should be properly tiered after removing all tier2 users", async () => {
        const deployedContract = await TierComputeContract.deployed();
        
        let tier1 = await deployedContract.getTier1();
        let tier2 = await deployedContract.getTier2();
        let tier3 = await deployedContract.getTier3();;

        // remove all tier2
        for(let i = 0; i < tier2.length; i++)
            await deployedContract.remove(tier2[tier2.length - i - 1]);

        tier1 = await deployedContract.getTier1();
        tier2 = await deployedContract.getTier2();
        tier3 = await deployedContract.getTier3();

        assert.equal(tier1.length, 3);
        assert.equal(tier2.length, 9);
        assert.equal(tier3.length, 12);
    });

    it("stakers should be properly tiered after adding 50 users", async () => {
        const deployedContract = await TierComputeContract.deployed();
        
        // add 50 more
        for(let i = 0; i < 100; i++) {
            await deployedContract.add();
        }

        const tier1 = await deployedContract.getTier1();
        const tier2 = await deployedContract.getTier2();
        const tier3 = await deployedContract.getTier3();

        assert.equal(tier1.length, 18);
        assert.equal(tier2.length, 49);
        assert.equal(tier3.length, 57);
    });

});