const functions = require('firebase-functions');
// GLOBAL VARIABLES
export const USD_TO_KES = '3128952f1782f60c1cf95c5c3d13b4dc739f1a0d';  
export const KES_TO_USD = '883736ecb6bd36d6411c77bdf1351052a1f23c00';  
export const GHS_TO_USD = '01fc5317bd43b9698600f2c411c17e92270d3771';
export const USD_TO_GHS = 'd4379db945500fec8b6aa2a0b1027abbf625141a';


//GLOBAL ENV VARIABLES
export const iv = functions.config().env.crypto_iv.key;
export const escrowMSISDN = functions.config().env.escrow.msisdn;
export const signerMSISDN =  functions.config().env.ubiManager.msisdn;