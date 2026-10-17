// Public synthetic semantic-review examples, not blind reviewer packets.
// Every adjudication in this module is AI_AUTHORED_DRAFT.
// No independent human semantic review, author acceptance, model call, or
// model quality qualification is implied; those statuses remain NOT_RUN.
// Valid evidence bindings do not establish the meaning of outputText.
// These are proposed counterexamples, not observed runtime acceptances.

export const adversarialDrafts = [
  {
    "caseId": "ADV-01",
    "topicId": "HELD-R01",
    "category": "NEGATION_FLIP",
    "outputText": "我同意付款，也已确认报名。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R01-E002",
        "literal": "我同意先询价；这不是同意付款，也不是报名确认。"
      }
    ],
    "reason": "原文只同意先询价，并明确否认付款与报名确认；有效引用不能把三个不同授权层级合并为已批准。",
    "perStyle": {
      "original": "保留“先询价”“不是同意付款”“不是报名确认”的原句，不从否定句抽出肯定宾语。",
      "balanced": "可合为“这里同意的只是先询价，不代表同意付款或确认报名”，但不能扩大这次同意的范围，也不推断其他场合的授权。",
      "concise": "可压缩为“同意先询价，不等于同意付款或确认报名”，必须保留三个动作的不同授权范围。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-02",
    "topicId": "HELD-R01",
    "category": "CONDITION_DROPPED",
    "outputText": "我已决定周六举办木工分享。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R01-E001",
        "literal": "只有场地费用不超过四百元，我才考虑周六举办木工分享。"
      },
      {
        "entryId": "HELD-R01-E003",
        "literal": "周五仍没有报价，周六的活动暂时没有确定。"
      }
    ],
    "reason": "“费用不超过四百元”是必要条件，达到条件后也只是“考虑”；另一条仍未获得报价、活动未确定。删除两层限制会把意向变成承诺。 待独立核实的未知仍为UNRESOLVED：周五和周六的绝对日历日期；记录时间不自动确定所述事件日期。",
    "perStyle": {
      "original": "保留条件句和“暂时没有确定”的独立原句。",
      "balanced": "可衔接“只有场地费≤四百元才考虑举办；报价尚无，活动暂未确定”，不能把考虑写成决定。",
      "concise": "可减少活动的重复称谓，费用上限、考虑与未定状态不可删。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-03",
    "topicId": "HELD-R02",
    "category": "SUBJECT_MISMATCH",
    "outputText": "我认为慢读浪费时间。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R02-E003",
        "literal": "朋友说慢读浪费时间，那是她的评价，我没有采用。"
      }
    ],
    "reason": "“慢读浪费时间”的主体是朋友；叙述者明确没有采用该评价。保留原句中的关键词甚至引用位置，仍不能改变意见归属。",
    "perStyle": {
      "original": "必须完整保留朋友说与“我没有采用”的原句，不单独提升引述为第一人称立场。",
      "balanced": "可写“朋友觉得慢读浪费时间，我没有采纳”，两方主体与未采纳关系都保留。",
      "concise": "即使压缩为“未采纳朋友的‘慢读浪费时间’评价”，也不得变成自己的信念或加强朋友原本的评价。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-04",
    "topicId": "HELD-R07",
    "category": "TIME_MISPLACED",
    "outputText": "2026年9月12日是这次旅行已记录的回程日期。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R07-E001",
        "literal": "我先前写九月二日，后来查看票根改为九月十二日。"
      },
      {
        "entryId": "HELD-R07-E002",
        "literal": "两条记录描述的是同一次合成旅行，不是两次旅行。"
      },
      {
        "entryId": "HELD-R07-E003",
        "literal": "回程日期我没有记录，请不要把出发日期用作回程日期。"
      }
    ],
    "reason": "改正后的九月十二日不能补上原文没有的年份；回程日期明确未记录。真实的数字与有效引用仍不证明把日期挂到回程这个事件角色上正确。 待独立核实的未知仍为UNRESOLVED：年份、回程日期、三条表达发生的绝对时间与相互记录顺序。",
    "perStyle": {
      "original": "保留纠错顺序、同一次旅行与未记录回程的三条原句。",
      "balanced": "可连贯表述日期由九月二日改为九月十二日，仍须单独保留回程未知。",
      "concise": "可精炼叙述连接词，仍保留票根纠错方向、同一次旅行与回程未记录；不补年份或回程日期。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-05",
    "topicId": "HELD-R08",
    "category": "FALSE_MERGE",
    "outputText": "为了节水，我反复提出全面停止浇水，包括取消自动喷水器。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R08-E001",
        "literal": "屋顶花园需要节水，但我没有提出取消浇水。"
      },
      {
        "entryId": "HELD-R08-E002",
        "literal": "屋顶花园需要节水，但我没有提出取消浇水。"
      },
      {
        "entryId": "HELD-R08-E003",
        "literal": "屋顶花园需要节水，所以我提出取消自动喷水器。"
      }
    ],
    "reason": "前两条没有提出取消浇水；第三条只提出取消自动喷水器。设备手段与浇水行为不是同义项，不可用“都在节水”把范围不同且有否定的句子合成全面停水。 待独立核实的未知仍为UNRESOLVED：取消自动喷水器后的替代浇水办法未说明；不能擅自补出手动浇水。",
    "perStyle": {
      "original": "正文相同的E1/E2有不同时间；必须保留两次表达的时间/证据，E3不能作为近似重复吞并。",
      "balanced": "可以说明两次表达都未提出取消浇水，之后另提取消自动喷水器；不能抹去次数、时间或设备范围。",
      "concise": "可压缩共同背景“节水”，但仍分别保留未提出取消浇水与提出取消自动喷水器。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-06",
    "topicId": "HELD-R07",
    "category": "CORRECTION_REVERSED",
    "outputText": "同一次旅行的日期原是九月十二日，查票根后改成九月二日。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R07-E001",
        "literal": "我先前写九月二日，后来查看票根改为九月十二日。"
      },
      {
        "entryId": "HELD-R07-E002",
        "literal": "两条记录描述的是同一次合成旅行，不是两次旅行。"
      }
    ],
    "reason": "句中全部日期与同一次旅行都能在引用中找到，但先前九月二日、后来改九月十二日的方向被倒转。所有词有来源不等于整句关系有来源。 待独立核实的未知仍为UNRESOLVED：纠错实际发生的年月日未知。",
    "perStyle": {
      "original": "保留“先前写九月二日，后来……改为九月十二日”的原序。",
      "balanced": "可改为“同一次旅行的日期由9月2日更正为9月12日”，不交换旧值与新值。",
      "concise": "可用“9/2→9/12（同一次旅行的纠错）”作为精炼表述，但不是虚构第二次旅行。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-07",
    "topicId": "HELD-R03",
    "category": "FALSE_MERGE",
    "outputText": "今天新放的十只纸船都已经到岸。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R03-E001",
        "literal": "我数到十二只纸船，其中两只是昨天留下的。"
      },
      {
        "entryId": "HELD-R03-E002",
        "literal": "不能把十二只都算成今天新放的，也不能说全部已经到达岸边。"
      },
      {
        "entryId": "HELD-R03-E003",
        "literal": "河面雾太大，我不知道剩下的纸船在哪里。"
      }
    ],
    "reason": "十二减两只能说明十只不属于被明确指出的两只昨日遗留，不能断言十只全在今天新放；到岸更被明确限制，余船位置未知。数值运算、日词与引用均真实也不足以支持新事实。 待独立核实的未知仍为UNRESOLVED：今日新放的准确数量、已到岸数量、其余位置及今天/昨天的绝对日期。",
    "perStyle": {
      "original": "保留十二只、其中两只昨天留下、不能全部算今日新放和去向未知的原句。",
      "balanced": "可把计数与观察限制连起来，但不把集合差额当成已观察的十只今日新船。",
      "concise": "可压缩成“共见十二只，其中两只昨日遗留；不能全算今日新放，余船去向未知”，不能删未知。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-08",
    "topicId": "HELD-R05",
    "category": "SUBJECT_MISMATCH",
    "outputText": "我已在山城签约租住一年，实际通勤四十分钟。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R05-E001",
        "literal": "假设我在山城租住一年，这里只是在比较通勤情景。"
      },
      {
        "entryId": "HELD-R05-E002",
        "literal": "并没有确定迁居，更没有签合同。"
      },
      {
        "entryId": "HELD-R05-E003",
        "literal": "朋友的四十分钟通勤经验不能当成我的实际通勤时间。"
      }
    ],
    "reason": "一年租住是通勤比较的假设，迁居和合同均未确定；四十分钟属于朋友经验。错误输出同时把假设、计划状态与他人经验伪装成作者事实。 待独立核实的未知仍为UNRESOLVED：是否会迁居、是否会签约、作者实际通勤时间。",
    "perStyle": {
      "original": "保留假设和否定的原句、朋友的归属，不删“假设”后拼接。",
      "balanced": "可连续表达“假设租一年仅为比较通勤；未定迁居/未签约；朋友四十分钟不能当我的实测”。",
      "concise": "可省比较背景的重复词，不能省假设性、未执行状态或主体边界。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-09",
    "topicId": "HELD-R06",
    "category": "FALSE_MERGE",
    "outputText": "绿色样本已经开裂，因此所有样本都不能在下周二寄出。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R06-E001",
        "literal": "I might send the clay samples next Tuesday, unless the test glaze cracks."
      },
      {
        "entryId": "HELD-R06-E002",
        "literal": "我说的是可能寄出，不是已经寄出；Tuesday 也不是确定截止日期。"
      },
      {
        "entryId": "HELD-R06-E003",
        "literal": "The blue sample was cracked. I have not checked the green one."
      }
    ],
    "reason": "已知开裂的是蓝色样本，绿色未检查；寄出只是带釉裂例外的可能计划，Tuesday并非确定截止。不能把局部检测结果串成全体取消与硬日期结论。 待独立核实的未知仍为UNRESOLVED：蓝色开裂是否等于第一条的test glaze cracks条件被满足；哪些样本寄出；绿色是否开裂；是否取消或改期。",
    "perStyle": {
      "original": "保留英文might/unless、中文澄清和蓝/绿检测状态三条原句。",
      "balanced": "可修顺双语片段，但必须保留可能性、裂釉例外、非截止日期、蓝色已裂/绿色未查。",
      "concise": "可压缩重复的“可能不是已经”，不得把未知的绿色状态和全体寄送结论补完。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-10",
    "topicId": "HELD-R04",
    "category": "NEGATION_FLIP",
    "outputText": "我极度恐惧公开演出，但已经承诺登台。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R04-E001",
        "literal": "演出练习让我有点紧张，远没有到恐惧的程度。"
      },
      {
        "entryId": "HELD-R04-E002",
        "literal": "我愿意练习，但不愿意别人替我承诺登台。"
      },
      {
        "entryId": "HELD-R04-E003",
        "literal": "如果只是封闭排练，我可以参加；公开演出还没决定。"
      }
    ],
    "reason": "原文只是有点紧张，远未恐惧；愿意练习不授权他人代为承诺，公开演出尚未决定。情绪加强和义务升级都不是润色。 待独立核实的未知仍为UNRESOLVED：最后是否参加公开演出。",
    "perStyle": {
      "original": "保留“有点”“远没有到恐惧”“不愿意别人替我承诺”及封闭排练/公开演出区别。",
      "balanced": "可合成自然一段，轻度紧张、承诺自主与封闭排练条件不可删。",
      "concise": "可以压缩练习的重复称谓，不能将不确定的公开登台写成既成承诺或把紧张升级为恐惧。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-11",
    "topicId": "HELD-R09",
    "category": "SUBJECT_MISMATCH",
    "outputText": "灯太刺眼！我命令全部关灯。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R09-E001",
        "literal": "灯光太刺眼！我真想把它调暗一点，不是彻底关掉。"
      },
      {
        "entryId": "HELD-R09-E002",
        "literal": "“全部关灯”是海报上的一句话，不是我的操作指令。"
      },
      {
        "entryId": "HELD-R09-E003",
        "literal": "请保留我的感叹号；我确实有一点恼火。"
      }
    ],
    "reason": "原文要调暗一点而非彻底关掉；全部关灯来自海报且被明确排除为操作指令。保留感叹号不能补救观点归属和动作范围的错误。",
    "perStyle": {
      "original": "保留感叹号、调暗一点/非全关、海报引述与一点恼火三条原句。",
      "balanced": "可修整段落，保留表达力度和感叹号，不把海报文字变成自己的操作授权。",
      "concise": "可减少重复灯光背景，但“只调暗”、海报的“全部关灯”并非我的指令，以及轻度恼火必须保留。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-12",
    "topicId": "HELD-R10",
    "category": "FALSE_MERGE",
    "outputText": "控制温度后，两组实验已经证明浸水导致发芽更快。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R10-E001",
        "literal": "种子浸水后发芽更快，但这里只有两组观察。"
      },
      {
        "entryId": "HELD-R10-E002",
        "literal": "我不能排除温度差异，所以还不能确认是浸水导致。"
      },
      {
        "entryId": "HELD-R10-E003",
        "literal": "下次打算同时控制温度，这个计划尚未执行。"
      }
    ],
    "reason": "只有两组观察，温度差异未排除，不能确认浸水因果；控制温度还是未执行的下次计划。把计划当已做的实验，会连同因果确定性一起伪造。 待独立核实的未知仍为UNRESOLVED：浸水是否因果促发芽；温差影响大小；下一次结果。",
    "perStyle": {
      "original": "保留两组观察、不能排除温差/未确认因果和未执行计划三条原句。",
      "balanced": "可合并观察与限制，但用观察而非证明，控制温度仍为下次未执行计划。",
      "concise": "可减少叙述连接词，样本小、混杂未排除、因果未定和未来计划不可省。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-13",
    "topicId": "HELD-R11",
    "category": "SUBJECT_MISMATCH",
    "outputText": "我有四位家庭成员，草稿用四个独立人物图案逐一代表他们。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R11-E001",
        "literal": "我把标签写成 café ☕；组合音标不是另一个字。"
      },
      {
        "entryId": "HELD-R11-E002",
        "literal": "草稿用的是“家人👨‍👩‍👧‍👦”，不要把一个家庭图案拆成四个独立人。"
      },
      {
        "entryId": "HELD-R11-E003",
        "literal": "这里只在比较文字标注，不代表我有四位家庭成员。"
      }
    ],
    "reason": "家庭emoji是一个图案，不是四个独立人；文本明确说只是标注比较、不代表四位家庭成员。看见数字与家庭符号不能推出私人家庭事实。 待独立核实的未知仍为UNRESOLVED：作者家庭成员人数、对应人物身份与日期。",
    "perStyle": {
      "original": "保留café的组合音标、完整ZWJ家庭图案和不是家庭人数证据的原句；不能正规化后宣称仍是原字节。",
      "balanced": "可修顺文字解释但必须保留符号完整及非作者家庭事实的限定。",
      "concise": "可压缩标注讨论，不能把图形表示的概念数变成作者家人的数量。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-14",
    "topicId": "HELD-R12",
    "category": "FALSE_MERGE",
    "outputText": "我把两个码头项目合成同一章，测绘项目已有三幅照片作为成果。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R12-E001",
        "literal": "我把旧码头摄影和新码头测绘放在两个独立章节。"
      },
      {
        "entryId": "HELD-R12-E002",
        "literal": "二者都提到“码头”，我仍明确要求分别保留。"
      },
      {
        "entryId": "HELD-R12-E003",
        "literal": "摄影章节的三幅图片不是测绘项目的三份成果。"
      }
    ],
    "reason": "原文明确独立章节、分别保留；摄影的三幅图片不是测绘的三份成果。同词与同数字不证明项目相同，也不授权合章或迁移成果。 待独立核实的未知仍为UNRESOLVED：S1/S2与“摄影章节/测绘项目”名称的完整映射；测绘是否已有三份成果。",
    "perStyle": {
      "original": "尊重实际S1/S2绑定与原文分别保留要求，不把第三条挪到推断出的章节。",
      "balanced": "可在同一允许范围内修整措辞，但不得跨人类章节边界改成员或把摄影/测绘混为一项目。",
      "concise": "可用更短的分别保留说明，仍必须保留两项目独立及图片/测绘成果不等同。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-15",
    "topicId": "HELD-R02",
    "category": "TIME_MISPLACED",
    "outputText": "我一直认为速读适合所有书，包括诗歌。",
    "style": "balanced",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R02-E001",
        "literal": "去年我觉得速读适合所有书，现在这个说法我不认同了。"
      },
      {
        "entryId": "HELD-R02-E002",
        "literal": "说明书可以扫读；诗歌我愿意慢慢读，这不是效率的问题。"
      }
    ],
    "reason": "过去对所有书的看法已经被当前明确否定；说明书可扫读，诗歌愿慢读且不是效率问题。不得把历史立场写为恒常信念或从个别类型外推所有书。",
    "perStyle": {
      "original": "保留去年/现在转变以及说明书与诗歌的两条原句。",
      "balanced": "可衔接转变和分类型读法，不能把当前否定消去或把偏好诊断成效率不足。",
      "concise": "可提炼为“已不认同所有书都适合速读；说明书可扫读、诗歌愿慢读，非效率问题”，保留转变。"
    },
    "verdict": "REJECT"
  },
  {
    "caseId": "ADV-16",
    "topicId": "HELD-R03",
    "category": "UNKNOWN_TIME_INVENTED",
    "outputText": "2026年2月3日我数到十二只纸船，其中两只是2月2日留下的。",
    "style": "concise",
    "evidenceQuotes": [
      {
        "entryId": "HELD-R03-E001",
        "literal": "我数到十二只纸船，其中两只是昨天留下的。"
      }
    ],
    "reason": "这一条的time.kind明确为unknown、iso为null，正文只有相对“昨天”，没有任何可把今天锚定到2026年2月3日的证据。引用中的十二和两均真实，仍不能补绝对日期；Entry/Topic编号也不是日期来源。实际绝对日期继续UNRESOLVED。",
    "perStyle": {
      "original": "原句中的“昨天”保持原样；时间展示仅能明确未记录，不能根据编号填入年月日。",
      "balanced": "可以修顺数到十二只、其中两只是昨天留下的关系，保持相对时间及时间未记录状态。",
      "concise": "可以压缩共同的计数背景，但“昨天”不能换成具体年月日，未知时间不得被摘要消除。"
    },
    "verdict": "REJECT"
  }
];
