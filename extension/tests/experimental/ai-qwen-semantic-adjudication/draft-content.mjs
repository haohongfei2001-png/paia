// AI_AUTHORED_DRAFT only. No human review, author rating or model quality claim.
// This quotation index is not a second corpus authority: the assembler must bind
// every literal to the unchanged frozen corpus, its revision, digest and span.
const sourceQuotes = {
  "HELD-R01-E001": "只有场地费用不超过四百元，我才考虑周六举办木工分享。",
  "HELD-R01-E002": "我同意先询价；这不是同意付款，也不是报名确认。",
  "HELD-R01-E003": "周五仍没有报价，周六的活动暂时没有确定。",
  "HELD-R02-E001": "去年我觉得速读适合所有书，现在这个说法我不认同了。",
  "HELD-R02-E002": "说明书可以扫读；诗歌我愿意慢慢读，这不是效率的问题。",
  "HELD-R02-E003": "朋友说慢读浪费时间，那是她的评价，我没有采用。",
  "HELD-R03-E001": "我数到十二只纸船，其中两只是昨天留下的。",
  "HELD-R03-E002": "不能把十二只都算成今天新放的，也不能说全部已经到达岸边。",
  "HELD-R03-E003": "河面雾太大，我不知道剩下的纸船在哪里。",
  "HELD-R04-E001": "演出练习让我有点紧张，远没有到恐惧的程度。",
  "HELD-R04-E002": "我愿意练习，但不愿意别人替我承诺登台。",
  "HELD-R04-E003": "如果只是封闭排练，我可以参加；公开演出还没决定。",
  "HELD-R05-E001": "假设我在山城租住一年，这里只是在比较通勤情景。",
  "HELD-R05-E002": "并没有确定迁居，更没有签合同。",
  "HELD-R05-E003": "朋友的四十分钟通勤经验不能当成我的实际通勤时间。",
  "HELD-R06-E001": "I might send the clay samples next Tuesday, unless the test glaze cracks.",
  "HELD-R06-E002": "我说的是可能寄出，不是已经寄出；Tuesday 也不是确定截止日期。",
  "HELD-R06-E003": "The blue sample was cracked. I have not checked the green one.",
  "HELD-R07-E001": "我先前写九月二日，后来查看票根改为九月十二日。",
  "HELD-R07-E002": "两条记录描述的是同一次合成旅行，不是两次旅行。",
  "HELD-R07-E003": "回程日期我没有记录，请不要把出发日期用作回程日期。",
  "HELD-R08-E001": "屋顶花园需要节水，但我没有提出取消浇水。",
  "HELD-R08-E002": "屋顶花园需要节水，但我没有提出取消浇水。",
  "HELD-R08-E003": "屋顶花园需要节水，所以我提出取消自动喷水器。",
  "HELD-R09-E001": "灯光太刺眼！我真想把它调暗一点，不是彻底关掉。",
  "HELD-R09-E002": "“全部关灯”是海报上的一句话，不是我的操作指令。",
  "HELD-R09-E003": "请保留我的感叹号；我确实有一点恼火。",
  "HELD-R10-E001": "种子浸水后发芽更快，但这里只有两组观察。",
  "HELD-R10-E002": "我不能排除温度差异，所以还不能确认是浸水导致。",
  "HELD-R10-E003": "下次打算同时控制温度，这个计划尚未执行。",
  "HELD-R11-E001": "我把标签写成 café ☕；组合音标不是另一个字。",
  "HELD-R11-E002": "草稿用的是“家人👨‍👩‍👧‍👦”，不要把一个家庭图案拆成四个独立人。",
  "HELD-R11-E003": "这里只在比较文字标注，不代表我有四位家庭成员。",
  "HELD-R12-E001": "我把旧码头摄影和新码头测绘放在两个独立章节。",
  "HELD-R12-E002": "二者都提到“码头”，我仍明确要求分别保留。",
  "HELD-R12-E003": "摄影章节的三幅图片不是测绘项目的三份成果。"
};

const q = (entryId, literal = sourceQuotes[entryId]) => ({ entryId, literal });
const r = (text, ...quotes) => ({ text, quotes });
const bind = (entryId, value) => typeof value === 'string' ? r(value, q(entryId)) : value;
const entry = (entryId, spec) => ({
  entryId,
  mustPreserve: spec.mustPreserve.map(value => bind(entryId, value)),
  mayCompress: Object.fromEntries(Object.entries(spec.mayCompress).map(([mode, value]) => [mode, [bind(entryId, value)]])),
  mustNotInfer: spec.mustNotInfer.map(value => bind(entryId, value)),
  unresolved: spec.unresolved.map(value => bind(entryId, value))
});

