const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getUserId, getUserDetails, getTargetCountry, getTargetEscrow, number_format,getExchangeRate  } = require("../../../modules/libraries");



const lib = require('../../../modules/libraries');
const {authenticateToken} = require('../../../modules');
const { getTxidUrl,isValidPhoneNumber, validateMSISDN } = require('../../../modules/utilities');
const { iv , GHS_TO_USD} = require('../../contants')
const {   sendcUSD  } = require('./modules/celokit');








export const apiWebhookWithdrawResponse =  async (req, res) => {
  try{
    if (req.method !== "POST"){ return res.status(500).json({ message: 'Not Allowed' }) }
    console.log('BezoTouch Callback messages');
    console.log(JSON.stringify(req.body));
    res.status(200).send(); 
  }catch(e){ console.log(e); res.status(400).send() }  
}

  // 👍🏽 
export const  transactionsGetEscrow  =  async (req, res) => { 
  console.log("Received request for: " + req.url);
  try{  
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);
    const escrows = functions.config().env.escrow;
    let escrowMSISDN = getTargetEscrow(targetCountry, escrows);
    if (escrowMSISDN == null ){return res.json({status: 400, desc: `country not supported`})}
    
    let escrowId  = await getUserId(escrowMSISDN);
    let escrowInfo = await getUserDetails(escrowId);
    console.log('Escrow Address => ', escrowInfo.data().publicAddress, 'country: ', targetCountry);

    let localCurrency = req.user.localCurrency;
    let pairId = await getUserId(`usd_to_${localCurrency}`);
    let usdMarketRate = await getExchangeRate(pairId);
    console.log('usdMarketRate: ', usdMarketRate)
    let cusd2localCurrencyRate = usdMarketRate - (0.02*usdMarketRate);
    res.json({
      "escrowAddress": escrowInfo.data().publicAddress,
      "conversionRate" : { "localCurrency": localCurrency.toUpperCase(), "cusdToLocalCurrencyRate" : `${cusd2localCurrencyRate}` }
    });
  }catch(e){console.log(e); res.json({status: 400, desc: 'invalid request', error: e})}
}
 
  
export const  transactionsTransferP2p =  async (req, res) => {  
  try{
    // console.log("Received request for: " + req.url);
    let sender = req.body.sender;
    let recipient = req.body.recipient;
    let amount = req.body.amount;

    const senderMSISDN = await validateMSISDN(sender, targetCountry);        
    let _isValidSender = await isValidPhoneNumber(senderMSISDN, targetCountry);

    const receiverMSISDN = await validateMSISDN(recipient, targetCountry);     
    let _isValidRecipient = await isValidPhoneNumber(receiverMSISDN, targetCountry);


    if(!_isValidSender || !_isValidRecipient){ return res.json({  "status" : 400, "desc": `Invalid phoneNumber` }) }

    if(_isValidSender && _isValidRecipient){
      const senderId = await getUserId(senderMSISDN);
      let isSenderVerified = await lib.checkIfUserisVerified(senderId);
      if(!isSenderVerified){ return res.json({ "status": 400, "desc": "not verified"  }) }

      // Send funds to the depositor CUSD account
      const recipientId = await getUserId(receiverMSISDN);
      let isRecipientVerified = await lib.checkIfUserisVerified(recipientId);   
      console.log('isverified: ', isRecipientVerified);
      if(!isRecipientVerified){ return res.json({ "status": 'unverified',  "message": "account is unverified" }) }

      let recipientstatusresult = await lib.checkIfRecipientExists(recipientId);
      if(!recipientstatusresult){ return res.json({ "status": 400, "desc": "user account does not exist" }) }

      let senderInfo = await lib.getUserDetails(senderId);
      while (senderInfo.data() === undefined || userInfo.data() === null || userInfo.data() === ''){
        await sleep(1000);
        senderInfo = await lib.getUserDetails(senderId);
        // console.log('Receiver:', receiverInfo.data());
      }
      console.log('User Address => ', senderInfo.data().publicAddress);
      console.log('senderId: ', senderId);
  
      await admin.auth().getUser(senderId)
      .then(user => {
        console.log('Depositor fullName: ',user.displayName); 
        // displayName = user.displayName;
        return;
      })
      .catch(e => {console.log(e)})
      
      // Retrieve User Blockchain Data
      let depositInfo = await lib.getUserDetails(senderId);
      let recipientInfo = await lib.getReceiverDetails(recipientId);
      let escrowprivkey = await getSenderPrivateKey(recipientInfo.data().seedKey, receiverMSISDN, iv);
      let cusdAmount = number_format(amount, 4);
      let ghs_to_usd = await getExchangeRate(GHS_TO_USD);
      if(depositCurrency === "GHS"){ cusdAmount = cusdAmount*ghs_to_usd }
      console.log(`CUSD deposit amount: ${cusdAmount}`); 
      let receipt = await sendcUSD(recipientInfo.data().publicAddress, depositInfo.data().publicAddress, `${cusdAmount}`, escrowprivkey);
      let url = await getTxidUrl(receipt.transactionHash);
      console.log('tx URL', url);

      return res.json({ 
        "status" : 201,      
        "phoneNumber": `${receiverMSISDN}`, 
        "amountTransferred" : { "currency" : `${targetCountry}S`, "amount" : `${amount}`},
        "txnHash" : `${receipt.transactionHash}`      
      });
    }
  }catch(e){ console.log('Error: ',e);  res.json({ "status" : 400, "desc": `your request is invalid` }) }
}
  
  