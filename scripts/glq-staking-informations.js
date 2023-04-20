const fs = require("fs").promises;

var BN = web3.utils.BN;

async function saveFile(contentRaw)
{
    return new Promise((res, rej) => {
        fs.writeFile("./stakers.json", contentRaw, 'utf8', function (err) {
            if (err) { return console.log(err); }
            res()
        });
    })
}


function incrementHex(hexNumber, i, web3) {
    const bigInt = web3.utils.toBN(hexNumber);
    const incrementedBigInt = bigInt.add(web3.utils.toBN(i));
    const incrementedHexNumber = incrementedBigInt.toString(16);
    return '0x'+incrementedHexNumber;
}

module.exports = async function(callback) {
    let address = '0x86B001daBC08F92f3349877bda3e43a2Cf79D086'; // contract address

    try {
        let newIndex = web3.utils.soliditySha3(2); // goto array first case
        let data = [];
        let withdrawn = 0
        let stakers_count = 0

        for (let i = 0; i < 10000; i += 4) {
            let wallet_value = await web3.eth.getStorageAt(address, incrementHex(newIndex, i, web3));
            let block_number_value = await web3.eth.getStorageAt(address, incrementHex(newIndex, i + 1, web3));
            let amount_value = await web3.eth.getStorageAt(address, incrementHex(newIndex, i + 2, web3));
            let index_at_value = await web3.eth.getStorageAt(address, incrementHex(newIndex, i + 3, web3));

            if (wallet_value == '0x0000000000000000000000000000000000000000000000000000000000000000') {
                break ;
            }

            let currentData = {
                wallet: `0x${(wallet_value.slice(26))}`,
                block_number: parseInt(block_number_value, 16),
                amount:  web3.utils.toBN(amount_value).toString(),
                index_at: parseInt(index_at_value, 16)
            };
            console.log(`${currentData.wallet} at index ${currentData.index_at} with amount ${currentData.amount} (${currentData.block_number})`)
            if (currentData.index_at === 0) {
                withdrawn++;
            }
            data.push(currentData);
            stakers_count++;
        }
        console.log(`There is a total of ${stakers_count} stakers addresses pushed in the contract and ${withdrawn} already withdrew their stakes`)

        var stringifyVersion = JSON.stringify(data)
        await saveFile(stringifyVersion)
    } catch (error) {
        console.log(error)
    }

}
