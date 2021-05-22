const StakingContract = artifacts.require("GlqStakingContract");

module.exports = function(deployer) {
  deployer.deploy(StakingContract, "0x18fC0081Ee9d6f7a4F97a2c9908b13699Cd61e8f", "0x5a1f65AA9C929B8E337Cce69B689bfEA0D8dbA68");
};
