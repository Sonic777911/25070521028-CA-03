const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/personax').then(async () => {
  const E = require('./models/Evaluation');
  const C = require('./models/Candidate');
  const A = require('./models/Assessment');
  const rows = await E.aggregate([
    { $group: { _id: '$assessmentId', candidateId: { $first: '$candidateId' }, sections: { $addToSet: '$section' }, updatedAt: { $max: '$updatedAt' } } },
    { $sort: { updatedAt: -1 } }
  ]);
  const out = await Promise.all(rows.map(async x => {
    const candidate = await C.findById(x.candidateId).select('name candidateCode');
    const assessment = await A.findById(x._id).select('status startedAt completedAt createdAt');
    const evals = await E.find({ assessmentId: x._id });
    return {
      assessmentId: x._id,
      candidate,
      assessment,
      sections: x.sections,
      evaluationsCount: evals.length,
      updatedAt: x.updatedAt
    };
  }));
  console.log('Evaluated output:', JSON.stringify(out.filter(x => x.candidate && x.assessment), null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
