const request = require('request');
const util = require('util')

var request_promise = util.promisify(request)

var banHelper = {
  sendBan: async function(address, amount){
    var amount_raw =((Math.floor(amount*100)/100.0)*1e+29).toLocaleString('fullwide', {useGrouping:false})
    var url = "http://213.136.74.88/send?action=send&wallet=" + config.result[0]["wallet_id"] + "&source=" + config.result[0]["ban_deposit_address"] + "&destination=" + address + "&amount=" + amount_raw + "&pass="+config.result[0]["ban_send_key"]+""
    var result = await request_promise(url, {
      json: true
    });
    return result.body['block']
  }
}

module.exports = banHelper
