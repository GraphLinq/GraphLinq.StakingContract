// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./libs/maths/SafeMath.sol";
import "./libs/string.sol";
import "./interfaces/IERC20.sol";
import "./libs/sort.sol";

struct GlqStaker {
    address wallet;
    uint256 block_number;
    uint256 amount;
    uint256 index_at;
}

struct GraphLinqApyStruct {
    uint256 tier1Apy;
    uint256 tier2Apy;
    uint256 tier3Apy;      
}

contract GlqStakingContract {

    using SafeMath for uint256;
    using strings for *;
    using QuickSorter for *;

    event NewStakerRegistered (
        address staker_address,
        uint256 at_block,
        uint256 amount_registered
    );

    event ReceivedFunds(uint256 amount);

    /*
    ** Manager of the contract to add/remove APYs bonuses into the staking contract
    */
    address private _glqDeployerManager;

    /*
    ** Current amount of GLQ available in the pool as rewards
    */
    uint256 private _totalGlqIncentive;

    GlqStaker[]                     public _stakers;
    uint256                         private _stakersIndex;
    uint256                         private _totalStaked;

    mapping(address => uint256)     private _indexStaker;
    uint256                         private _blocksPerYear;
    GraphLinqApyStruct              private _apyStruct;
    mapping(address => uint256)     private _migrationClaim;
    uint256                         public _indexWithdrawed;


    constructor(address manager) {
        _glqDeployerManager = manager;

        _totalStaked = 0;
        _stakersIndex = 1;
        
        _blocksPerYear = 2102400;
        
        // default t1: 30%, t2: 15%, t3: 7.5%
        _apyStruct = GraphLinqApyStruct(35*1e18, 15*1e18, 8*1e18);
    }
 
    // new add incentive
    receive() external payable {
        emit ReceivedFunds(msg.value);
        _totalGlqIncentive += msg.value;
    }

    function setIndexWithdrawed(uint256 indexWithdrawed) public {
         require(address(msg.sender) == _glqDeployerManager, "unauthorized access");
        _indexWithdrawed = indexWithdrawed;
    }

    function setMigrationStaker(GlqStaker[] memory stakers, uint256 offset) external {
        for (uint i = 0; i < stakers.length; i++)
        {
            _stakers.push(stakers[i]);
            _indexStaker[stakers[i].wallet] = offset+1;
            _totalStaked = _totalStaked.add(stakers[i].amount);
            offset++;
        }
        _stakersIndex = offset+1;
    }

    /*
    ** Setting GLQ claimable from ETH side
    */
    function setClaimMigration(address[] memory addresses, uint256[] memory amounts, uint256 len) public {
        require(address(msg.sender) == _glqDeployerManager, "unauthorized access");
         for (uint i = 0; i < len; i++) {
            _migrationClaim[addresses[i]] = amounts[i];
         }
    }

    /*
    ** Claim your GLQ from the chain migration
    */
    function claimFromMigration() public {
        address payable sender = payable(msg.sender);
        require(_migrationClaim[sender] > 0, "Nothing to claim from the Ethereum network stake.");

        uint256 amount = _migrationClaim[sender];
        _migrationClaim[sender] = 0;
        sender.transfer(amount);
    }   

    /*
    ** Return how much is claimable from the ETH Migration
    */
    function getClaimFromMigration(address wallet) public view returns(uint256) {
        return _migrationClaim[wallet];
    }

    /* Getter ---- Read-Only */


    /*
    ** Return the staker info from wallet index
    */
    function getStaker(address wallet) public view returns (GlqStaker memory) {
         uint256 index = _indexStaker[wallet];
         return _stakers[index-1];
    }

    /*
    ** Return the sender wallet position from the tier system
    */
    function getWalletCurrentTier(address wallet) public view returns (uint256) {
        uint256 currentTier = 3;
        uint256 index = _indexStaker[wallet];
        require(
            index != 0,
            "You dont have any tier rank currently in the Staking contract."
        );
        GlqStaker memory staker = _stakers[index-1];

        if (staker.index_at == 0) {
            return currentTier;
        }

        uint256 walletAggregatedIndex = (index).mul(1e18);
        uint256 len = _stakers.length + _indexWithdrawed;

        // Total length of stakers
        uint256 totalIndex = len.mul(1e18);
        // 15% of hodlers in T1 
        uint256 t1MaxIndex = totalIndex.div(100).mul(15);
        // 55% of hodlers in T2
        uint256 t2MaxIndex = totalIndex.div(100).mul(55);

        if (walletAggregatedIndex <= t1MaxIndex) {
            currentTier = 1;
        } else if (walletAggregatedIndex > t1MaxIndex && walletAggregatedIndex <= t2MaxIndex) {
            currentTier = 2;
        }

        return currentTier;
    }

    /*
    ** Return rank position of a wallet
    */
    function getPosition(address wallet) public view returns (uint256) {
         uint256 index = _indexStaker[wallet];
         GlqStaker memory staker = _stakers[index-1];
         if (staker.index_at == 0) { 
            return _stakers.length;
         }
         return index;
    }

    /*
    ** Return the amount of GLQ that a wallet can currently claim from the staking contract
    */
    function getGlqToClaim(address wallet) public view returns(uint256) {
        uint256 index = _indexStaker[wallet];
        require (index > 0, "Invalid staking index");
        GlqStaker storage staker = _stakers[index-1];

        uint256 calculatedApr = getWaitingPercentAPR(wallet);
        return staker.amount.mul(calculatedApr).div(100).div(1e18);
    }

    /*
    ** Return the current percent winnable for a staker wallet
    */
    function getWaitingPercentAPR(address wallet) public view returns(uint256) {
        uint256 index = _indexStaker[wallet];
        require (index > 0, "Invalid staking index");
        GlqStaker storage staker = _stakers[index - 1];

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
        uint256 index = _indexStaker[wallet];
        if (index == 0) { return 0; }
        return _stakers[index-1].amount;
    }

    /*
    ** Count the total numbers of stakers in the contract
    */
    function getTotalStakers() public view returns(uint256) {
        return _stakers.length;
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
    function getTopStakers() public view returns(address[] memory, uint256[] memory) {
        uint256 len = _stakers.length;
        address[] memory addresses = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        uint256 found = 0;

        for (uint i = 0; i < len && found <= 2; i++) {
            if (_stakers[i].amount != 0) {
                addresses[i] = _stakers[i].wallet;
                amounts[i] = _stakers[i].amount;
                found++;
            }
        }

        return (addresses, amounts);
    }

    /*
    ** Return the total amount deposited on a rank tier
    */
    function getTierTotalStaked(uint tier) public view returns (uint256) {
        uint256 totalAmount = 0;

        // Total length of stakers
        uint256 totalIndex = _stakers.length.mul(1e18);
        // 15% of hodlers in T1 
        uint256 t1MaxIndex = totalIndex.div(100).mul(15);
        // 55% of hodlers in T2
        uint256 t2MaxIndex = totalIndex.div(100).mul(55);

        uint startIndex = (tier == 1) ? 0 : t1MaxIndex.div(1e18);
        uint endIndex = (tier == 1) ? t1MaxIndex.div(1e18) : t2MaxIndex.div(1e18);
        
        if (tier == 3) {
            startIndex = t2MaxIndex.div(1e18);
            endIndex = _stakers.length;
        }

        for (uint i = startIndex; i <= endIndex && i < _stakers.length; i++) {
            totalAmount +=  _stakers[i].amount;
        }
      
        return totalAmount;
    }

    /* Getter ---- Read-Only */


    /* Setter - Read & Modifications */


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


    /*
    ** Remove GLQ liquidity from the staking contract for stakers rewards 
    */
    function removeIncentive(uint256 glqAmount) public {
        address payable deployer = payable(_glqDeployerManager);
        require(
            msg.sender == _glqDeployerManager,
            "Only the Glq Deployer can remove incentive from the smart-contract");
        deployer.transfer(glqAmount);
    }

    /*
    ** Deposit GLQ in the staking contract to stake & earn
    */
    function depositGlq() public payable {
        require (msg.value >= 10000*1e18, "You need to stake at least 10K GLQ");
        uint256 index = _indexStaker[msg.sender];
        _totalStaked += msg.value;

        if (index == 0) {
            GlqStaker memory staker = GlqStaker(msg.sender, block.number, msg.value, _stakersIndex);
            _stakers.push(staker);
            _indexStaker[msg.sender] = _stakersIndex;

            // emit event of a new staker registered at current block position
            emit NewStakerRegistered(msg.sender, block.number, msg.value);
            _stakersIndex = _stakersIndex.add(1);
            
        }
        else {
            // claim rewards before adding new staking amount
            if (_stakers[index-1].amount > 0) {
                claimGlq();
            }

            _stakers[index-1].block_number = block.number;
            _stakers[index-1].amount += msg.value;
        }
    }

    /*
    ** Withdraw Glq from the staking contract
    */
    function withdrawGlq() public {
        uint256 index = _indexStaker[msg.sender];
        address payable src = payable(msg.sender);
        require (index > 0, "Invalid staking index");
        GlqStaker storage staker = _stakers[index - 1];
        require(
            staker.amount > 0,
         "Not funds deposited in the staking contract");
    
        //auto claim when withdraw
        claimGlq();
        
        _stakers[index-1].block_number = block.number;
        _totalStaked -= staker.amount;

        uint256 amount = staker.amount;
        
        staker.amount = 0;
        src.transfer(amount);
        
        if (staker.index_at != 0) {
            staker.index_at = 0;
            _indexWithdrawed += 1;
        }

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
    function claimGlq() public returns(uint256) {
        uint256 index = _indexStaker[msg.sender];
        GlqStaker storage staker = _stakers[index - 1];
        address payable sender = payable(msg.sender);
        require (index > 0, "Invalid staking index");

        uint256 glqToClaim = getGlqToClaim(msg.sender);
        if (glqToClaim == 0) { return 0; }

        staker.block_number = block.number;
        sender.transfer(glqToClaim);
        return (glqToClaim);
    }

    /* Setter - Read & Modifications */

}