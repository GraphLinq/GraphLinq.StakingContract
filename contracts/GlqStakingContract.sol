// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./libs/maths/SafeMath.sol";
import "./libs/string.sol";
import "./interfaces/IERC20.sol";
import "./TierCompute.sol";

struct GlqStaker {
    address wallet;
    uint256 block_number;
    uint256 amount;
}

struct GraphLinqApyStruct {
    uint256 tier1Apy;
    uint256 tier2Apy;
    uint256 tier3Apy;      
}

contract GlqStakingContract is TierCompute {

    using SafeMath for uint256;

    event NewStakerRegistered (
        address staker_address,
        uint256 at_block,
        uint256 amount_registered
    );

    /*
    ** Address of the GLQ token hash: 0x9F9c8ec3534c3cE16F928381372BfbFBFb9F4D24
    */
    address private _glqTokenAddress;

    /*
    ** Manager of the contract to add/remove APYs bonuses into the staking contract
    */
    address private _glqDeployerManager;

    /*
    ** Current amount of GLQ available in the pool as rewards
    */
    uint256 private _totalGlqIncentive;

    mapping(uint256 => GlqStaker)   private _stakers;
    mapping(address => uint256)     private _walletToID;
    
    bool                            private _emergencyWithdraw;

    uint256                         private _blocksPerYear;
    uint256                         private _totalStaked;
    GraphLinqApyStruct              private _apyStruct;
    
    constructor(address glqAddr, address manager) {
        _glqTokenAddress = glqAddr;
        _glqDeployerManager = manager;
        
        _blocksPerYear = 2250000;
        
        // default t1: 30%, t2: 15%, t3: 7.5%
        _apyStruct = GraphLinqApyStruct(50*1e18, 25*1e18, 12500000000000000000);
    }


    /* Getter ---- Read-Only */

    /*
    ** Return the sender wallet position from the tier system
    ** Returns 0 if not a current staker
    */
    function getWalletCurrentTier(address wallet) public walletExists(wallet) view returns (uint256) {
        return getTier(_walletToID[wallet]);
    }

    /*
    ** Return rank position of a wallet
    */
    function getPosition(address wallet) public view returns (uint256) {
        uint256 id = _walletToID[wallet];
        if(id == 0) return 0;
        uint256 position = 1;
        uint256 cursor = tier1_head > 0? tier1_head : tier2_head > 0? tier2_head : tier3_head;
        if(cursor == 0) return 0;
        while(cursor != id) {
            cursor = items[cursor].next;
            position++;
        }
        return position;
    }

    /*
    ** Return the amount of GLQ that a wallet can currently claim from the staking contract
    */
    function getGlqToClaim(address wallet) public walletExists(wallet) view returns(uint256) {
        GlqStaker memory staker = _stakers[_walletToID[wallet]];

        uint256 calculatedApr = getWaitingPercentAPR(wallet);
        return staker.amount.mul(calculatedApr).div(100).div(1e18);
    }

    /*
    ** Return the current percent winnable for a staker wallet
    */
    function getWaitingPercentAPR(address wallet) public walletExists(wallet) view returns(uint256) {
        GlqStaker memory staker = _stakers[_walletToID[wallet]];

        uint256 walletTier = getWalletCurrentTier(wallet);
        uint256 blocksSpent = block.number.sub(staker.block_number);
        if (blocksSpent == 0) { return 0; }
        uint256 percentYearSpent = percent(blocksSpent.mul(10000), _blocksPerYear.mul(10000), 20);

        uint256 percentAprGlq = _apyStruct.tier3Apy;
        if (walletTier == 1) {
            percentAprGlq = _apyStruct.tier1Apy;
        } else if (walletTier == 2) {
            percentAprGlq = _apyStruct.tier2Apy;
        }

        return percentAprGlq.mul(percentYearSpent).div(100).div(1e18);
    }

    /*
    ** Return the total amount of GLQ as incentive rewards in the contract
    */
    function getTotalIncentive() public view returns (uint256) {
        return _totalGlqIncentive;
    }

    /*
    ** Return the total amount in staking for an hodler.
    */
    function getDepositedGLQ(address wallet) public view returns (uint256) {
        uint256 id = _walletToID[wallet];
        if (id == 0) { return 0; }
        return _stakers[id].amount;
    }

    /*
    ** Count the total numbers of stakers in the contract
    */
    function getTotalStakers() public view returns(uint256) {
        return total_stakes;
    }

    /*
    ** Return all APY per different Tier
    */
    function getTiersAPY() public view returns(uint256, uint256, uint256) {
        return (_apyStruct.tier1Apy, _apyStruct.tier2Apy, _apyStruct.tier3Apy);
    }

    /*
    ** Return the Total staked amount
    */
    function getTotalStaked() public view returns(uint256) {
        return _totalStaked;
    }

    /*
    ** Return the top 3 of stakers (by age)
    */
    function getTopStakers() public view returns(address[] memory addresses, uint256[] memory amounts) {
        addresses = new address[](3);
        amounts = new uint256[](3);
        
        uint256 i = 0;
        uint256 cursor = tier1_head > 0? tier1_head : tier2_head > 0? tier2_head : tier3_head;
        
        while(i < 3 && cursor != 0) {
            addresses[i] = _stakers[cursor].wallet;
            amounts[i] = _stakers[cursor].amount;
            cursor = items[cursor].next;
            i++;
        }
    }

    /*
    ** Return the total amount deposited on a rank tier
    */
    function getTierTotalStaked(uint8 tier) public view returns (uint256) {
        require(tier > 0 && tier < 4, "Invalid tier value");
        uint256[] memory tierStakers;
        if(tier == 1) tierStakers = getTier1();
        else if(tier == 2) tierStakers = getTier2();
        else tierStakers = getTier3();
        
        uint256 totalAmount = 0;

        for (uint i = 0; i < tierStakers.length; i++) {
            totalAmount +=  _stakers[tierStakers[i]].amount;
        }
      
        return totalAmount;
    }

    /* Getter ---- Read-Only */


    /* Setter - Read & Modifications */


    /*
    ** Enable emergency withdraw by GLQ Deployer
    */
    function setEmergencyWithdraw(bool state) public {
        require (
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can change the state of the emergency withdraw"
        );
        _emergencyWithdraw = state;
    }

    /*
    ** Set numbers of blocks spent per year to calculate claim rewards
    */
    function setBlocksPerYear(uint256 blocks) public {
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can change blocks spent per year");
        _blocksPerYear = blocks;
    }

    /*
    ** Update the APY rewards for each tier in percent per year
    */
    function setApyPercentRewards(uint256 t1, uint256 t2, uint256 t3) public {
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can APY rewards");
        GraphLinqApyStruct memory newApy = GraphLinqApyStruct(t1, t2, t3);
        _apyStruct = newApy;
    }

    function setT1Percent(uint8 perc) public {
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can APY rewards");

        _setTier1Percent(perc);
    }

    function setT2Percent(uint8 perc) public {
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can APY rewards");

        _setTier2Percent(perc);
    }

    /*
    ** Add GLQ liquidity in the staking contract for stakers rewards 
    */
    function addIncentive(uint256 glqAmount) public {
        IERC20 glqToken = IERC20(_glqTokenAddress);
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can add incentive into the smart-contract");
        require(
            glqToken.balanceOf(msg.sender) >= glqAmount,
            "Insufficient funds from the deployer contract");
        require(
            glqToken.transferFrom(msg.sender, address(this), glqAmount) == true,
            "Error transferFrom on the contract"
        );
        _totalGlqIncentive += glqAmount;
    }

    /*
    ** Remove GLQ liquidity from the staking contract for stakers rewards 
    */
    function removeIncentive(uint256 glqAmount) public {
        IERC20 glqToken = IERC20(_glqTokenAddress);
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can remove incentive from the smart-contract");
        require(
            glqToken.balanceOf(address(this)) >= glqAmount,
            "Insufficient funds from the deployer contract");
        require(
            glqToken.transfer(msg.sender, glqAmount) == true,
            "Error transfer on the contract"
        );

        _totalGlqIncentive -= glqAmount;
    }


    /*
    ** Deposit GLQ in the staking contract to stake & earn
    */
    function depositGlq(uint256 glqAmount) public {
        IERC20 glqToken = IERC20(_glqTokenAddress);
        require(
            glqToken.balanceOf(msg.sender) >= glqAmount,
            "Insufficient funds from the sender");
        require(
           glqToken.transferFrom(msg.sender, address(this), glqAmount) == true,
           "Error transferFrom on the contract"
        );
        
        _totalStaked += glqAmount;

        if (_walletToID[msg.sender] == 0) {
            // add new staker
            uint256 id = _insertTier3();
            _updateCursors();
            _walletToID[msg.sender] = id;
            GlqStaker memory staker = GlqStaker(msg.sender, block.number, glqAmount);
            _stakers[id] = staker;

            // emit event of a new staker registered at current block position
            emit NewStakerRegistered(msg.sender, block.number, glqAmount);
        }
        else {
            uint256 id = _walletToID[msg.sender];
            // claim rewards before adding new staking amount
            if (_stakers[id].amount > 0) {
                claimGlq();
            }
            _stakers[id].amount += glqAmount;
        }
    }

    /*
    ** Emergency withdraw enabled by GLQ team in an emergency case
    */
    function emergencyWithdraw() public walletExists(msg.sender) {
        require(
            _emergencyWithdraw == true,
            "The emergency withdraw feature is not enabled"
        );
        uint256 id = _walletToID[msg.sender];
        GlqStaker storage staker = _stakers[id];
        IERC20 glqToken = IERC20(_glqTokenAddress);

        require(
            staker.amount > 0,
         "Not funds deposited in the staking contract");

        require(
            glqToken.transfer(msg.sender, staker.amount) == true,
            "Error transfer on the contract"
        );
        delete _stakers[id];
        _removeByID(id);
    }

    /*
    ** Withdraw Glq from the staking contract (reduce the tier position)
    */
    function withdrawGlq() public walletExists(msg.sender) {
        uint256 id = _walletToID[msg.sender];
        
        GlqStaker storage staker = _stakers[id];
        IERC20 glqToken = IERC20(_glqTokenAddress);
        require(
            staker.amount > 0,
         "Not funds deposited in the staking contract");
    
        //auto claim when withdraw
        claimGlq();

        _totalStaked -= staker.amount;
        require(
            glqToken.balanceOf(address(this)) >= staker.amount,
            "Insufficient funds from the deployer contract");
        require(
            glqToken.transfer(msg.sender, staker.amount) == true,
            "Error transfer on the contract"
        );
        delete _stakers[id];
        _removeByID(id);
    }

    function percent(uint256 numerator, uint256 denominator, uint256 precision) private pure returns(uint256) {
        uint256 _numerator  = numerator * 10 ** (precision+1);
        // with rounding of last digit
        uint256 _quotient =  ((_numerator / denominator) + 5) / 10;
        return ( _quotient);
    }

    /*
    ** Claim waiting rewards from the staking contract
    */
    function claimGlq() public walletExists(msg.sender) returns(uint256) {
        uint256 id = _walletToID[msg.sender];
        
        GlqStaker storage staker = _stakers[id];
        uint256 glqToClaim = getGlqToClaim(msg.sender);
        IERC20 glqToken = IERC20(_glqTokenAddress);
        if (glqToClaim == 0) { return 0; }

        require(
            glqToken.balanceOf(address(this)) >= glqToClaim,
            "Not enough funds in the staking program to claim rewards"
        );

        staker.block_number = block.number;

        require(
            glqToken.transfer(msg.sender, glqToClaim) == true,
            "Error transfer on the contract"
        );
        return (glqToClaim);
    }
    
    modifier walletExists(address wallet) {
        uint256 id = _walletToID[wallet];
        require(id != 0,"You dont have any tier rank currently in the Staking contract.");
        _;
    }

    /* Setter - Read & Modifications */

}