const m=require('mongoose');
module.exports=m.model('Assessment',new m.Schema({candidateId:{type:m.Schema.Types.ObjectId,ref:'Candidate',required:true},status:{type:String,default:'in_progress'},startedAt:{type:Date,default:Date.now},completedAt:Date,sections:[{section:String,completedAt:Date,duration:Number,attempted:Number,skipped:Number}]},{timestamps:true}));
