const r=require('express').Router(),crypto=require('crypto'),U=require('../models/User'),C=require('../models/Candidate'),A=require('../models/Assessment');
const secret=()=>process.env.AUTH_SECRET||'personax-local-demo-secret-change-before-deployment';
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,key)=>e?reject(e):resolve(salt+':'+key.toString('hex'))))}
async function verify(password,stored){
  // Treat missing or damaged password hashes as a failed sign-in. Calling
  // split/Buffer.from on a malformed value used to throw and turn a bad
  // account record into an HTTP 500.
  if(typeof stored!=='string')return false;
  const match=/^([a-f\d]{32}):([a-f\d]{128})$/i.exec(stored);
  if(!match)return false;
  const [,salt,key]=match;
  const actual=Buffer.from(await hash(password,salt).then(x=>x.split(':')[1]),'hex'),expected=Buffer.from(key,'hex');
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)
}
function token(user){const payload=Buffer.from(JSON.stringify({id:user._id,role:user.role,exp:Date.now()+7*86400000})).toString('base64url');return payload+'.'+crypto.createHmac('sha256',secret()).update(payload).digest('base64url')}
function publicUser(user){return {id:user._id,name:user.name,email:user.email,role:user.role,candidateId:user.candidateId}}
r.post('/register',async(q,s,n)=>{try{const {name,email,password}=q.body;if(!name?.trim()||!email?.trim()||!password)return s.status(400).json({error:'Name, email, and password are required'});if(password.length<8)return s.status(400).json({error:'Password must be at least 8 characters'});const normalizedEmail=email.trim().toLowerCase();if(await U.exists({email:normalizedEmail}))return s.status(409).json({error:'An account with this email already exists'});const candidate=await C.create({name:name.trim(),candidateCode:'PX'+crypto.randomBytes(4).toString('hex').toUpperCase()}),assessment=await A.create({candidateId:candidate._id});const user=await U.create({name:name.trim(),email:normalizedEmail,passwordHash:await hash(password),role:'candidate',candidateId:candidate._id});s.status(201).json({token:token(user),user:publicUser(user),assessmentId:assessment._id})}catch(e){if(e.code===11000)return s.status(409).json({error:'An account with this email already exists'});n(e)}});
r.post('/login',async(q,s,n)=>{try{const body=q.body&&typeof q.body==='object'?q.body:{},role=body.role;if(!['candidate','evaluator'].includes(role))return s.status(400).json({error:'Choose candidate or evaluator sign-in'});const user=await U.findOne({email:String(body.email||'').trim().toLowerCase()}).select('+passwordHash');if(!user||user.role!==role||!await verify(String(body.password||''),user.passwordHash))return s.status(401).json({error:'Email, password, or account type is incorrect'});const assessmentId=user.candidateId?(await A.findOne({candidateId:user.candidateId}).sort({createdAt:-1}))?._id:null;s.json({token:token(user),user:publicUser(user),assessmentId})}catch(e){n(e)}});
module.exports=r;
