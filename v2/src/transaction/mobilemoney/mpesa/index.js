const { getUserId, getUserDetails, getTargetCountry, number_format, processApiWithdraw, setProcessedTransaction, getExchangeRate  } = require("../../../../modules/libraries");
const express = require('express');
const cors = require('cors');
const bearerToken = require('express-bearer-token');
const api_v2 = express().use(cors({ origin: true }), bearerToken());
const lib = require('./modules/libraries');
const moment = require('moment');
var {  isValidPhoneNumber, validateMSISDN } = require('./modules/utilities');
const { getLatestBlock, validateWithdrawHash } = require('./modules/celokit');
const jenga = require('./modules/jengakit');
const { USD_TO_KES , escrowMSISDN  } = require('../../../contants')





// 👍🏽
//parameters: {"phoneNumber" : "E.164 number" , "amount" : "value", "txhash" : "value"}
export const transactionWithdrawMpesaSend =  async (req, res) => {
  console.log("Received request for: " + req.url);  
  try{
    let phoneNumber = req.body.phoneNumber;
    let txhash = req.body.txhash;

    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);
    let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

    let _isValidPhoneNumber = await isValidPhoneNumber(userMSISDN, "KE");
    if(!_isValidPhoneNumber){ return res.json({"status" : 400, "desc": `${userMSISDN} is not a valid KE phoneNumber`}) }    
    let userId  = await getUserId(userMSISDN);

    if(txhash == null || txhash ==''){ return res.json({ "status": 400, "desc": `Invalid Hash`, "comment" : `Transaction hash cannot be empty`}) }
    let txreceipt = await lib.validateCeloTransaction(txhash);
    if(txreceipt == null){ return res.json({ "status": 400, "desc": `Invalid Transaction Receipt`, "comment": `Only transactions to the Escrow address can be processed` }) }


    let escrowId  = await getUserId(escrowMSISDN);
    let escrowInfo = await getUserDetails(escrowId);
    let escrowAddress = escrowInfo.data().publicAddress;
    let txdetails = await validateWithdrawHash(txhash, escrowAddress);
    if(txdetails.status != "ok"){ return res.json({ "status": 400, "desc" : `Invalid Hash`, "comment" : `${txdetails.status}`}) }
    let validblocks = txdetails.txblock;
    let _validblocks = parseInt(validblocks);
    _validblocks = _validblocks + 1440;
    let latestblock = await getLatestBlock();
    let _latestblock = parseInt(latestblock.number);
    if(txreceipt.status != true || _validblocks < _latestblock ){ return res.json({"status": 400, "desc": `Invalid Transaction`, "blockNumber" : txdetails.txblock, "latestBlock" : _latestblock })}

    console.log('Processing MPESA withdraw Transaction')
    
    let userExists = await lib.checkIfSenderExists(userId);
    if(userExists === false){         
      let userCreated = await lib.createNewUser(userId, userMSISDN);     
      console.log('Created user with userID: ', userCreated); 
    }
    let isverified = await lib.checkIfUserisVerified(userId);   
    console.log('isverified: ', isverified);
    if(!isverified){ return res.json({ "status": 400, "desc": "user account is not verified" })}
    
    let isProcessed = await lib.getProcessedTransaction(txhash);
    console.log('isProcessed: ', isProcessed) 
    if(isProcessed){ return res.json({ "status": 400, "desc": `Transaction Hash is already processed` }) }

    let withdrawDetails = {
      "blockNumber" : txdetails.txblock,
      "value" : `${txdetails.value} CUSD`,
      "from" : txdetails.from,
      "to" : txdetails.to,
      "date" : moment().format('YYYY-MM-DD, HH:mm:ss')
    }
    let _cusdAmount = number_format(txdetails.value, 4);
    let usdMarketRate = await getExchangeRate(USD_TO_KES);
    let cusdWithdrawRate = usdMarketRate*0.98;
    let kesAmountToReceive =  _cusdAmount*cusdWithdrawRate;
    kesAmountToReceive = number_format(kesAmountToReceive, 0)
    console.log(`Withdraw Amount KES: ${kesAmountToReceive}`);
    let jengabalance = await jenga.getBalance();
    console.log(`Jenga Balance: KES ${jengabalance.balances[0].amount}`);                

    if(kesAmountToReceive > jengabalance.balances[0].amount){ return res.json({ "status": 400, "desc": `Not enough fiat balance to fulfill the request`, "comment" : `Contact support to reverse your tx: ${txhash}` })}
    // Add auto-reverse on the smartcontract (TimeLock)
    console.log(txhash, ' Transaction hash is valid...processing payout')
    let jengaResponse = await processApiWithdraw(userMSISDN, kesAmountToReceive, txhash);
    console.log(jengaResponse);
    await setProcessedTransaction(txhash, withdrawDetails)
    console.log(txhash, ' Transaction processing successful')
    res.json({
      "status" : 201,
      "desc" : "Withdraw Transaction processing successful",
      "cusdDetails" : withdrawDetails,
      "MpesaDetails" : jengaResponse
    });
  } catch (e) { console.log(e); res.json({ "status" : 400, "desc" : `Invalid request` }) }
}


 //parameters: {celloAddress, phoneNumber, amount} 
  // 👍🏽

export const transactionWithdrawGetMpesaStatus = async (req, res) => { 
  try{
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);
    if(targetCountry != "KE") {return res.json({ "status" : 400, "desc" : `Invalid request` })}

    let requestId = req.body.requestId;
    let requestDate = req.body.requestDate;
    let status = await jenga.getTransactionStatus(requestId, requestDate);
    let _mpesaref = status.mpesaref;

    if(_mpesaref.length > 2){ return res.json(status) }
    if(_mpesaref.length == 0){ return res.json({status: 400, desc: "Mpesa Transaction not found"}) }

  } catch (e) { res.json({ "status" : 400, "user" : `Invalid request` }) }
}
  
  
 