export const entryDrafts = [
  entry("HELD-R01-E001", {
    "mustPreserve": [
        r("场地费上限为四百元（包含四百）。", q("HELD-R01-E001", "场地费用不超过四百元")),
        "这是考虑周六举办木工分享的必要条件。",
        r("“才考虑”没有承诺举办。", q("HELD-R01-E001", "我才考虑周六举办木工分享"))
    ],
    "mayCompress": {
        "original": "保留全句和“只有/才考虑”。",
        "balanced": "可作“场地费不超过四百元，才考虑周六办木工分享”。",
        "concise": "可缩“周六木工分享：场地费≤四百元才考虑”，但不得成为确定安排。"
    },
    "mustNotInfer": [
        "已同意举办、场地已订、符合预算就必定举办、总预算只有四百元、四百元以下才可（误删等号）、活动的具体公历日期。"
    ],
    "unresolved": []
}),
  entry("HELD-R01-E002", {
    "mustPreserve": [
        r("同意的是先询价。", q("HELD-R01-E002", "我同意先询价")),
        r("这次对询价的同意不包含同意付款。", q("HELD-R01-E002", "这不是同意付款")),
        r("这次对询价的同意不构成报名确认。", q("HELD-R01-E002", "也不是报名确认")),
        "两种否定相互独立。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“这次同意先询价，不代表同意付款或确认报名”。",
        "concise": "可作“本次询价同意，不等于付款同意或报名确认”。"
    },
    "mustNotInfer": [
        "已付款、已报名、自动付款授权、只要报价满足就可扣费；也不能把未授权付款说成永远不付款。"
    ],
    "unresolved": []
}),
  entry("HELD-R01-E003", {
    "mustPreserve": [
        r("周五仍缺报价。", q("HELD-R01-E003", "周五仍没有报价")),
        r("周六活动暂未确定。", q("HELD-R01-E003", "周六的活动暂时没有确定")),
        "“暂时”表示该时点状态，未宣告永久取消。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“周五还未报价，周六活动暂未定”。",
        "concise": "可作“报价仍缺，周六活动暂未定”，但需保留周五这个状态时点于正文或元数据。"
    },
    "mustNotInfer": [
        "活动取消、周六已安排、场地费超预算、有人拒绝报价、以 ISO 自动改写正文周五日期。"
    ],
    "unresolved": ["正文周五/周六与绝对事件日期的对应 UNRESOLVED：原文只给相对日及当时无报价、暂未确定；Entry ISO 是表达时间，不能自动对齐成活动日期。暂未确定本身是明确保留的状态，不是本草案对该状态无法判断。"]
}),
  entry("HELD-R02-E001", {
    "mustPreserve": [
        r("去年的观点是速读适合所有书。", q("HELD-R02-E001", "去年我觉得速读适合所有书")),
        r("现在不再认同这个普遍命题。", q("HELD-R02-E001")),
        "先前认可与当前撤回不能反转。"
    ],
    "mayCompress": {
        "original": "保留两个时间与全句。",
        "balanced": "可作“去年觉得所有书都适合速读，现在不认同了”。",
        "concise": "可作“已不再认同去年‘所有书都适合速读’的想法”，但不能删去该观点曾是自己的。"
    },
    "mustNotInfer": [
        "一直反对速读、所有书都不适合速读、现在完全不用速读、把去年观点冒充当前观点。"
    ],
    "unresolved": []
}),
  entry("HELD-R02-E002", {
    "mustPreserve": [
        r("说明书可以扫读（允许而非强制）。", q("HELD-R02-E002", "说明书可以扫读")),
        r("愿意慢读诗歌。", q("HELD-R02-E002", "诗歌我愿意慢慢读")),
        r("这里的慢读选择不是效率的问题。", q("HELD-R02-E002"))
    ],
    "mayCompress": {
        "original": "保留“慢慢读”等原话。",
        "balanced": "可作“说明书可扫读，诗歌我愿意慢慢读，考虑的不是效率”。",
        "concise": "可作“说明书可扫读；诗歌愿慢读，非效率取舍”。"
    },
    "mustNotInfer": [
        "所有书必须慢读、慢读效率更高/更低、为提高效率读诗、所有说明书一定扫读；也不能杜撰审美或情感动机。"
    ],
    "unresolved": []
}),
  entry("HELD-R02-E003", {
    "mustPreserve": [
        r("慢读浪费时间是朋友（她）的评价。", q("HELD-R02-E003", "朋友说慢读浪费时间，那是她的评价")),
        r("表达者没有采用。", q("HELD-R02-E003")),
        "引述内容不能成为表达者立场。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“朋友认为慢读浪费时间，我没有采用她的评价”。",
        "concise": "可作“‘慢读浪费时间’是朋友的评价，我未采用”。"
    },
    "mustNotInfer": [
        "我认为慢读浪费时间、朋友劝服了我、朋友评价是客观事实、我与朋友发生争执、我认为朋友说得完全相反。"
    ],
    "unresolved": []
}),
  entry("HELD-R03-E001", {
    "mustPreserve": [
        r("数到总共十二只纸船。", q("HELD-R03-E001", "我数到十二只纸船")),
        r("其中两只是昨天留下的。", q("HELD-R03-E001", "其中两只是昨天留下的")),
        "计数与来源子集分开。",
        "表达时间未知，昨天只是相对时间。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“数到十二只纸船，其中两只昨天留下”。",
        "concise": "可作“纸船十二只，含昨天留下的两只”。"
    },
    "mustNotInfer": [
        "今天新放十二只、其余十只全是今天新放、共十四只、十二只全已到岸、把昨天绑定到其他 Topic 的日期。"
    ],
    "unresolved": ["其余纸船的放置日期和新放数量 UNRESOLVED：十二只中只明确两只昨天留下；十二减二不能证明其余十只今日新放。总数十二及其中两只昨天留下是已明确的保留项。"]
}),
  entry("HELD-R03-E002", {
    "mustPreserve": [
        r("不可把全部十二只归为今日新放。", q("HELD-R03-E002", "不能把十二只都算成今天新放的")),
        r("不可断言全部到岸。", q("HELD-R03-E002", "也不能说全部已经到达岸边")),
        "两项否定所修饰的事件不同。",
        "表达时间未知。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“十二只不能全算今天新放，也不能说已全部到岸”。",
        "concise": "可作“不可将十二只全算今日新放；不可断言全到岸”。"
    },
    "mustNotInfer": [
        "十二只全是旧船、没有纸船到岸、恰有十只到岸、全未到岸；“不能说全到岸”不等于确认全没到岸。"
    ],
    "unresolved": [r("实际到岸分布及“不能说全部到岸”背后的知识状态 UNRESOLVED：本条拒绝全到岸说法，后条又说余船位置不知，没有精确到岸/未到岸数量，不能把不可断言全到岸转成没有任何船到岸。", q("HELD-R03-E002"), q("HELD-R03-E003"))]
}),
  entry("HELD-R03-E003", {
    "mustPreserve": [
        r("河面雾大这一观察。", q("HELD-R03-E003", "河面雾太大")),
        r("表达者不知道剩余纸船的位置。", q("HELD-R03-E003", "我不知道剩下的纸船在哪里")),
        "未知不能变成丢失、沉没或已到达。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“河面雾大，剩余纸船位置不清楚”。",
        "concise": "可作“雾大，余下纸船位置未知”。"
    },
    "mustNotInfer": [
        "剩余十只、纸船沉了、纸船被人拿走、纸船都没到岸、雾造成纸船损坏。"
    ],
    "unresolved": [r("“剩下”的具体集合与数量 UNRESOLVED：总数和昨天留下的子集并不唯一对应到剩余纸船；本条明确不知道位置，不能补为十只或已沉没。未知位置本身是确定需要保留的意义。", q("HELD-R03-E003"), q("HELD-R03-E001"), q("HELD-R03-E002"))]
}),
  entry("HELD-R04-E001", {
    "mustPreserve": [
        r("练习使我有点紧张。", q("HELD-R04-E001", "演出练习让我有点紧张")),
        r("程度远未到恐惧。", q("HELD-R04-E001", "远没有到恐惧的程度")),
        "既不能放大为害怕，也不能抹平为完全不紧张。"
    ],
    "mayCompress": {
        "original": "保留“有点/远没有”。",
        "balanced": "可作“演出练习有点紧张，但远不到恐惧”。",
        "concise": "可作“排练略紧张，远非恐惧”。"
    },
    "mustNotInfer": [
        "恐惧演出、焦虑症、拒绝参与、非常兴奋、完全平静；后续授权态度不由情绪替代。"
    ],
    "unresolved": []
}),
  entry("HELD-R04-E002", {
    "mustPreserve": [
        r("自己愿意练习。", q("HELD-R04-E002", "我愿意练习")),
        r("拒绝别人代为承诺登台。", q("HELD-R04-E002", "不愿意别人替我承诺登台")),
        "练习意愿与登台承诺是不同对象。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“愿意练习，但不接受别人替我答应登台”。",
        "concise": "可作“愿练习；登台不可由他人代我承诺”。"
    },
    "mustNotInfer": [
        "已经决定登台、永远拒绝登台、不愿练习、任何人都不能提议演出。"
    ],
    "unresolved": []
}),
  entry("HELD-R04-E003", {
    "mustPreserve": [
        r("对于只是封闭排练的情形表示可以参加。", q("HELD-R04-E003", "如果只是封闭排练，我可以参加")),
        r("公开演出未定。", q("HELD-R04-E003", "公开演出还没决定")),
        "可参加不是已经参加。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“只做封闭排练的话，我可以参加；公开演出尚未决定”。",
        "concise": "可作“若只是封闭排练可参加；公开演出未定”。"
    },
    "mustNotInfer": [
        "无条件参加、已参加排练、公开演出已拒绝/已确认、练习同意等于登台同意。"
    ],
    "unresolved": []
}),
  entry("HELD-R05-E001", {
    "mustPreserve": [
        "山城租住一年是比较通勤的假设情景。",
        "一年是情景参数，不是真实居住经历或合同期限。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“只比较通勤情景：假设在山城租住一年”。",
        "concise": "可作“通勤假设：山城租住一年”。"
    },
    "mustNotInfer": [
        "已迁居山城、已租房一年、将确定居住一年、山城对应某个真实城市、这是搬家计划。"
    ],
    "unresolved": []
}),
  entry("HELD-R05-E002", {
    "mustPreserve": [
        r("迁居尚未确定。", q("HELD-R05-E002", "并没有确定迁居")),
        r("没有签合同。", q("HELD-R05-E002", "更没有签合同")),
        "“更没有”强调两个尚未发生/确认的层级。"
    ],
    "mayCompress": {
        "original": "保留全句及强调。",
        "balanced": "可作“迁居还未确定，合同更未签”。",
        "concise": "可作“迁居未定，更未签约”。"
    },
    "mustNotInfer": [
        "已决定迁居但没签约、合同正在审批、拒绝所有租约、不会迁居、租期已经确定。"
    ],
    "unresolved": []
}),
  entry("HELD-R05-E003", {
    "mustPreserve": [
        r("四十分钟属于朋友的通勤经验。", q("HELD-R05-E003", "朋友的四十分钟通勤经验")),
        r("不得当作我的实际通勤。", q("HELD-R05-E003")),
        "区分第三方经验与个人测量。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“朋友通勤四十分钟，不代表我的实际通勤”。",
        "concise": "可作“朋友通勤四十分钟，不能当作我的实际通勤”。"
    },
    "mustNotInfer": [
        "我实际通勤四十分钟、我会通勤四十分钟、我的通勤一定不等于四十分钟、朋友住在山城（未明示）。"
    ],
    "unresolved": []
}),
  entry("HELD-R06-E001", {
    "mustPreserve": [
        r("寄送 clay samples 是 might 的可能安排。", q("HELD-R06-E001", "I might send the clay samples")),
        r("时间是 next Tuesday。", q("HELD-R06-E001", "next Tuesday")),
        r("test glaze 开裂为例外/阻止条件。", q("HELD-R06-E001", "unless the test glaze cracks")),
        "不是寄送完成或确定承诺。"
    ],
    "mayCompress": {
        "original": "保留完整英语措辞。",
        "balanced": "可轻裁为“I might send the clay samples next Tuesday unless the test glaze cracks.”。",
        "concise": "可作“Clay samples may go next Tuesday, unless the test glaze cracks.”，不得把 might 改成 will。"
    },
    "mustNotInfer": [
        "下周二肯定寄、已寄出、下周二是截止日期、只有不裂就必定寄、所有样品都裂、某个精确公历日。"
    ],
    "unresolved": [r("test glaze 与蓝样品是否为同一条件对象 UNRESOLVED：本条给 unless 条件，E003 只说蓝样品裂，没有建立试釉与蓝样品的同一性或整批寄送后果。might 和 unless 的含义本身明确。", q("HELD-R06-E001"), q("HELD-R06-E003"))]
}),
  entry("HELD-R06-E002", {
    "mustPreserve": [
        "澄清所表达的是可能寄出，并未声称已经寄出；不得改写为独立查证的物流状态。",
        r("Tuesday 非确定截止。", q("HELD-R06-E002", "Tuesday 也不是确定截止日期")),
        "时间表达与行为完成状态分别受限制。"
    ],
    "mayCompress": {
        "original": "保留中英混用和全句。",
        "balanced": "可作“只说可能寄出，并未声称已寄；Tuesday 也不是确定截止”。",
        "concise": "可作“仅表示可能寄，未表示已寄；Tuesday 非确定截止”。"
    },
    "mustNotInfer": [
        "寄送已完成、必须 Tuesday 寄、未声称已寄等于已经证明现实中未寄、无论釉面状况都寄。"
    ],
    "unresolved": []
}),
  entry("HELD-R06-E003", {
    "mustPreserve": [
        r("blue sample 已有开裂描述。", q("HELD-R06-E003", "The blue sample was cracked.")),
        r("表达者自己尚未检查绿色样品；不能扩大为无人检查。", q("HELD-R06-E003", "I have not checked the green one.")),
        "蓝色事实不得转移到绿色。",
        "未知不等于完好或开裂。"
    ],
    "mayCompress": {
        "original": "保留两个英语句子。",
        "balanced": "可作“The blue sample was cracked; I have not checked the green one.”。",
        "concise": "可作“Blue sample was cracked; I have not checked green.”，保留过去状态与未检查者是我。"
    },
    "mustNotInfer": [
        "green 完好、green 也裂、全部样品损坏、已经取消寄出、blue cracked 就必定满足 test glaze 条件、开裂原因和责任。"
    ],
    "unresolved": [r("蓝样品开裂是否触发 E001 的 test glaze 条件 UNRESOLVED：未给样品与试釉的完整对应，绿色也只是我未检查。不能由一件样品的事实推整批寄送取消；蓝样品过去开裂与我未检查绿色是明确保留项。", q("HELD-R06-E003"), q("HELD-R06-E001"))]
}),
  entry("HELD-R07-E001", {
    "mustPreserve": [
        r("先前写九月二日。", q("HELD-R07-E001", "我先前写九月二日")),
        r("后来依据查看票根改为九月十二日。", q("HELD-R07-E001", "后来查看票根改为九月十二日")),
        r("纠正方向 2→12。", q("HELD-R07-E001")),
        "表达日期/年份未知。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“查看票根后，把先前的九月二日改成九月十二日”。",
        "concise": "可作“票根纠正：九月二日→九月十二日”。"
    },
    "mustNotInfer": [
        "先十二后改二、两次旅行、九月二日至十二日的区间、旅行年份、回程九月十二日；不能直接把 Entry 顺序当绝对时间。"
    ],
    "unresolved": ["被更正日期的精确事件角色与年份 UNRESOLVED：只有句内先前/后来及 2→12，表达时间 unknown；未提供票根字段，不能自行补作回程、特定年份或绝对纠正时点。内部更正方向本身明确。"]
}),
  entry("HELD-R07-E002", {
    "mustPreserve": [
        r("两条记录指向一次合成旅行。", q("HELD-R07-E002", "两条记录描述的是同一次合成旅行")),
        r("记录数量不等于旅行次数。", q("HELD-R07-E002")),
        "合成性质不得变成真实个人行程。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“两条记录说的是同一次合成旅行”。",
        "concise": "可作“两条记录，一次合成旅行”。"
    },
    "mustNotInfer": [
        "两次旅行、两次订票、来回分别一次旅行、旅行真实发生、将“两条记录”虚构成两个未提供的 Entry 标识。"
    ],
    "unresolved": [r("文内“两条记录”的独立证据身份 UNRESOLVED：只有同一次合成旅行的说明，没有两个旧记录的 ID/修订；实际冻结记录均 revision 0。可照述同一事件，不能制造旧 Entry 或 revision 1。", q("HELD-R07-E002"), q("HELD-R07-E001"))]
}),
  entry("HELD-R07-E003", {
    "mustPreserve": [
        r("回程日期未记录。", q("HELD-R07-E003", "回程日期我没有记录")),
        r("不能把出发日期用作回程日期。", q("HELD-R07-E003", "请不要把出发日期用作回程日期")),
        "未记录的回程日期不能用邻近的其他日期填补。"
    ],
    "mayCompress": {
        "original": "保留全句及请求。",
        "balanced": "可作“回程日期未记，不能用出发日期代替”。",
        "concise": "可作“回程日期未记；勿用出发日期代替”。"
    },
    "mustNotInfer": [
        "九月十二日回程、与出发同一天回程、回程一定晚于某个具体日期、旅行时长、因为未记录就没有回程。"
    ],
    "unresolved": [r("出发日期与 E001 更正日期的严格对应、回程日期的具体值 UNRESOLVED：回程未记录是明确事实；其他条只给日期纠错而未命名该日期的事件角色，不足以把九月十二日写成回程。", q("HELD-R07-E003"), q("HELD-R07-E001"))]
}),
  entry("HELD-R08-E001", {
    "mustPreserve": [
        "屋顶花园需要节水。",
        "自己没有提出取消浇水。",
        r("与 E002 文字同而表达时间不同；时间比较必须读两条被绑定的 sourceTime，不能从正文猜日期。", q("HELD-R08-E001"), q("HELD-R08-E002")),
        "本条时间为源记录的01:00Z。"
    ],
    "mayCompress": {
        "original": r("保留本条原句和独立时间，不单靠与 E002 正文相同去重。", q("HELD-R08-E001"), q("HELD-R08-E002")),
        "balanced": r("可与 E002 共同表达重复立场，但须列出两条来源并保留两次表达/时间。", q("HELD-R08-E001"), q("HELD-R08-E002")),
        "concise": r("可压为‘屋顶花园需节水；两次记录均未提出取消浇水’，附两次真实时间；这不证明两次独立采样。", q("HELD-R08-E001"), q("HELD-R08-E002"))
    },
    "mustNotInfer": [
        r("禁止推断提出取消浇水、反对一切浇水、节水必然等于不浇水、把 E003 取消自动喷水器改为取消全部浇水、称三条完全重复。", q("HELD-R08-E001"), q("HELD-R08-E002"), q("HELD-R08-E003"))
    ],
    "unresolved": [r("取消自动喷水器与取消全部浇水是否具有实际等价关系 UNRESOLVED：本条否认提出取消浇水，E003 只提取消设备；没有完整浇水系统信息，不能强行裁成矛盾或撤回。两条各自的明确表达仍须保留。", q("HELD-R08-E001"), q("HELD-R08-E003"))]
}),
  entry("HELD-R08-E002", {
    "mustPreserve": [
        r("与 E001 相同的节水及未提出取消浇水含义；两个 Entry 的来源身份都须保留。", q("HELD-R08-E002"), q("HELD-R08-E001")),
        "这是另一个真实 Entry 和02:00Z表达时间。",
        "不能把身份/时间吞掉。"
    ],
    "mayCompress": {
        "original": r("保留本句独立呈现及本条源记录的表达时间；不要因与 E001 正文相同删除此次表达。", q("HELD-R08-E002"), q("HELD-R08-E001")),
        "balanced": r("可以与 E001 压缩重复内容，但须保留两条真实来源和各自时间，不能伪装成一次表达。", q("HELD-R08-E002"), q("HELD-R08-E001")),
        "concise": r("可用‘两次记录均未提出取消浇水’压缩重复措辞；必须保留两次来源和时间，且不得与取消自动喷水器合成更宽命题。", q("HELD-R08-E002"), q("HELD-R08-E001"), q("HELD-R08-E003"))
    },
    "mustNotInfer": [
        r("禁止推断本条是 E001 的修订、最新更新覆盖 E001、两个 Entry 是两个独立作者、把同字串直接视为可删的全部语义；身份与时间必须用各自绑定的源记录核查。", q("HELD-R08-E002"), q("HELD-R08-E001"))
    ],
    "unresolved": []
}),
  entry("HELD-R08-E003", {
    "mustPreserve": [
        "屋顶花园节水目的。",
        "自己提出取消的是自动喷水器。",
        "“提出”不是已执行。",
        "因果连接是本人明确说出的理由。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“为屋顶花园节水，我提出取消自动喷水器”。",
        "concise": "可作“为节水，提议取消屋顶花园自动喷水器”。"
    },
    "mustNotInfer": [
        r("禁止推断取消所有浇水、设备已拆除、没有任何替代浇水方式、以本条证明之前两条自相矛盾或被撤回、节水成效已证实。", q("HELD-R08-E003"), q("HELD-R08-E001"), q("HELD-R08-E002"))
    ],
    "unresolved": [r("取消设备是否等于取消全部浇水 UNRESOLVED：前两条与本条使用不同范围的对象，未给设备是否唯一浇水方式的证据。不能补出已冲突或已解决的最终立场；提出设备取消本身明确。", q("HELD-R08-E003"), q("HELD-R08-E001"), q("HELD-R08-E002"))]
}),
  entry("HELD-R09-E001", {
    "mustPreserve": [
        r("灯光刺眼的强烈表达。", q("HELD-R09-E001", "灯光太刺眼！")),
        r("真想只调暗一点。", q("HELD-R09-E001", "我真想把它调暗一点")),
        r("明确不是彻底关掉。", q("HELD-R09-E001", "不是彻底关掉")),
        "愿望不能变成已执行操作。",
        r("保留感叹号的跨 Entry 要求；E003 明确要求保留自己的感叹号，不能当作可删的冗余标点。", q("HELD-R09-E001", "灯光太刺眼！"), q("HELD-R09-E003", "请保留我的感叹号"))
    ],
    "mayCompress": {
        "original": r("保留原句与感叹号。", q("HELD-R09-E001"), q("HELD-R09-E003", "请保留我的感叹号")),
        "balanced": r("可作‘灯光太刺眼！我真想调暗一点，不是彻底关掉’，保留本人要求的感叹号。", q("HELD-R09-E001"), q("HELD-R09-E003", "请保留我的感叹号")),
        "concise": r("可作‘灯光太刺眼！真想调暗一点，而非全关’，仍保留表达强调及本人要求的感叹号。", q("HELD-R09-E001"), q("HELD-R09-E003", "请保留我的感叹号"))
    },
    "mustNotInfer": [
        r("禁止推断要求彻底关灯、已经关灯、调到某个亮度数值、完全不能忍受灯光、将‘一点恼火’升为暴怒。", q("HELD-R09-E001"), q("HELD-R09-E003", "我确实有一点恼火。"))
    ],
    "unresolved": []
}),
  entry("HELD-R09-E002", {
    "mustPreserve": [
        r("引号中的全部关灯来自海报。", q("HELD-R09-E002", "“全部关灯”是海报上的一句话")),
        r("不是自己的操作指令。", q("HELD-R09-E002")),
        "该引述作为文本对象而非命令处理。"
    ],
    "mayCompress": {
        "original": "保留全句和引号。",
        "balanced": "可作“海报写着‘全部关灯’，这不是我的操作指令”。",
        "concise": "可作“‘全部关灯’是海报文字，非我的指令”。"
    },
    "mustNotInfer": [
        "我下令全部关灯、海报作者就是我、海报要求已经执行、引用本身授予操作权限。"
    ],
    "unresolved": []
}),
  entry("HELD-R09-E003", {
    "mustPreserve": [
        r("明确要求保留自己的感叹号。", q("HELD-R09-E003", "请保留我的感叹号")),
        r("确实存在一点恼火。", q("HELD-R09-E003", "我确实有一点恼火")),
        "既不删情绪也不加强到非常愤怒。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“请保留感叹号，我确实有点恼火”。",
        "concise": "可作“保留感叹号；确有一点恼火”。"
    },
    "mustNotInfer": [
        "情绪中性、非常愤怒、所有标点都能删、任意增加一串感叹号、将情绪诊断为疾病。"
    ],
    "unresolved": []
}),
  entry("HELD-R10-E001", {
    "mustPreserve": [
        r("观察中浸水后发芽更快。", q("HELD-R10-E001", "种子浸水后发芽更快")),
        r("只有两组观察。", q("HELD-R10-E001", "但这里只有两组观察")),
        "时间先后/观察关联不自动等于已确认因果。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“浸水后的种子发芽更快，但目前只有两组观察”。",
        "concise": r("可作‘两组观察：浸水后发芽较快’，但合并全 Topic 时仍保留 E002 的温度未排除/因果未定，不把观察改成因果结论。", q("HELD-R10-E001"), q("HELD-R10-E002"))
    },
    "mustNotInfer": [
        "浸水已证实导致更快发芽、很多组实验重复验证、只有两粒种子、温度被控制、已得普遍结论。"
    ],
    "unresolved": [r("浸水对发芽速度的因果作用 UNRESOLVED：本条只有两组观察，E002 明确温差未排除、因果未确认。观察到的先后关联可以保留，不能从中推出确认因果。", q("HELD-R10-E001"), q("HELD-R10-E002"))]
}),
  entry("HELD-R10-E002", {
    "mustPreserve": [
        r("温度差异不能排除。", q("HELD-R10-E002", "我不能排除温度差异")),
        r("因而尚不能确认浸水的因果作用。", q("HELD-R10-E002")),
        "怀疑混杂并不证明温度是原因。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“温度差异尚不能排除，因而未能确认是浸水所致”。",
        "concise": "可作“温差尚不能排除，浸水因果未定”。"
    },
    "mustNotInfer": [
        "已经排除温度差异、确定由浸水导致、确定由温度导致、浸水绝无作用、两组结果无效且必须删掉。"
    ],
    "unresolved": ["浸水与温差的实际因果作用 UNRESOLVED：不能排除温差不证明温度就是原因，也不证明浸水无效。表达者未能确认因果这一认识状态本身明确，不应被标成已否认浸水作用。"]
}),
  entry("HELD-R10-E003", {
    "mustPreserve": [
        r("下次打算同时控温。", q("HELD-R10-E003", "下次打算同时控制温度")),
        r("计划未执行。", q("HELD-R10-E003", "这个计划尚未执行")),
        "不能将未来计划当作现有实验方法或完成结果。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“下次计划同时控制温度，目前尚未执行”。",
        "concise": "可作“下次拟控温，尚未执行”。"
    },
    "mustNotInfer": [
        "已经控温、计划已开始/已完成、控温将一定证明浸水有效、下次具体日期、已排除温度混杂。"
    ],
    "unresolved": []
}),
  entry("HELD-R11-E001", {
    "mustPreserve": [
        r("标签精确显示为 café ☕（e后组合音标）。", q("HELD-R11-E001", "café ☕")),
        r("组合音标并非另一个字的表述。", q("HELD-R11-E001", "组合音标不是另一个字")),
        "讨论的是文字标签，不是喝咖啡事实。"
    ],
    "mayCompress": {
        "original": "保留原文及组合序列，不无授权 NFC 改写。",
        "balanced": "可作“标签是 café ☕；组合音标不另算一个字”。",
        "concise": "可作“café ☕：组合音标不另算字”。所有模式引文跨度须完整覆盖字素。"
    },
    "mustNotInfer": [
        "标签多一个字、喝过咖啡、咖啡偏好/消费次数、☕是另一次饮品记录、组合音标可独立作证据片段；时间未知。"
    ],
    "unresolved": []
}),
  entry("HELD-R11-E002", {
    "mustPreserve": [
        r("草稿中的字串“家人👨‍👩‍👧‍👦”。", q("HELD-R11-E002", "“家人👨‍👩‍👧‍👦”")),
        r("一个家庭组合图案不应拆为四个独立人。", q("HELD-R11-E002", "不要把一个家庭图案拆成四个独立人")),
        "图形数量不是现实人数。"
    ],
    "mayCompress": {
        "original": "保留 ZWJ 组合及全句。",
        "balanced": "可作“草稿是‘家人👨‍👩‍👧‍👦’，请勿把家庭图案拆成四个独立人”。",
        "concise": "可作“保留‘家人👨‍👩‍👧‍👦’整体图案，不拆成四人”。"
    },
    "mustNotInfer": [
        "我家四口人、四个独立图标就是四个人、把 ZWJ 序列截断成某一家庭成员的有效引文、家庭成员的性别年龄身份。"
    ],
    "unresolved": []
}),
  entry("HELD-R11-E003", {
    "mustPreserve": [
        r("讨论范围仅文字标注。", q("HELD-R11-E003", "这里只在比较文字标注")),
        r("不能由此推断我有四位家庭成员。", q("HELD-R11-E003")),
        "不代表为证据边界，而非肯定真实人数不等于四。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": "可作“这里只比较文字标注，不能据此认定我有四位家人”。",
        "concise": "可作“仅比较标注，非四位家人的证据”。"
    },
    "mustNotInfer": [
        "确定家中四人、确定不是四人、没有家人、家庭图案是现实合照、以标注作为授权个人信息。"
    ],
    "unresolved": []
}),
  entry("HELD-R12-E001", {
    "mustPreserve": [
        r("旧码头摄影与新码头测绘是两个不同对象/活动。", q("HELD-R12-E001")),
        r("人类明确放在两个独立章节。", q("HELD-R12-E001")),
        "词汇共享不等于身份相同。"
    ],
    "mayCompress": {
        "original": "保留全句及源Section位置。",
        "balanced": "可作“旧码头摄影与新码头测绘分别放在两个独立章节”。",
        "concise": "可作“旧码头摄影、新码头测绘分章保留”。"
    },
    "mustNotInfer": [
        "合并为一个码头项目、把旧/新当同一项目版本、自动移动Entry到另一Section、自动重命名章节；此文本也不是新写入权限。"
    ],
    "unresolved": [r("S1/S2 与文中两个章节名称的完整映射 UNRESOLVED：真实放置可由 sectionId 验证，但文本只有两个对象分章的明确意图，没有完整名称映射；不得按语义移动来源。", q("HELD-R12-E001"), q("HELD-R12-E002"), q("HELD-R12-E003"))]
}),
  entry("HELD-R12-E002", {
    "mustPreserve": [
        r("二者承接 E001 的旧码头摄影/新码头测绘；这个指代不能脱离先行对象。", q("HELD-R12-E002"), q("HELD-R12-E001")),
        r("虽共享词码头仍明确要求独立。", q("HELD-R12-E002")),
        "这是组织约束。"
    ],
    "mayCompress": {
        "original": "保留全句。",
        "balanced": r("可在同一证据支持下补出旧码头摄影、新码头测绘这两个已有对象名，保留分别保留要求。", q("HELD-R12-E002"), q("HELD-R12-E001")),
        "concise": r("可作‘同提码头，仍分别保留’，须保留 E001 上下文来源，不孤立二者指代。", q("HELD-R12-E002"), q("HELD-R12-E001"))
    },
    "mustNotInfer": [
        "词同即可合并、仅是默认可覆盖建议、统一项目/统一成果、移除独立章节；不得凭未来模型置信度覆盖此人类意图。"
    ],
    "unresolved": []
}),
  entry("HELD-R12-E003", {
    "mustPreserve": [
        r("摄影章节有三幅图片这一指称。", q("HELD-R12-E003", "摄影章节的三幅图片")),
        r("这些图片不等于测绘项目的三份成果。", q("HELD-R12-E003")),
        "两组同样的数词不证明对象/类别相同。",
        "冻结本条在S2。"
    ],
    "mayCompress": {
        "original": "保留全句和Section。",
        "balanced": "可作“摄影章节三幅图片，不能算作测绘项目的三份成果”。",
        "concise": "可作“摄影三图≠测绘三份成果”，但不能将简写当作新的量化总数。"
    },
    "mustNotInfer": [
        "测绘已产出三份成果、共六份成果、摄影与测绘共享三份成果、图片就是地图、因为正文摄影就移动本Entry/反转S1S2。"
    ],
    "unresolved": ["测绘实际成果数及章节名称/ID完整映射 UNRESOLVED：否定摄影三图等于测绘三份成果不能直接作测绘实际总量的证据；真实本条仍在 S2，不按正文中的摄影一词改放置。两类对象不能等同的限制明确。"]
}),
];

