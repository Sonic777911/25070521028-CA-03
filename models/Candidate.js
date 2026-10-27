const m=require('mongoose');
module.exports=m.model('Candidate',new m.Schema({name:{type:String,required:true,trim:true},age:{type:Number,min:13,max:100},candidateCode:{type:String,unique:true}},{timestamps:true}));
