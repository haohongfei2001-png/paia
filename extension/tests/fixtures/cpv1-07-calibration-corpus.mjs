// Public synthetic development calibration, frozen before this probe.
// Authored after the initial model measurement; NOT a new blind acceptance set.
export const calibrationCorpus = {
  schemaVersion:1,id:'cpv1-vs07-calibration-development-v1',scope:'synthetic_only',
  productionClaim:false,developmentOnly:true,
  records:[
    {id:'d01',title:'发面记录',body:'烤制面包之前，将酵母与温水混合，面团静置到体积明显增大。',excluded:false},
    {id:'d02',title:'键盘修理',body:'空格键卡住时，先断开电源，再清理键帽下面的碎屑。',excluded:false},
    {id:'d03',title:'绿植照料',body:'盆土表面已经干燥才补水，底盘中的积水要倒掉，避免根部一直浸泡。',excluded:false},
    {id:'d04',title:'钢琴练习',body:'新乐句先用节拍器慢速分手练习，音符准确后再逐步加快。',excluded:false},
    {id:'d05',title:'望远镜笔记',body:'观看月面环形山时，从低倍率开始对焦，然后换高倍率目镜。',excluded:false},
    {id:'d06',title:'陶瓷杯修补',body:'杯子出现贯穿裂纹后停止盛热饮，改作装饰，不再用于入口食物。',excluded:false},
    {id:'d07',title:'Sourdough jar',body:'Mark the starter height on the jar and feed it regularly; bubbles and expansion show activity.',excluded:false},
    {id:'d08',title:'Bicycle chain',body:'Wipe the chain clean before adding lubricant, then remove the excess oil with a cloth.',excluded:false},
    {id:'d09',title:'被排除的栽培表',body:'兰花每次浇水的精确毫升数和固定日期。',excluded:true}
  ],
  tasks:[
    {id:'c01',query:'怎么判断酵母面团发好了',relevant:['d01']},
    {id:'c02',query:'打字时那个长键按下去弹不起来',relevant:['d02']},
    {id:'c03',query:'不要让花盆的根一直泡在水里',relevant:['d03']},
    {id:'c04',query:'新曲子两只手分别放慢弹',relevant:['d04']},
    {id:'c05',query:'看月亮表面坑洞时如何起步',relevant:['d05']},
    {id:'c06',query:'开裂的杯子还能接着喝热茶吗',relevant:['d06']},
    {id:'c07',query:'How do I recognize an active bread starter?',relevant:['d07']},
    {id:'c08',query:'Cleaning before oiling a bike drivetrain',relevant:['d08']},
    {id:'c09',query:'面包配方里准确用了多少克盐',relevant:[]},
    {id:'c10',query:'键盘是哪一家厂商生产的',relevant:[]},
    {id:'c11',query:'兰花每次应该浇多少毫升水',relevant:[]},
    {id:'c12',query:'练习钢琴每天准确持续多少分钟',relevant:[]},
    {id:'c13',query:'望远镜的镜片直径具体是多少',relevant:[]},
    {id:'c14',query:'修杯子用的胶水品牌与固化小时数',relevant:[]},
    {id:'c15',query:'What temperature must the bread starter be kept at?',relevant:[]},
    {id:'c16',query:'What exact torque should the bicycle bolts receive?',relevant:[]}
  ]
};
