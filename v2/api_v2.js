const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bearerToken = require('express-bearer-token');
const bcrypt = require('bcryptjs');
const { resetPin } = require('./src/auth');
const api_v2 = express().use(cors({ origin: true }), bearerToken());



// KOTANI RESTFUL API
api_v2.post("/", async (req, res) => {
  if (req.method !== "POST"){ return res.status(500).json({ message: 'Not Allowed' }) }

  console.log(JSON.stringify(req.body));
  res.status(200).send('OK'); 
});

//auth & user endpoints
api_v2.post('/api/login', login);
api_v2.post("/user/resetPin", authenticateToken,resetPin);
api_v2.post('/user/account/getBalance', authenticateToken,getBalance);
api_v2.post('/user/account/details', authenticateToken,userAccountDetails);

//kyc
api_v2.post("/kyc/user/update", authenticateToken, kycUserUpdate);
api_v2.post("/kyc/user/activate", authenticateToken,kycUserActivate);
api_v2.post("/kyc/user/create", authenticateToken,kycUserCreate);
api_v2.post('/kyc/user/isverifiedcheck', authenticateToken,kycUserIsVerifiedCheck);
api_v2.post("/kyc/user/getDetailsByPhone", authenticateToken,kycUserGetDetailsByPhone);
api_v2.post("/kyc/user/setDetails", authenticateToken,kycUserSetDetails);
api_v2.post("/programs/kyc/updateUser", authenticateToken,programsKycUpdateUser);


//celo
api_v2.post("/dex/buyCelo", authenticateToken,dexBuyCelo);

//ubi
api_v2.post( "/transactions/ubi/claimfunds", authenticateToken,transactionUbiClaimFunds);
api_v2.post( "/transactions/ubi/checkIfBeneficiary", authenticateToken,transactionUbiCheckBeneficiary);
api_v2.post( "/transactions/ubi/setBeneficiary", authenticateToken,transactionUbiSetBeneficiary);

//momo
api_v2.post('/transactions/deposit/momo',  authenticateToken, transactionDepositMomo);
api_v2.post('/transactions/withdraw/momo', authenticateToken,transactionWithdrawMomo);

//mpesa
api_v2.post("/transactions/withdraw/sendToMpesa", authenticateToken,transactionWithdrawMpesaSend);
api_v2.post("/transactions/withdraw/getMpesaStatus", authenticateToken,transactionWithdrawGetMpesaStatus);


//transfer
api_v2.post("/api/webhook/withdrawResponse", authenticateToken,apiWebhookWithdrawResponse);
api_v2.post("/transactions/getEscrow", authenticateToken,transactionsGetEscrow);
api_v2.post('/transactions/transfer/p2p', authenticateToken,transactionsTransferP2p);


module.exports = functions.https.onRequest(api_v2);
