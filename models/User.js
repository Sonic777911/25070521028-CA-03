const m=require('mongoose');
module.exports=m.model('User',new m.Schema({name:{type:String,required:true,trim:true},email:{type:String,required:true,lowercase:true,trim:true,unique:true},passwordHash:{type:String,required:true,select:false},role:{type:String,enum:['candidate','evaluator'],required:true},candidateId:{type:m.Schema.Types.ObjectId,ref:'Candidate'}},{timestamps:true}));
