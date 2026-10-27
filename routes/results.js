const r=require('express').Router(),C=require('../models/Candidate'),A=require('../models/Assessment'),R=require('../models/Response'),E=require('../models/Evaluation'),Q=require('../models/Question');
const ds=['decisionMaking','problemSolving','leadership','teamwork','communication','adaptability','responsibility','emotionalRegulation','initiative','ethicalJudgment'];
r.get('/:id',async(q,s,n)=>{try{
  const candidate=await C.findById(q.params.id);
  const attempts=await A.find({candidateId:q.params.id,status:{$ne:'abandoned'}}).sort({createdAt:-1}).select('_id status startedAt completedAt createdAt');
  const assessment=q.query.assessmentId?attempts.find(a=>String(a._id)===q.query.assessmentId):attempts[0];
  if(!candidate||!assessment)return s.status(404).json({error:'Candidate or assessment not found'});
  const responses=await R.find({assessmentId:assessment._id}).populate('questionId');
  responses.sort((a,b)=>{
    if(Number.isFinite(a.sequence)&&Number.isFinite(b.sequence))return a.sequence-b.sequence;
    const savedAtA=new Date(a.createdAt).getTime(),savedAtB=new Date(b.createdAt).getTime();
    if(Number.isFinite(savedAtA)&&Number.isFinite(savedAtB)&&savedAtA!==savedAtB)return savedAtA-savedAtB;
    if(a.questionId?.section!==b.questionId?.section)return ['picture','situation','word','choice'].indexOf(a.questionId?.section)-['picture','situation','word','choice'].indexOf(b.questionId?.section);
    return (a.questionId?.order??0)-(b.questionId?.order??0);
  });
  const evals=await E.find({assessmentId:assessment._id}),profile={};
  for(const d of ds){let sums=0,count=0;for(const x of responses){const o=x.questionId?.options?.[x.selectedOption];if(o?.scores?.get(d)!=null){sums+=o.scores.get(d)/5*100;count++}}for(const e of evals){const v=e.evaluatorScores?.get(d);if(v){sums+=(v-1)*25;count++}}profile[d]=count?Math.round(sums/count):null}
  const times=responses.filter(x=>x.answered).map(x=>x.responseTime||0),attempted=responses.filter(x=>x.answered).length,total=await Q.countDocuments({isActive:{$ne:false}}),ranked=Object.entries(profile).filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
  s.json({candidate,attempts,assessment,sections:assessment.sections,profile,evaluations:evals,overall:ranked.length?Math.round(ranked.reduce((a,x)=>a+x[1],0)/ranked.length):null,strongest:ranked.slice(0,3).map(x=>x[0]),development:ranked.slice(-2).reverse().map(x=>x[0]),dynamics:{attempted,skipped:responses.filter(x=>x.skipped).length,totalQuestions:total,completion:total?Math.round(attempted/total*100):0,averageResponseTime:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0,fastest:times.length?Math.min(...times):0,longest:times.length?Math.max(...times):0,totalDuration:assessment.completedAt?Math.round((assessment.completedAt-assessment.startedAt)/1000):null},responses});
}catch(e){n(e)}});module.exports=r;
