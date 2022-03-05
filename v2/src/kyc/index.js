const admin = require('firebase-admin');
const firestore = admin.firestore();
const { getUserId,  getTargetCountry, checkIfSenderExists,  checkisUserKyced, addUserKycToDB,  } = require("../../modules/libraries");
const lib = require('../../modules/libraries');
var {  getPinFromUser, createcypher, sendMessage, isValidPhoneNumber, validateMSISDN } = require('../../modules/utilities');
//GLOBAL ENV VARIABLES
const {iv }  = require('../contants')
const { invalid } = require('moment');


// 👍🏽
export const kycUserUpdate = async (req, res) => {
  try{
    console.log("Received request for: " + req.url);
    const phoneNumber = req.body.phoneNumber;

    let userNumber = req.user.phoneNumber;
    console.log('UserNumber: ', userNumber);
    let permissionLevel = req.user.permissionLevel;

    if(userNumber != "+254720670789" || permissionLevel != "partner") {return res.status(401).send({status: 'Unauthorized'})}
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let kycReqData = req.body;
    console.log(`KYC DATA: ${JSON.stringify(kycReqData)}`);
    let userMSISDN = ''; 

    let _isValidKePhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidKePhoneNumber ', _isValidKePhoneNumber)

    if(!_isValidKePhoneNumber){return res.json({ "status": 400, "Details": `Invalid PhoneNumber`})}

    if(_isValidKePhoneNumber){
      userMSISDN = await validateMSISDN(phoneNumber, targetCountry);
      let userId  = await getUserId(userMSISDN)
      let userstatusresult = await checkIfSenderExists(userId);
      if(!userstatusresult){ console.log('User does not exist: '); return res.json({ "status": 400, "desc": `User does not exist` }) } 

      let isKyced = await checkisUserKyced(userId);
      if(isKyced) { return res.json({ "status": 400, "desc": `KYC Document already exists` })}

      let newUserPin = await getPinFromUser();
      console.log('newUserPin', newUserPin)
      let enc_loginpin = await createcypher(newUserPin, userMSISDN, iv);
      let userdata = { displayName: `${kycReqData.fullname}`, disabled: false } 
      await admin.auth().updateUser(userId, userdata);
      await admin.auth().setCustomUserClaims(userId, {verifieduser: true, impactmarket: true });
      console.log(`User has been verified`)   
      await firestore.collection('hashfiles').doc(userId).set({'enc_pin' : `${enc_loginpin}`}); 
      await addUserKycToDB(userId, kycReqData);

      let message2sender = `Welcome to Kotanipay.\nYour account details have been verified.\nDial *483*354# to access the KotaniPay Ecosystem.\nUser PIN: ${newUserPin}`;
      sendMessage("+"+userMSISDN, message2sender);

      res.json({ "status": 201, "Details": `KYC completed successfully` });    
    }   
  }catch(e){ console.log(e); res.json({ "status": 400, "desc": `Invalid information provided` }) }
}

// 👍🏽
export const kycUserActivate = async (req, res) => {
  try{  
    if(permissionLevel != "admin" || permissionLevel != "partner") {return res.status(401).send({status: 'Unauthorized'})}
    
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    console.log("Received request for: " + req.url);
    const phoneNumber = req.body.phoneNumber;
    let _isValidPhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidPhoneNumber ', _isValidPhoneNumber)

    if(!_isValidPhoneNumber){return res.json({ "status": 400, "desc": `Invalid PhoneNumber`})}

    let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);
    let userId  = await getUserId(userMSISDN)
    console.log('UserId: ', userId)

    let userstatusresult = await checkIfSenderExists(userId);
    if(!userstatusresult){ console.log('User does not exist: '); return res.json({ "status": 400, "desc": `User does not exist`}) } 

    await admin.auth().setCustomUserClaims(userId, {verifieduser: true, impactmarket: true})
    console.log(`User has been verified`)
    res.json({ "status": 201, "desc": `User has been verified` });     
  }catch(e){ console.log(e); res.json({ "status": 400, "desc": `Invalid PhoneNumber Supplied` }) }
}
// 👍🏽
export const kycUserCreate = async (req, res) => {
  console.log("Received request for: " + req.url);
  try{
    const phoneNumber = req.body.phoneNumber;
    console.log(JSON.stringify(req.body));
    
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let _isValidPhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidKePhoneNumber ', _isValidPhoneNumber)
    if(!_isValidPhoneNumber){return res.json({status: 400, desc: 'invalid phoneNumber'})}

    let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

    let userId = await lib.getUserId(userMSISDN);
    console.log('senderId: ', userId); 
    let userExists = await lib.checkIfSenderExists(userId);
    console.log("Sender Exists? ",userExists);
    if(userExists){ return res.json({status: 400, desc: 'user exists', userId: userId}) }

    if(!userExists){       
      await lib.createNewUser(userId, userMSISDN);     
      console.log('Created user with userID: ', userId); 
      res.json({status: 201, userId: userId});
    }
  }catch(e){ res.json({ "status": 400, "desc": `Invalid PhoneNumber Supplied` }) }
} 
 

  // 👍🏽
