require('./mysql.js');
require('./config.js')
require('./misc.js')
var ethHelper = require('./sendErc20.js')
var banHelper = require('./banHelper.js')

var express = require('express');
const request = require('request');
const util = require('util')

var request_promise = util.promisify(request)
var app = express();

async function setUp(){
  await conn.init()
  await config.init()
  await ethHelper.init()
}
setUp()

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', async function(req, res) {

  res.send('this is the wBan interface api. Feel free to contact @David_99#7098 on Discord if you find any bugs.' + req.query.address);

});


app.get('/checkBanAddress', async function(req, res) {

  var address = req.query.ban_address
  var amount = await conn.query("SELECT SUM(amount) FROM ban_deposits WHERE used = 0 AND sender = ?;",[address]);
  amount = amount[0]['SUM(amount)']

  var enough = false

  if(amount >= config.result[0]["min_ban_swap_value"]){
    enough = true
  }
  res.send({enough:enough, total:amount ,remaining: config.result[0]["min_ban_swap_value"]-amount});

});


app.get('/initBanDepositSwap', async function(req, res) {
  var ban_address = req.query.ban_address
  var eth_address = req.query.eth_address
  var random_token = helper.generateSeed()

  var current_time = helper.getTimestamp()

  var already_in_use = await conn.query("SELECT id FROM deposit_locks WHERE ((ban_address = ? AND eth_address != ?) OR (ban_address != ? AND eth_address = ?)) AND ?-time <= ? AND canceled = 0 AND used = 0;",[ban_address,eth_address,ban_address,eth_address,current_time,config.result[0]["deposit_time_lock_seconds"]])

  var is_already_in_use = true
  if(already_in_use.length == 0){
    await conn.query("INSERT INTO deposit_locks(ban_address,eth_address,time,token)VALUES(?,?,?,?)",[ban_address,eth_address,helper.getTimestamp(),random_token])
    is_already_in_use = false
  }
  res.send({locked:is_already_in_use,token:random_token})
})


app.get('/cancelBanDepositSwap', async function(req, res) {
  var token = req.query.token


  var locked = await conn.query("SELECT * FROM deposit_locks WHERE token = ? AND canceled = 0 AND used = 0;",[token])
  if(locked.length == 0){
    return
  }


  await conn.query("UPDATE deposit_locks SET canceled = 1 WHERE token = ?;",[token])
  //await conn.query("BEGIN;")
  await conn.query("SELECT * FROM ban_deposits WHERE used = 0 AND sender = ?;",[locked[0]['ban_address']])
  var amount = await conn.query("SELECT SUM(amount) FROM ban_deposits WHERE used = 0 AND sender = ?;",[locked[0]['ban_address']]);
  await conn.query("UPDATE ban_deposits SET used = 1 WHERE used = 0 AND sender = ?;",[locked[0]['ban_address']])
  //await conn.query('COMMIT;')


  var result = await banHelper.sendBan(locked[0]['ban_address'],amount[0]['SUM(amount)'])

  if((typeof result) != 'undefined'){
    res.send({block:result})
  }else{
    res.send({block:false})
  }
})


app.get('/confirmSwap', async function(req, res) {
  var token = req.query.token

  var locked = await conn.query("SELECT * FROM deposit_locks WHERE token = ? AND canceled = 0 AND used = 0;",[token])
  if(locked.length == 0){
    return
  }

  var amount = await conn.query("SELECT SUM(amount) FROM ban_deposits WHERE used = 0 AND sender = ?;",[locked[0]['ban_address']]);
  amount = amount[0]['SUM(amount)']
  if(amount < config.result[0]["min_ban_swap_value"]){
    return
  }

  //mark as used, etc

  await conn.query("UPDATE deposit_locks SET used = 1 WHERE token = ?;",[token])
  await conn.query("UPDATE ban_deposits SET used = 1 WHERE used = 0 AND sender = ?;",[locked[0]['ban_address']])

  var receipt = await ethHelper.doInitialTransfer(locked[0]['eth_address'],amount)

  res.send({tx_hash:receipt})

})

app.get('/swapBack', async function(req, res) {
  var eth_address = req.query.eth_address
  console.log(eth_address)
  var receipt = await ethHelper.getReceipt(eth_address)
  var is_there = await conn.query("SELECT * FROM withdraw_recipes WHERE receipt = ?;",[receipt[0]])
  if(is_there > 0){
    res.send({msg:"Banano already sent.",tx_hash:null})
    return
  }
  await conn.query("INSERT INTO withdraw_recipes(receipt,timestamp) VALUES(?,?);",[receipt[0],helper.getTimestamp()])

  var result = await banHelper.sendBan(receipt[1],receipt[2])

  res.send({msg:"Banano have been sent.",tx_hash: result})

})



app.listen(2341, () => {
  console.log(`Example app listening at http://localhost:${2341}`)
})



setInterval(async function() {
  var result = await request_promise('http://213.136.74.88/get_blocks?wallet=ban_1wban3quebxo6q6wy796te3bu31hbcis8fq76hz8oqc96p1xr4pbxrkxyie6', {
    json: true
  });

  var history = result.body['history']

  var last_time = await conn.query('SELECT date FROM ban_deposits ORDER BY date DESC LIMIT 1',[]);
  if(last_time.length == 0){
    last_time = 0
  }else{
    last_time = last_time[0]['date']
  }
  for(var i in history){
    var tx = history[i]
    var hash = tx['hash']
    // if(last_time-tx['local_timestamp'] > -20){
    //   break
    // }
    if(tx['type'] == 'receive' ){ //tx['local_timestamp']-last_time > -20

      var exists = await conn.query('SELECT id FROM ban_deposits WHERE tx_hash = ?',[hash]);
      if(exists.length == 0){
        console.log("Received deposit from "+tx['account'])
        await conn.query('INSERT INTO ban_deposits(sender,amount,tx_hash,used,date) VALUES(?,?,?,0,?)',[tx['account'],tx['amount']/1e+29,hash,tx['local_timestamp']])
      }
    }
  }

}, 3000);