const relation = (kind, status, text, ...quotes) => ({ kind, status, text, quotes });

export const topicDrafts = [
  {
    topicId: "HELD-R01",
    relations: [
      relation("DEPENDENCY", "DRAFT", "四百元上限只是考虑举办的必要条件；询价授权不是付款或报名授权；到正文所说周五仍无报价、活动暂未定。合并三条时必须同时保留这些限制，不能从条件可满足推出安排已确认。", q("HELD-R01-E001"), q("HELD-R01-E002"), q("HELD-R01-E003")),
      relation("TEMPORAL", "UNRESOLVED", "正文中的周五、周六对应哪个公历日期尚不明确；绑定的 Entry ISO 是表达时间证据，正文没有声明二者的换算关系，不可用 ISO 修正正文、设置截止或断言活动已取消。", q("HELD-R01-E001"), q("HELD-R01-E003"))
    ]
  },
  {
    topicId: "HELD-R02",
    relations: [
      relation("CORRECTION", "DRAFT", "去年认可所有书都适合速读，现在撤回的是该普遍命题；说明书可扫读、愿慢读诗歌是当前的分情况表达。保留观点改变，不改成一直赞成速读、一直反对速读或所有书都应慢读。", q("HELD-R02-E001"), q("HELD-R02-E002")),
      relation("CONFLICT", "DRAFT", "旧的普遍速读观点与当前不认同不能合成一个无时间的统一信念。原文已用去年/现在区分两种立场，保留这种相反关系和变化顺序；它不是同一时刻尚未解决的逻辑矛盾。", q("HELD-R02-E001"), q("HELD-R02-E002")),
      relation("ATTRIBUTION", "DRAFT", "慢读浪费时间属于朋友（她）的评价，表达者明确没有采用；不能与自己愿慢读诗歌拼成‘我觉得慢读浪费时间’，也不能杜撰朋友使其改变观点的原因。", q("HELD-R02-E002"), q("HELD-R02-E003"))
    ]
  },
  {
    topicId: "HELD-R03",
    relations: [
      relation("SCOPE", "DRAFT", "十二只是计数总量，两只是其中昨天留下的子集；原文反对全算今日新放，也反对断言全已到岸，另有余船位置未知。不同数量与位置陈述不能混成一个到岸或新放计数。", q("HELD-R03-E001"), q("HELD-R03-E002"), q("HELD-R03-E003")),
      relation("DEPENDENCY", "UNRESOLVED", "余下纸船的成员和数量、实际新放及到岸数量都未给出。十二减二只能得到非该已指明子集的算术差，不能把它命名为十只今日新放或十只未到岸；河面雾大也不证明沉没。", q("HELD-R03-E001"), q("HELD-R03-E002"), q("HELD-R03-E003")),
      relation("TEMPORAL", "UNRESOLVED", "三条表达时间均为 unknown，正文的今天/昨天只有相对含义。没有可核对的绝对日期，不能用数组顺序或其他 Topic 时间补齐。", q("HELD-R03-E001"), q("HELD-R03-E002"), q("HELD-R03-E003"))
    ]
  },
  {
    topicId: "HELD-R04",
    relations: [
      relation("SCOPE", "DRAFT", "愿意练习；对于只是封闭排练的情形表示可以参加；公开演出尚未决定。该表达不授权别人代为承诺登台，也不额外禁止全部其他可能情境。练习、封闭排练、公开演出和代为承诺各有边界。", q("HELD-R04-E002"), q("HELD-R04-E003")),
      relation("DEPENDENCY", "DRAFT", "一点紧张、远非恐惧是情绪强度；不能用它推断公开演出的最终意愿。整理需并列保留情绪、本人决定权和公开演出尚未决定，不以情绪替代授权事实。", q("HELD-R04-E001"), q("HELD-R04-E002"), q("HELD-R04-E003"))
    ]
  },
  {
    topicId: "HELD-R05",
    relations: [
      relation("SCOPE", "DRAFT", "山城租住一年属于比较通勤的假设；尚未确定迁居、没有签合同是现实状态的明确限制。一年不能变成已签租约或真实居住经历。", q("HELD-R05-E001"), q("HELD-R05-E002")),
      relation("ATTRIBUTION", "DRAFT", "四十分钟属于朋友的经验，不能转作假设中的我或现实中的我的实际通勤。文本未明示朋友所在地、交通方式或我的实测通勤，不能用同一话题作为主体转换依据。", q("HELD-R05-E001"), q("HELD-R05-E003"))
    ]
  },
  {
    topicId: "HELD-R06",
    relations: [
      relation("DEPENDENCY", "DRAFT", "E002 澄清 E001 的 might 为可能寄送、并非声称已经寄送，Tuesday 也非确定截止。合并时仍须保留 E001 的 test glaze 开裂例外。E002 是表达含义澄清，不是独立的物流查验回执。", q("HELD-R06-E001"), q("HELD-R06-E002")),
      relation("DEPENDENCY", "UNRESOLVED", "蓝样品开裂与 test glaze 是否是同一对象没有给出；绿色样品只是表达者自己未检查。不能自动推成条件已触发、全部样品坏了、寄送取消或绿色完好，需保留对象关系未知。", q("HELD-R06-E001"), q("HELD-R06-E003")),
      relation("TEMPORAL", "UNRESOLVED", "next Tuesday 是可能安排中的相对时间，中文补充明确不是确定截止。没有明确事件日期/最终寄送证据，不能从表达 ISO 擅自形成日期或将可能寄送改成已完成。", q("HELD-R06-E001"), q("HELD-R06-E002"))
    ]
  },
  {
    topicId: "HELD-R07",
    relations: [
      relation("CORRECTION", "DRAFT", "句内证据明确先写九月二日，后查票根改九月十二日；两条记录描述同一次合成旅行。这是 2→12 的更正，不是两次旅行或一段九月二日至十二日的行程。", q("HELD-R07-E001"), q("HELD-R07-E002")),
      relation("TEMPORAL", "UNRESOLVED", "所有表达日期均 unknown，年份、实际更正发生日与回程日未给出。E001 没有明确写出被改日期的事件角色；E003 禁止把出发日代作回程日。可保留已知纠错顺序，不能据此补年份、日程或九月十二日回程。", q("HELD-R07-E001"), q("HELD-R07-E002"), q("HELD-R07-E003")),
      relation("SCOPE", "UNRESOLVED", "正文提到的两条旧记录没有各自的 Entry ID 或修订证据；冻结记录的实际 revision 均为 0。不能为叙述中的旧日期制造旧 Entry、revision 1、票根文件或真实作者行程回执。", q("HELD-R07-E001"), q("HELD-R07-E002"))
    ]
  },
  {
    topicId: "HELD-R08",
    relations: [
      relation("TEMPORAL", "DRAFT", "E001/E002 正文完全相同但来源是两个 Entry，绑定表达时间分别为 2026-02-08T01:00:00Z 和 2026-02-08T02:00:00Z。Original 保留两次表达；其他样式压缩重复措辞也保留两条来源和时间，不制造一次表达或两个独立作者。", q("HELD-R08-E001"), q("HELD-R08-E002")),
      relation("SCOPE", "DRAFT", "未提出取消浇水与提出取消自动喷水器是不同范围；第三条不是前两条的相同复述。不能以共享‘屋顶花园/节水/取消’改成提出取消全部浇水，也不能把提出改为已执行。", q("HELD-R08-E001"), q("HELD-R08-E002"), q("HELD-R08-E003")),
      relation("CONFLICT", "UNRESOLVED", "自动喷水器是否是唯一浇水方式、提议取消是否影响全部浇水未给出。因此没有足够证据裁定两类表达实际矛盾或后来撤回前说；保留两者及各自范围，不能强行解决成统一取消命令。", q("HELD-R08-E001"), q("HELD-R08-E002"), q("HELD-R08-E003"))
    ]
  },
  {
    topicId: "HELD-R09",
    relations: [
      relation("ATTRIBUTION", "DRAFT", "只想把灯调暗一点是表达者愿望；全部关灯是海报文字且明确不是自己的操作指令。合法地引用海报不允许把它变成表达者命令或遮蔽相反的调暗范围。", q("HELD-R09-E001"), q("HELD-R09-E002")),
      relation("DEPENDENCY", "DRAFT", "E003 明确要求保留自己的感叹号并说确实有一点恼火；整理 E001 时保留感叹号、‘太刺眼/真想’的强调和有限调暗愿望，不能删成中性报告或升为暴怒。", q("HELD-R09-E001"), q("HELD-R09-E003"))
    ]
  },
  {
    topicId: "HELD-R10",
    relations: [
      relation("DEPENDENCY", "UNRESOLVED", "两组观察中浸水后发芽更快，但温度差异未排除，因果仍未确认。没有更多观察或已控制温度的证据，不能断言浸水有效、浸水无效或温度就是原因。", q("HELD-R10-E001"), q("HELD-R10-E002")),
      relation("TEMPORAL", "DRAFT", "下次同时控制温度只是尚未执行的计划，不能倒灌为前述两组观察已经控温，也不能变成已完成验证、既有因果结论或精确未来日期。", q("HELD-R10-E001"), q("HELD-R10-E002"), q("HELD-R10-E003"))
    ]
  },
  {
    topicId: "HELD-R11",
    relations: [
      relation("SCOPE", "DRAFT", "三条都讨论文字标注：café ☕ 的组合音标、家人👨‍👩‍👧‍👦 的完整家庭图案，以及不是四位家庭成员的证据。必须把原文字素作为完整证据，不将字形部件和数字转成人口、饮食或其他真实个人信息。", q("HELD-R11-E001"), q("HELD-R11-E002"), q("HELD-R11-E003")),
      relation("DEPENDENCY", "DRAFT", "E003 明确限制 E002 的解释：图案不代表实际有四位家人，同时也没有证明实际人数不等于四。该否定约束的是推断依据，不是给出一个相反的人口事实。", q("HELD-R11-E002"), q("HELD-R11-E003")),
      relation("TEMPORAL", "UNRESOLVED", "三条源时间都是 unknown，正文也未提供绝对时间；标签和草稿的创作日期以及真实家庭信息均无证据，不从编号、表情或相邻主题推断。", q("HELD-R11-E001"), q("HELD-R11-E002"), q("HELD-R11-E003"))
    ]
  },
  {
    topicId: "HELD-R12",
    relations: [
      relation("SCOPE", "DRAFT", "E001 定义旧码头摄影与新码头测绘两个对象，E002 明确即使同提码头仍分别保留。E003 的摄影三幅图片不等于测绘三份成果；相同关键词或数量不能抹去对象身份和保留独立章节的人工意图。", q("HELD-R12-E001"), q("HELD-R12-E002"), q("HELD-R12-E003")),
      relation("DEPENDENCY", "UNRESOLVED", "冻结来源中 E001/E002 在 S1、E003 在 S2，但未给出 S1/S2 与文中章节名的完整映射。正文提到摄影不授予移动 Entry、重命名章节或交换 S1/S2 的权限；测绘实际成果数也不能从‘不是三份成果’补出。", q("HELD-R12-E001"), q("HELD-R12-E002"), q("HELD-R12-E003"))
    ]
  }
];
