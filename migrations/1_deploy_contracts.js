const StakingContract = artifacts.require("GlqStakingContract");

module.exports = function(deployer) {
  deployer.deploy(StakingContract, "0xCcbB043F94c49Be8D448582Cab9158cDFc57a0a1", "0x8984e422E30033A84B780420566046d25EB3519a");
};
