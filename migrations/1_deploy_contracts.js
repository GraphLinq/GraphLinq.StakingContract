const StakingContract = artifacts.require("GlqStakingContract");

module.exports = function(deployer) {
  deployer.deploy(StakingContract, "0xBd510d1DD4857061B092420039B44Ca20366F7Fd");
};
