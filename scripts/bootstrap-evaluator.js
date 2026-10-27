require('dotenv').config();
const crypto=require('crypto'),mongoose=require('mongoose'),User=require('../models/User');
function hash(password){const salt=crypto.randomBytes(16).toString('hex');return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,key)=>e?reject(e):resolve(salt+':'+key.toString('hex'))))}
(async()=>{
  const email=String(process.env.EVALUATOR_EMAIL||'').trim().toLowerCase(),password=process.env.EVALUATOR_PASSWORD||'';
  if(!email||password.length<8)throw new Error('Set EVALUATOR_EMAIL and an EVALUATOR_PASSWORD of at least 8 characters.');
  await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/personax');
  await User.updateOne({email},{$set:{name:'Evaluator',passwordHash:await hash(password),role:'evaluator'},$unset:{candidateId:1}},{upsert:true});
  console.log('Evaluator account ready for '+email+'. Password stored as a scrypt hash.');
  await mongoose.disconnect();
})().catch(async e=>{console.error(e.message);if(mongoose.connection.readyState)await mongoose.disconnect();process.exit(1)});
