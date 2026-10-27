const r=require('express').Router(),C=require('../models/Candidate'),A=require('../models/Assessment');
r.post('/',async(q,s,n)=>{try{if(!q.body.name?.trim())return s.status(400).json({error:'Name is required'});const c=await C.create({name:q.body.name,age:q.body.age||undefined,candidateCode:'PX'+Date.now().toString().slice(-8)}),a=await A.create({candidateId:c._id});s.status(201).json({candidate:c,assessment:a})}catch(e){n(e)}});
r.get('/',async(q,s,n)=>{try{s.json(await C.find().sort({createdAt:-1}))}catch(e){n(e)}}); module.exports=r;
