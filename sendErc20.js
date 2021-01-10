const path = require('path');
var fs = require('fs');
var Web3 = require('web3')
var Tx = require('ethereumjs-tx').Transaction;
const web3 = new Web3('https://apis.ankr.com/fe145190c1b844b988f4514388034a98/add29bd8035a7521c7aece8c2a30aadf/binance/full/main')
const {
  sign
} = require('@warren-bank/ethereumjs-tx-sign')


var ercHelper = {
  abi: null,
  contract: null,
  init: async function() {

    this.abi = JSON.parse(fs.readFileSync("./WBanano.json", 'utf-8'));

    var contractAddress = config.result[0]["eth_address_contract"];
    this.contract = new web3.eth.Contract(this.abi['abi'], contractAddress, {
      from: config.result[0]["eth_address_wban_mint_wallet"]
    });


  },
  doInitialTransfer: async function(recipient, amount) {
    var transferAmount = web3.utils.toWei(amount + "", 'ether') + "";

    var nonce = await web3.eth.getTransactionCount(config.result[0]["eth_address_wban_mint_wallet"], "pending");


    var gas_limit = await this.contract.methods.initialTransfer(recipient, transferAmount, 100000).estimateGas({
      "from": config.result[0]["eth_address_wban_mint_wallet"],
      "nonce": nonce,
      "to": recipient,
      "data": this.abi['bytecode']
    })


    var gas_price = '2000000000' //BSC 

    console.log("Gas Limit: " + gas_limit)
    console.log("Gas price: " + gas_price)

    var chainId = await web3.eth.getChainId()
    const networkId = await web3.eth.net.getId();
    console.log(chainId)
    console.log(networkId)


    console.log("From: " + config.result[0]["eth_address_wban_mint_wallet"])
    console.log("To: " + config.result[0]["eth_address_contract"])


    var rawTransaction = {
      "from": config.result[0]["eth_address_wban_mint_wallet"],
      "nonce": "0x" + nonce.toString(16),
      "gasPrice": "0x" + gas_price.toString(16),
      "gasLimit": "0x" + gas_limit.toString(16),
      "to": config.result[0]["eth_address_contract"],
      "value": "0x0",
      "data": this.contract.methods.initialTransfer(recipient, transferAmount, gas_limit).encodeABI(),
      "chainId": "0x38",
      "networkId": "0x38"

    };

    console.log(rawTransaction)


    const {
      rawTx
    } = sign(rawTransaction, config.result[0]["eth_private_key_wban_mint_wallet"])


    const serializedTx = `0x${rawTx}`;

    var tx = await web3.eth.sendSignedTransaction(serializedTx);
    console.log(tx)

    return tx['transactionHash']

    // var privKey = new Buffer(config.result[0]["eth_private_key_wban_mint_wallet"], 'hex');
    // var tx = new Tx(rawTransaction,{chain:'rinkeby', hardfork: 'petersburg'});
    // tx.sign(privKey);
    // var serializedTx = tx.serialize();
    //
    // console.log(`Attempting to send signed tx:  ${serializedTx.toString('hex')}`);
    // var receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
    // console.log(receipt)
    // return receipt['transactionHash']
  },
  getReceipt: async function(eth_address) {
    var res = await this.contract.methods.getBanTicket(eth_address).call()
    console.log(res)
    var ban_address = res.substr(res.indexOf('ban_'), 64)
    var decimals = await this.contract.methods.decimals().call()

    var amount = parseFloat(res.substr(res.indexOf('ban_') + 64, res.length)) / (Math.pow(10, decimals))
    console.log("Ban address: " + ban_address + " Amount: " + amount)

    return [res, ban_address, amount]
  }
}

module.exports = ercHelper
