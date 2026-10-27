const crypto = require('crypto');
const mongoose = require('mongoose');

function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (e, key) =>
      e ? reject(e) : resolve(salt + ':' + key.toString('hex'))
    )
  );
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personax');
  const User = require('../models/User');
  const password = '12345678';
  
  const users = await User.find();
  for (const u of users) {
    const passwordHash = await hash(password);
    u.passwordHash = passwordHash;
    await u.save();
    console.log(`Reset password to 12345678 for ${u.role}: ${u.email} (${u.name})`);
  }
  
  console.log(`\nSuccessfully reset password to 12345678 for all ${users.length} accounts.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
