const m=require('mongoose');
module.exports=m.model('Question',new m.Schema({type:String,section:String,prompt:String,image:String,order:Number,isActive:{type:Boolean,default:true},dimensions:[String],options:[{text:String,scores:{type:Map,of:Number}}]},{timestamps:true}));