export const kycUserIsVerifiedCheck =   async (req, res) => {
  console.log("Received request for: " + req.url);
  try {
    const phoneNumber = req.body.phoneNumber;
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

    let _isValidPhoneNumber = await isValidPhoneNumber(userMSISDN, targetCountry);
    if(!_isValidPhoneNumber){return res.json({status: 400, desc: 'invalid phoneNumber'})}

    let userId  = await lib.getUserId(userMSISDN)
    console.log('UserId: ', userId)

    let userExists = await lib.checkIfSenderExists(userId);
    console.log("User Exists? ",userExists);
    if(!userExists){ return res.json({status: 400, desc: 'user does not exist'}) }
    
    let isverified = await lib.checkIfUserisVerified(userId);   
    console.log('isverified: ', isverified);    
    
    res.json({status: isverified})
  } catch (e) { res.json({ status : 400}) }
}
 
// 👍🏽
  // Parameters: phoneNumber
export const kycUserGetDetailsByPhone = async (req, res) => {
  try{
    let phoneNumber = req.body.phoneNumber;
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let _isValidPhoneNumber = await isValidPhoneNumber(userMSISDN, targetCountry);
    console.log('isValidKePhoneNumber ', _isValidPhoneNumber)
    if(!_isValidPhoneNumber){return res.json({ "status": 400, "desc": `Invalid PhoneNumber`})}

    let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);
    let userRecord = await admin.auth().getUserByPhoneNumber(`+${userMSISDN}`)
    console.log(`Successfully fetched user data: `, JSON.stringify(userRecord.toJSON()));
    res.json(userRecord.toJSON());
  }catch(e){
    console.log('PhoneNumber not found', JSON.stringify(e));
    res.json({"status" : 400});
  }
}

// 👍🏽
export const kycUserSetDetails =async (req, res) => {
  try{
    console.log("Received request for: " + req.url);
    const phoneNumber = req.body.phoneNumber;
    let permissionLevel = req.user.permissionLevel;

    if(permissionLevel != "partner" && permissionLevel != "support") {return res.status(401).send({status: 'Unauthorized'})}
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let kycReqData = req.body;
    console.log(`KYC DATA: ${JSON.stringify(kycReqData)}`);

    let _isValidPhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidPhoneNumber ', _isValidPhoneNumber)

    if(!_isValidPhoneNumber){return res.json({ "status": 400, "Details": `Invalid PhoneNumber`})}

    if(_isValidPhoneNumber){
      let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

      let userId  = await getUserId(userMSISDN)
      console.log('UserId: ', userId)
      let userstatusresult = await checkIfSenderExists(userId);
      if(!userstatusresult){ console.log('User does not exist: '); return res.json({ "status": 400, "desc": `User does not exist` }) } 

      let isKyced = await checkisUserKyced(userId);
      if(isKyced) { return res.json({ "status": 400, "desc": `KYC Document already exists` })}
      let newUserPin = await getPinFromUser();
      console.log('newUserPin', newUserPin)
      let enc_loginpin = await createcypher(newUserPin, userMSISDN, iv);
      let userdata = { displayName: `${kycReqData.fullname}`, disabled: false };
      let program = kycReqData.programName;
      await admin.auth().updateUser(userId, userdata);
      await admin.auth().setCustomUserClaims(userId, {verifieduser: true, country: targetCountry, [program]: true});
      console.log(`User has been verified`)
      await firestore.collection('hashfiles').doc(userId).set({'enc_pin' : `${enc_loginpin}`}); 
      await addUserKycToDB(userId, kycReqData);
      res.json({ "status": 201, "desc": `KYC completed successfully` });    
    }   
  }catch(e){ console.log(JSON.stringify(e)); res.json({ "status": 400, "desc": `invalid information provided` }) }
}

export const programsKycUpdateUser =async (req, res) => {
  try{
    console.log("Received request for: " + req.url);
    const phoneNumber = req.body.phoneNumber;

    let permissionLevel = req.user.permissionLevel;
    if(permissionLevel != "partner" && permissionLevel != "support") {return res.status(401).send({status: 'Unauthorized'})}
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);

    let kycReqData = req.body;
    console.log(`KYC DATA: ${JSON.stringify(kycReqData)}`);
    let _isValidPhoneNumber = await isValidPhoneNumber(phoneNumber, targetCountry);
    console.log('isValidPhoneNumber ', _isValidPhoneNumber)

    if(_isValidPhoneNumber){
      let userMSISDN = await validateMSISDN(phoneNumber, targetCountry);
      let userId  = await getUserId(userMSISDN);
      let userstatusresult = await checkIfSenderExists(userId);
      if(!userstatusresult){ return res.json({ "status": 400, "desc": `User does not exist` })} 

      let isKyced = await checkisUserKyced(userId);
      // If Already KYC'd
      if(isKyced) { return res.json({ "status": `active`, "Comment": `KYC Document already exists` })}

      let newUserPin = await getPinFromUser();
      console.log('newUserPin', newUserPin)
      let enc_loginpin = await createcypher(newUserPin, userMSISDN, iv);
      let userdata = { displayName: `${kycReqData.fullname}`, disabled: false } ;
      let program = kycReqData.programName;
      console.log(`programName: ${program}`);
      if(program == invalid || program == null){return res.json({ "status": 400, "desc": `invalid programId` })}
      await admin.auth().updateUser(userId, userdata);
      await admin.auth().setCustomUserClaims(userId, {verifieduser: true, [program]: true });
      console.log(`User has been verified`)
      await firestore.collection('hashfiles').doc(userId).set({'enc_pin' : `${enc_loginpin}`}); 
      await addUserKycToDB(userId, kycReqData);    
      res.json({ "status": 201, "desc": `KYC completed successfully` });    
    }
   
  }catch(e){ console.log(JSON.stringify(e)); res.json({ "status": 400, "desc": `invalid information provided` }) }
}

  