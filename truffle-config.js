const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: 'NYIF5A6SX811WXZ2PP4F3ZNYSQZFRA6R36'
  },
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545,
      accounts: 50,
      defaultEtherBalance: 100,
      network_id: "*"
    },
    development: {
      provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/4f477eb263cd4f2d8777c2ed46ac552f`),
      //provider: () => new HDWalletProvider(mnemonic, `http://127.0.0.1:7545`),
      //host: "127.0.0.1",
      // network_id: "5777",
      // port: 7545,
      network_id: "3",
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    mainnet: {
      provider: () => new HDWalletProvider(mnemonic, `https://mainnet.infura.io/v3/4f477eb263cd4f2d8777c2ed46ac552f`),
      // host: "127.0.0.1",
      network_id: 1,
      confirmations: 10,
      gas: "4000000",
      gasPrice: "200000000000",
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.0"
    }
  }
};