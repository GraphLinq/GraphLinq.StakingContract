// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

struct Item {
    uint256 next;
    uint256 prev;
    bool valid;
}

contract TierCompute {

    uint256 uniqueIndex = 1;
    mapping(uint256 => Item) public items;
    uint256 public tier1_head = 0;
    uint256 public tier2_head = 0;
    uint256 public tier3_head = 0;
    uint256 public last = 0;
    uint256 public total_tier1 = 0;
    uint256 public total_tier2 = 0;
    uint256 public total_stakes = 0;
    uint256 public tier1_percent = 15;
    uint256 public tier2_percent = 40;

    
    function _add() internal {
        //create new last element
        _insertTier3();
        
        //update cursors
        _updateCursors();
        _updateCursors();
    }
    
    function _removeByID(uint256 id) internal {
        Item memory item = items[id];
        require(item.valid, "User not found");
        uint8 myTier = getTier(id);

        // update counters
        if(myTier == 1) total_tier1--;
        else if(myTier == 2) total_tier2--;
        total_stakes--;
        //remove from linked list
        _stitch(item.prev, item.next);

        if(id == last) {
            last = item.prev; //handle if last unstaked
        }
        if(id == tier1_head) {
            //handle if tier1 head unstaked
            if(item.next == tier2_head) {
                tier1_head = 0; //no elements in tier1 left 
            } else {
                tier1_head = item.next; 
            }
        } else if(id == tier2_head) {
            // handle if first of tier2 unstaked
            if(item.next == tier3_head) {
                tier2_head = 0;
            } else {
                tier2_head = item.next; 
            }
        } else if(id == tier3_head) {
            // handle if first of tier3 unstaked
            tier3_head = item.next; //could be 0 if last
        }
        
        //update cursors
        _updateCursors();
        _updateCursors();
        
        //free memory
        delete items[id];
    }
    
    function _setTier1Percent(uint256 percent) internal {
        tier1_percent = percent;
    }
    
    function _setTier2Percent(uint256 percent) internal {
        tier2_percent = percent;
    }
    
    function getTier(uint256 id) public view returns(uint8 tier) {
        if(id < tier2_head) return 1;
        if(id >= tier3_head) return 3;
        return 2;
    }
    
    function getTier1() public view returns(uint256[] memory list) {
        list = new uint256[](total_tier1);
        if(tier1_head == 0) return list;
        list[0] = tier1_head;
        uint256 it = tier1_head;
        uint256 i = 1;
        while(items[it].next != tier2_head) {
            list[i] = items[it].next;
            it = items[it].next;
            i++;
        }
    }
    
    function getTier2() public view returns(uint256[] memory list) {
        list = new uint256[](total_tier2);
        if(tier2_head == 0) return list;
        list[0]=tier2_head;
        uint256 it = tier2_head;
        uint256 i = 1;
        while(items[it].next != tier3_head) {
            list[i] = items[it].next;
            it = items[it].next;
            i++;
        }
    }
    
    function getTier3() public view returns(uint256[] memory list) {
        list = new uint256[](total_stakes - total_tier1 - total_tier2);
        if(tier3_head == 0) return list;
        list[0]=tier3_head;
        uint256 it = tier3_head;
        uint256 i = 1;
        while(items[it].next != 0) {
            list[i] = items[it].next;
            it = items[it].next;
            i++;
        }
    }
    
    function _upgradeTier3() internal {
        if(tier3_head > 0) {
            total_tier2++;
            if(tier2_head == 0) {
                //there is no element in tier2
                tier2_head = tier3_head;
            }
            tier3_head = items[tier3_head].next;
            //if there is only one element in tier3
            //tier3_head is now 0 since next of last element is 0
        }
    }
    
    function _upgradeTier2() internal {
        if(tier2_head == 0) {
            //no tier2
            if(tier3_head > 0)
                _upgradeTier3();
            else return; //nothing to do
        }
        
        // at this point we should have at least one element in tier2
        total_tier1++;
        total_tier2--;
        if(tier1_head == 0) {
            tier1_head = tier2_head;
        }
        tier2_head = items[tier2_head].next; //could be 0
    }
    
    function _downgradeTier1() internal {
        if(tier1_head == 0) {
            return;
        }
        total_tier1--;
        total_tier2++;
        tier2_head = items[tier2_head].prev;
        if(total_tier1 == 0)
        tier1_head = 0;
    }
    
    function _downgradeTier2() internal {
        if(tier2_head == 0) {
            return; //nothing to do
        }
        
        // at this point we should have at least one element in tier2
        total_tier2--;
        tier3_head = items[tier3_head].prev; //could be 0
        if(total_tier2 == 0)
        tier2_head = 0;
    }
    
    function _updateCursors() internal {
        uint256 tier1 = getDesiredTier1Nb();
        uint256 tier2 = getDesiredTier2Nb();
        
        if(tier1 > total_tier1) {
            _upgradeTier2();
        } else if(tier1 < total_tier1) {
            _downgradeTier1();
        }
        if(tier2 > total_tier2) {
            _upgradeTier3();
        } else if(tier2 < total_tier2) {
            _downgradeTier2();
        }
        
    }
    
    //at least one per tier is always desired
    function getDesiredTier1Nb() public view returns (uint256) {
        return total_stakes * tier1_percent / 100;
    }
    //at least one per tier is always desired
    function getDesiredTier2Nb() public view returns (uint256) {
        return total_stakes * tier2_percent / 100;
    }
    
    function _stitch(uint256 a, uint256 b) internal {
        Item storage itemA = items[a];
        Item storage itemB = items[b];
        if(a == b && b == 0) {
            return;
        }
        if(a == 0) {
            // b becomes first
            itemB.prev = a;
        } else if(b == 0) {
            // a becomes last
            itemA.next = 0;
        } else {
            itemA.next = b;
            itemB.prev = a;
        }
    }
    
    function _insertTier3() internal returns (uint256 id) {
        Item storage item = items[uniqueIndex];
        item.prev = last; //0 if first stake
        item.valid = true; //used to find empty items
        if(last > 0) //if last is valid, his next is now the new element
            items[last].next = uniqueIndex;
        last = uniqueIndex; // we are now last
        if(tier3_head == 0) {
            tier3_head = uniqueIndex;
        }
        id = uniqueIndex;
        total_stakes++;
        uniqueIndex++;
    }
}