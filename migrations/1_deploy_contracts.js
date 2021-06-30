const StakingContract = artifacts.require("GlqStakingContract");
const TierCompute = artifacts.require("TestableTierCompute");
const ERC20 = artifacts.require("FakeERC20");
module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ERC20);
  const erc20 = await ERC20.deployed();
  await deployer.deploy(StakingContract, erc20.address, accounts[0]);
  await deployer.deploy(TierCompute);
};
