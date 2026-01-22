const jwt = require('jsonwebtoken');
const fs = require('fs');

// Apple credentials
const TEAM_ID = '84Y4KWZ59X';
const KEY_ID = 'T6G4QBTFTJ';
const CLIENT_ID = 'com.aminy.signin'; // Your Service ID

// Read the private key (from local copy in project directory)
const privateKey = fs.readFileSync('./AuthKey.p8', 'utf8');

// Generate the JWT
const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d', // 6 months (Apple maximum)
  audience: 'https://appleid.apple.com',
  issuer: TEAM_ID,
  subject: CLIENT_ID,
  keyid: KEY_ID,
});

console.log('\n=== Apple Client Secret (JWT) ===\n');
console.log(token);
console.log('\n=== Copy the above token and paste it into Supabase ===\n');
