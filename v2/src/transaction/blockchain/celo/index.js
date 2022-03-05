const { getUserId, getUserDetails, getTargetCountry, checkIfSenderExists  } = require("./modules/libraries");
const lib = require('./modules/libraries');
const {authenticateToken} = require('./modules');

var {  isValidPhoneNumber, validateMSISDN } = require('./modules/utilities');


const { iv } = require('../../../contants') 

const { buyCelo, getContractKit,   } = require('./modules/celokit');

const kit = getContractKit();


// Celo Functions
// Parameters: phoneNumber, celoAmount
export const  dexBuyCelo =  async (req, res) => {
  let phoneNumber = req.body.phoneNumber;
  let _cusdAmount = req.body.cusdAmount;
  let cusdAmount = kit.web3.utils.toWei(`${_cusdAmount}`);


  try {
    let permissionLevel = req.user.permissionLevel;
    let targetCountry = getTargetCountry(permissionLevel, req.user.targetCountry);
    userMSISDN = await validateMSISDN(phoneNumber, targetCountry);

    let _isValidKePhoneNumber = await isValidPhoneNumber(userMSISDN, targetCountry);
    console.log('isValidKePhoneNumber ', _isValidKePhoneNumber)

    if(_isValidKePhoneNumber){
      let userId  = await getUserId(userMSISDN)
      console.log('UserId: ', userId)

      let userstatusresult = await checkIfSenderExists(userId);
      console.log("User Exists? ",userstatusresult);
      if(userstatusresult === false){ res.json({"status" : "user not found"}); return; }   
      
      let userInfo = await getUserDetails(userId);

      console.log('User Address => ', userInfo.data().publicAddress);
      let userprivkey = await lib.getSenderPrivateKey(userInfo.data().seedKey, userMSISDN, iv);
      console.log(`CUSD Exchange amount: ${_celoAmount}`);    
      
  
      let receipt = await buyCelo(userInfo.data().publicAddress,`${cusdAmount}`, userprivkey);

      res.json({ "status" : 201, "details" : `${receipt}`});
    }else{
      let message = { 
        "status" : 400,      
        "phoneNumber": `${userMSISDN}`, 
        "message": `The number provided is not a valid KE phoneNumber`      
      };
      res.json(message);
    }
    
  } catch (e) {
    res.json({"status" : "phonenumber not found"});
  }
}

  