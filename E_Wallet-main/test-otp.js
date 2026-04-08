const speakeasy = require('speakeasy');
const secret = 'N5DNDF5RIRIBHNRHTOAFM2KDFL2L5Q2N';
const token = speakeasy.totp({ secret: secret, encoding: 'base32' });
console.log(token);
