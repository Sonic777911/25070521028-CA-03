require('dotenv').config();const mongoose=require('mongoose'),Question=require('../models/Question'),wordBank=require('./wordBank');
const dims=['decisionMaking','problemSolving','leadership','teamwork','communication','adaptability','responsibility','emotionalRegulation','initiative','ethicalJudgment'];
const pictures=[
  {type:'STORY',section:'picture',prompt:'Study the hazy scene and write a short story about what may be happening, what led to it, and what could happen next.',image:'/images/story-user-1.png',order:1,dimensions:dims},
  {type:'STORY',section:'picture',prompt:'Look at the blurred scene and create a brief story with a clear main character, goal, and outcome.',image:'/images/story-user-2.png',order:2,dimensions:dims},
  {type:'STORY',section:'picture',prompt:'Observe the scene and write a story describing the challenge faced by the characters and how they address it.',image:'/images/story-user-3.png',order:3,dimensions:dims},
  {type:'STORY',section:'picture',prompt:'Examine the image and write a narrative about the decision being made and its potential consequences.',image:'/images/story-user-4.png',order:4,dimensions:dims},
  {type:'STORY',section:'picture',prompt:'Study the setting and participants in this scene. Write a story about the collaboration and resolution.',image:'/images/story-user-5.png',order:5,dimensions:dims}
];
const situationStems=[
  'When a teammate misses an important deadline, I would first...',
  'When two teammates disagree about a project direction, I would...',
  'If I found a mistake in work already shared, my next step would be...',
  'When a new task arrives while I am behind schedule, I would...',
  'If a teammate became unusually quiet during planning, I would...',
  'When feedback is difficult for me to accept, I usually...',
  'When my group has several good ideas but little time, I would...',
  'If I noticed that our plan missed an important requirement, I would...',
  'If someone asked me to take credit for work I did not do, I would...',
  'When my first approach is not working and the deadline is close, I would...',
  'When I need to make a decision with incomplete information, I...',
  'If I realized I had misunderstood an instruction, I would...',
  'When a teammate asks for help while I have my own work to finish, I...',
  'If a discussion starts going off topic, I would...',
  'When I disagree with a decision made by the group, I...',
  'If I made a promise that I could no longer keep, I would...',
  'When a team member contributes less than expected, I would...',
  'If I had to explain a complicated idea to someone new, I would...',
  'When plans change at the last minute, I usually...',
  'If I noticed that one person was dominating a team discussion, I would...',
  'When I finish my part of a shared task early, I...',
  'If two urgent tasks needed my attention at once, I would...',
  'When I receive a suggestion that improves my work, I...',
  'If I saw a possible risk that others had not noticed, I would...',
  'When a group decision does not produce the result we hoped for, I...',
  'If I needed to ask for help on a difficult task, I would...',
  'When a teammate has a different working style from mine, I...',
  'If I noticed that our progress was falling behind, I would...',
  'When I am responsible for communicating a delay, I...',
  'After completing a challenging team task, I would want to reflect on...'
];
const situations=situationStems.map((stem,i)=>({type:'SITUATION',section:'situation',prompt:`Complete the sentence in your own words: ${stem}`,order:i+1,dimensions:dims}));
const words=wordBank.map((word,i)=>({type:'WORD',section:'word',prompt:word,order:i+1,dimensions:dims}));
const choicePrompts=['A deadline is close and a key component needs more work. What is your first move?','A team discussion is stuck between two plans. How do you proceed?','You find an error after a report has been sent. What do you do?','A new teammate is unfamiliar with the tools. How do you arrange the work?','A client changes an important requirement near the deadline. What next?','Your workload is heavier than expected. How do you manage it?','A meeting is dominated by two voices. How do you respond?','You have a promising idea but little evidence yet. What do you do?','A teammate proposes a shortcut with unclear consequences. What next?','A project ends with mixed results. How do you close it out?'];
const choices=[['Submit current work and list follow-up improvements','Redistribute work to focus on the component','Reduce scope while keeping core requirements','Build a backup while current work continues'],['Ask each person to explain their main concern','Run a small test of both approaches','Agree on criteria and compare the plans','Choose a direction and schedule a review'],['Notify the recipients and send a corrected version','Check the impact before deciding how to correct it','Ask a colleague to verify the correction','Document the error and add a prevention step'],['Pair them with an experienced teammate','Give them a bounded task with a clear guide','Ask what they already know and tailor support','Rebalance tasks after checking everyone’s capacity'],['Clarify which parts changed and their priority','Offer options with timeline and quality impacts','Review the plan with the team before committing','Prototype the changed part before revising everything'],['List tasks and estimate effort before reprioritizing','Tell stakeholders early and discuss tradeoffs','Ask a teammate to take a defined part','Block focused time and check progress later'],['Invite input from people who have not spoken','Use a round-robin so each person contributes','Summarize options and ask for objections','Follow up individually after the meeting'],['Create a small prototype to gather evidence','Ask peers to challenge the assumptions','Compare the idea against current goals','Set a short trial with clear success criteria'],['Clarify the shortcut’s risks and intended benefit','Suggest a safer alternative with similar time savings','Ask the team to review likely consequences','Check any rules or commitments before proceeding'],['Collect feedback from the team and stakeholders','Compare outcomes with the original goals','Recognize contributions and lessons learned','Record follow-up actions and owners']];
const extraChoicePrompts=[
  'A teammate shares an idea that could improve the project but may delay delivery. What do you do?',
  'You are asked to lead a task you have never done before. How do you begin?',
  'A teammate says they are overwhelmed just before a shared deadline. What is your response?',
  'You receive two conflicting requests from people who depend on your work. What do you do first?',
  'A group member repeatedly interrupts others during a meeting. How do you handle it?',
  'You have finished your assigned work, but the team is still behind. What is your next step?',
  'A customer is unhappy with a result that meets the written requirements. How do you respond?',
  'You discover that a teammate has misunderstood an important task. What do you do?',
  'Your team has to choose between a familiar method and an untested approach. How do you decide?',
  'A key contributor is unavailable on the day of a presentation. What do you do?',
  'You notice that a team plan depends on an assumption no one has checked. What next?',
  'A colleague takes credit for a shared success. How do you respond?',
  'A new team member is hesitant to ask questions. How do you support them?',
  'You realize a deadline is at risk, but the team has not been told yet. What do you do?',
  'A discussion is producing many ideas but no decision. How do you move it forward?',
  'You are given a task with unclear ownership and overlapping responsibilities. What do you do?',
  'A teammate suggests skipping a quality check to save time. How do you respond?',
  'You disagree with feedback on your work but want to understand it. What do you do?',
  'A project requirement changes after work has already begun. How do you respond?',
  'You have to deliver difficult news to a group that is relying on your work. What is your approach?'
];
const extraChoices=[
  ['Ask what outcome the idea could improve and estimate its impact','Dismiss it to protect the current plan','Ask the team to compare the benefit with the delay','Adopt it immediately without changing the timeline'],
  ['Clarify the expected outcome and identify what you need to learn','Decline until you already know how to do it','Break it into steps and ask an experienced person to review the plan','Start immediately and figure out the goal as you go'],
  ['Ask what is most urgent and agree how to rebalance the work','Take over everything without discussing priorities','Tell them the deadline matters more than their workload','Review remaining tasks together and ask for specific support'],
  ['Clarify deadlines and dependencies with both requesters','Work on whichever request arrived last','Explain the conflict and ask them to set a priority','Try to complete both without telling anyone about the tradeoff'],
  ['Set a respectful ground rule and invite the interrupted person to finish','Ignore it and hope the meeting improves','Speak with the person privately and explain the effect','End the meeting without addressing the behavior'],
  ['Check with the team where help would have the most impact','Wait for someone to assign you more work','Offer specific help on the highest-risk task','Start changing another person’s work without asking'],
  ['Listen to the concern and clarify what outcome they expected','Point out that the written requirements were met','Ask what would make the result more useful and discuss options','Promise a change before checking whether it is possible'],
  ['Check their understanding and clarify the task together','Correct the work without telling them what changed','Ask what information they used, then agree on the next step','Wait until the mistake affects the final result'],
  ['Compare the risks, evidence, and goals before recommending an approach','Choose the familiar method automatically','Run a small, bounded trial if the impact is manageable','Switch to the new method across the whole project immediately'],
  ['Confirm what is essential and arrange a backup with the team','Cancel the presentation immediately','Redistribute key points and do a short rehearsal','Pretend nothing changed and keep the original plan'],
  ['Name the assumption and identify a quick way to verify it','Keep the plan moving and hope it is true','Ask the team to assess the impact if it is wrong','Change the plan before checking the assumption'],
  ['Acknowledge the shared work and clarify contributions calmly','Confront them publicly during the next meeting','Speak privately and agree how contributions will be represented','Stay silent even if the record affects future decisions'],
  ['Invite their questions and offer a clear point of contact','Assume they will ask when ready','Check in privately and explain that questions are welcome','Give them complex work without context to build confidence'],
  ['Tell the relevant people early, explain the risk, and propose options','Wait until the deadline is missed before mentioning it','Ask the team to review what can realistically be completed','Promise the date will hold without checking the remaining work'],
  ['Summarize the options and agree on decision criteria','Choose the first idea so the discussion can end','Invite the group to compare ideas against shared goals','Schedule another meeting without identifying what is unresolved'],
  ['Clarify who owns each part and agree on handoffs','Complete every overlapping task yourself','Ask the people involved to assign owners and define boundaries','Leave the overlap unresolved until work is duplicated'],
  ['Explain the risk and propose a shorter check focused on critical issues','Skip it without documenting the decision','Ask what the check protects and find the fastest safe option','Insist on the full process without considering the deadline'],
  ['Ask for a specific example and explain what you understood','Reject the feedback because you disagree','Compare the feedback with the work and ask what to improve','Accept every suggestion without asking questions'],
  ['Clarify what changed, assess the impact, and update the plan','Continue with the old requirement','Ask stakeholders to confirm priorities before reworking tasks','Rebuild everything immediately without checking scope'],
  ['Share the news promptly, explain the impact, and offer next steps','Delay the message until you have a perfect solution','Be direct about what is known and what remains uncertain','Minimize the issue so the group stays calm']
];
const score=(i,j)=>{const out={};for(let k=0;k<3;k++)out[dims[(i*3+j*2+k)%10]]=3+((i+j+k)%3);return out};
const allChoicePrompts=[...choicePrompts,...extraChoicePrompts],allChoices=[...choices,...extraChoices];
const mcq=allChoicePrompts.map((prompt,i)=>({type:'MCQ',section:'choice',prompt,order:i+1,dimensions:dims,options:allChoices[i].map((text,j)=>({text,scores:score(i,j)}))}));
(async()=>{try{await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/personax');const all=[...pictures,...situations,...words,...mcq];await Question.updateMany({section:'picture',prompt:{$nin:pictures.map(question=>question.prompt)}},{$set:{isActive:false}});await Question.updateMany({type:'SITUATION',section:'situation',prompt:{$nin:situations.map(question=>question.prompt)}},{$set:{isActive:false}});await Question.updateMany({type:'MCQ',section:'choice',prompt:{$nin:allChoicePrompts}},{$set:{isActive:false}});await Question.bulkWrite(all.map(question=>({updateOne:{filter:{type:question.type,section:question.section,prompt:question.prompt},update:{$set:{...question,isActive:true}},upsert:true}})));console.log(`Seeded or updated ${all.length} questions without deleting existing assessment records.`);await mongoose.disconnect()}catch(e){console.error(e);process.exit(1)}})();
