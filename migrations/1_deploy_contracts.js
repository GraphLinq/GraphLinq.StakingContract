const StakingContract = artifacts.require("GlqStakingContract");
const TierCompute = artifacts.require("TestableTierCompute");
const ERC20 = artifacts.require("FakeERC20");
module.exports = async function(deployer) {
  await deployer.deploy(ERC20);
  const erc20 = await ERC20.deployed();
  await deployer.deploy(StakingContract, erc20.address, "0x8984e422E30033A84B780420566046d25EB3519a");
  await deployer.deploy(TierCompute);
};
