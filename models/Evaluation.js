const m=require('mongoose');
module.exports=m.model('Evaluation',new m.Schema({assessmentId:{type:m.Schema.Types.ObjectId,ref:'Assessment'},candidateId:{type:m.Schema.Types.ObjectId,ref:'Candidate'},section:{type:String,enum:['picture','situation','word','choice']},questionId:{type:m.Schema.Types.ObjectId,ref:'Question'},evaluatorScores:{type:Map,of:Number},notes:String},{timestamps:true}));
