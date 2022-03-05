const admin = require('firebase-admin');
const firestore = admin.firestore();
const { getUserId, getUserDetails, getTargetCountry, getLocalCurrencyAmount, number_format, checkIfSenderExists,  checkisUserKyced, } = require("../../modules/libraries");
const lib = require('../../modules/libraries');
const {generateAccessToken } = require('../../modules');
var { createcypher, sendMessage, isValidPhoneNumber, validateMSISDN } = require('../../modules/utilities');
//GLOBAL ENV VARIABLES
const {iv} = require('../contants')
const {  weiToDecimal, getContractKit,  } = require('../../modules/celokit');
const kit = getContractKit();



// 👍🏽 
export const login = async (req, res) => {
  let userMSISDN = await validateMSISDN(req.body.phoneNumber, req.body.countryCode)
  console.log('MSISDN:', userMSISDN);
  let userId = await lib.getUserId(userMSISDN);

  let userInfo = await lib.getKotaniPartnerDetails(userId);
  if (userInfo.data() === undefined || userInfo.data() === null || userInfo.data() === '') {
    return res.status(400).send('Cannot find user')
  }
  try {
    if(await bcrypt.compare(req.body.password, userInfo.data().password)) {
      const accessToken = generateAccessToken(userInfo.data());
      res.json({ status:201, accessToken: accessToken });
    } 
    else {return res.json({status:400, desc: 'Not Allowed'})}
  } catch (e){console.log(e); res.status(500).send() }
}

 // 👍🏽
 export const resetPin = async (req, res) => {
  try{
    console.log("Received request for: " + req.url);
    const phoneNumber = req.body.phoneNumber;
    const newUserPin = req.body.newUserPin;
    let permissionLevel = req.user.permissionLevel;
    let userNumber = req.user.phoneNumber;
    console.log('UserNumber: ', userNumber, 'permission: ', permissionLevel);

    if(permissionLevel != "support" && permissionLevel != "admin") {return res.status(401).send({status: 'Unauthorized'})}
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);
    let _isValidPhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidPhoneNumber ', _isValidPhoneNumber)

    if(!_isValidPhoneNumber){return res.json({ "status": 400, "desc": `Invalid PhoneNumber`})}

    if(_isValidPhoneNumber){
      let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

      let userId  = await getUserId(userMSISDN)
      let userstatusresult = await checkIfSenderExists(userId);
      if(!userstatusresult){ console.log('User does not exist: '); return res.json({ "status": 400, "desc": `User does not exist` }) } 

      let isKyced = await checkisUserKyced(userId);
      if(!isKyced) { return res.json({ "status": 400, "desc": `User is not KYC'ed` })}
      if(newUserPin.length < 4 ) {return res.json({status: 400, desc: `PIN must be atleast 4 characters`})}
      console.log('newUserPin', newUserPin)
      let enc_loginpin = await createcypher(newUserPin, userMSISDN, iv);
      await firestore.collection('hashfiles').doc(userId).update({'enc_pin' : `${enc_loginpin}`});
      let message2sender = `Your Kotani Pay PIN has been updated.\nDial *483*354# to access the KotaniPay Ecosystem.\nNew User PIN: ${newUserPin}`;
      sendMessage("+"+userMSISDN, message2sender);

      res.json({ "status": 201, "desc": `${userMSISDN} Kotani Pay PIN updated successfully` });    
    }   
  }catch(e){ console.log(JSON.stringify(e)); res.json({ "status": 400, "desc": `invalid information provided` }) }
} 

// 👍🏽 
  //parameter: {"phoneNumber" : "E.164 number" } 
 export const getBalance =  async (req, res) => {
  console.log("Received request for: " + req.url);
  try {
    let localCurrency = req.user.localCurrency;
    let permissionLevel = req.user.permissionLevel;
    if(permissionLevel != "partner" && permissionLevel != "admin" ){ return res.json({ status: 400, desc: `Unauthorized request` }) }
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry)    // req.user.targetCountry;       

    let userMSISDN = await validateMSISDN(`${req.body.phoneNumber}`, targetCountry); 
    let _isValidPhoneNumber = await isValidPhoneNumber(userMSISDN, targetCountry);
    if(!_isValidPhoneNumber){ return res.json({ status: 400, user: `${req.user.name}`, phoneNumber: `${userMSISDN}`, desc: `Invalid phoneNumber` })}
    
    let userId  = await getUserId(userMSISDN);
    let userstatusresult = await checkIfSenderExists(userId);
    console.log("User Exists? ",userstatusresult);
    if(!userstatusresult){ return res.json({status: 400, desc: `user does not exist`}) }
    let userInfo = await getUserDetails(userId);
    console.log('User Address => ', userInfo.data().publicAddress);
    
    const cusdtoken = await kit.contracts.getStableToken()
    let cusdBalance = await cusdtoken.balanceOf(userInfo.data().publicAddress) // In cUSD
    console.log(`CUSD Balance Before: ${cusdBalance}`)
    console.info(`Account balance of ${await weiToDecimal(cusdBalance)} CUSD`)
    let localCurrencyAmount = await getLocalCurrencyAmount(cusdBalance, `usd_to_${localCurrency}`);
    res.json({  
      status: 201,     
      address: `${userInfo.data().publicAddress}`, 
      balance: {
        currency: localCurrency.toUpperCase(),
        amount: number_format(localCurrencyAmount, 4)
      }   
    });
  } 
  catch (e) { console.log(e); res.json({ status: 400, desc: `invalid request` }) }
}


  
  // 👍🏽 
 export const  userAccountDetails =  async (req, res) => {
  console.log("Received request for: " + req.url);
  try {
    let permissionLevel = req.user.permissionLevel;
    let targetCountry  =  getTargetCountry(permissionLevel, req.user.targetCountry)
    if(permissionLevel != "partner" && permissionLevel != "admin" && permissionLevel != "support"){ return res.json({ status: 400, desc: `Unauthorized request` }) }

    let userMSISDN = await validateMSISDN(`${req.body.phoneNumber}`, targetCountry); 
    let _isValidPhoneNumber = await isValidPhoneNumber(userMSISDN, targetCountry);
    console.log(`isValid ${targetCountry} PhoneNumber `, _isValidPhoneNumber)

    if(!_isValidPhoneNumber){ return res.json({ "status" : 400, "phoneNumber": `${userMSISDN}`, "message": `Invalid ${targetCountry} phoneNumber` })}
    
    let userId  = await getUserId(userMSISDN)
    console.log('UserId: ', userId)

    let userstatusresult = await checkIfSenderExists(userId);
    console.log("User Exists? ",userstatusresult);
    if(!userstatusresult){ return res.json({status: 400, desc: `user does not exist`}) }
    
    let userInfo = await getUserDetails(userId);
    res.json({status: 201, address : `${userInfo.data().publicAddress}`});
    
  } 
  catch (e) { console.log(e); res.json({ "status" : 400, "desc" : `invalid request` }) }
}
 
  
