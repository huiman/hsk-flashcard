/**
 * HSK Flashcard - Tutor & Study Groups Data Engine
 * Contains radical dictionaries, phonetic components, semantic taxonomy,
 * confusable words pairs, and pedagogical memory hooks.
 */

window.HSK_TUTOR_DATA = (function() {
  'use strict';

  // 1. Common Chinese Radicals with linguistic meanings & Thai descriptions
  const RADICALS = {
    '氵': { name: '三点水 (氵)', meaningTh: 'น้ำ / ของเหลว', meaningEn: 'Water, liquid, flow', hook: 'คำที่มี 氵 มักเกี่ยวข้องกับน้ำ แม่น้ำ ทะเล ของเหลว หรือการไหล' },
    '亻': { name: '单人旁 (亻)', meaningTh: 'คน / มนุษย์', meaningEn: 'Person, human relations', hook: 'คำที่มี 亻 มักเกี่ยวกับคน การกระทำของมนุษย์ หรือความสัมพันธ์ระหว่างบุคคล' },
    '扌': { name: '提手旁 (扌)', meaningTh: 'มือ / การใช้มือ', meaningEn: 'Hand, manual action', hook: 'คำที่มี 扌 มักแสดงการใช้มือหยิบ จับ ตี ผลัก หรือทำสิ่งต่างๆ' },
    '口': { name: '口字旁 (口)', meaningTh: 'ปาก / การพูด / เสียง', meaningEn: 'Mouth, speech, eating', hook: 'คำที่มี 口 เกี่ยวข้องกับการใช้ปาก เช่น กิน ดื่ม ร้อง เรียก หรือคำอุทาน' },
    '木': { name: '木字旁 (木)', meaningTh: 'ต้นไม้ / ไม้', meaningEn: 'Tree, wood, plant', hook: 'คำที่มี 木 เกี่ยวกับพรรณไม้ ป่า เฟอร์นิเจอร์ หรือสิ่งของที่ทำจากไม้' },
    '讠': { name: '言字旁 (讠)', meaningTh: 'คำพูด / ภาษา', meaningEn: 'Speech, language, words', hook: 'คำที่มี 讠 เกี่ยวข้องกับคำพูด การสื่อสาร ภาษา การอ่าน หรือความรู้' },
    '艹': { name: '草字头 (艹)', meaningTh: 'หญ้า / พืช / สมุนไพร', meaningEn: 'Grass, plant, herbal', hook: 'คำที่มี 艹 มักเป็นชื่อผัก ผลไม้ ดอกไม้ ชา หรือยาสมุนไพร' },
    '饣': { name: '食字旁 (饣)', meaningTh: 'อาหาร / การกิน', meaningEn: 'Food, eating, meals', hook: 'คำที่มี 饣 มักเกี่ยวกับอาหาร ข้าว การอิ่ม หรือร้านอาหาร' },
    '纟': { name: '绞丝旁 (纟)', meaningTh: 'เส้นไหม / ผ้า / การเชื่อมโยง', meaningEn: 'Silk, thread, textile', hook: 'คำที่มี 纟 สื่อถึงเส้นใย ผ้า การผูกมัด ต่อเนื่อง หรือสีสัน' },
    '日': { name: '日字旁 (日)', meaningTh: 'ดวงอาทิตย์ / วัน / เวลา', meaningEn: 'Sun, day, time, light', hook: 'คำที่มี 日 เกี่ยวกับแสงแดด เวลา วัน คืน หรือความสว่าง' },
    '月': { name: '月字旁 / 肉月旁 (月)', meaningTh: 'อวัยวะร่างกาย / พระจันทร์', meaningEn: 'Body flesh, moon, organ', hook: 'คำที่มี 月 มักหมายถึงอวัยวะส่วนต่างๆ ของร่างกาย เช่น ใบหน้า ท้อง ขา แขน' },
    '宀': { name: '宝盖头 (宀)', meaningTh: 'หลังคา / บ้าน / ที่พัก', meaningEn: 'Roof, house, shelter', hook: 'คำที่มี 宀 สื่อถึงบ้าน อาคาร ความปลอดภัย หรือห้องพัก' },
    '忄': { name: '竖心旁 (忄/心)', meaningTh: 'หัวใจ / ความรู้สึก', meaningEn: 'Heart, feelings, emotion', hook: 'คำที่มี 忄 หรือ 心 เกี่ยวข้องกับอารมณ์ จิตใจ ความคิด ความรู้สึก' },
    '心': { name: '心字底 (心)', meaningTh: 'หัวใจ / จิตใจ', meaningEn: 'Heart, mind, thoughts', hook: 'คำที่มี 心 อยู่ด้านล่างมักสื่อถึงความคิด อารมณ์ หรือความปรารถนา' },
    '火': { name: '火字旁 / 四点底 (火/灬)', meaningTh: 'ไฟ / ความร้อน', meaningEn: 'Fire, heat, cooking', hook: 'คำที่มี 火 หรือ 灬 เกี่ยวข้องกับไฟ ความร้อน การทำอาหาร หรือความร้อนแรง' },
    '灬': { name: '四点底 (灬)', meaningTh: 'ไฟ / การปรุงอาหาร', meaningEn: 'Fire underneath, cooking', hook: 'จุดสี่จุดใต้ตัวอักษรคือรูปแปลงของ "ไฟ" ใช้กับการต้ม นึ่ง หรือความร้อน' },
    '辶': { name: '走之底 (辶)', meaningTh: 'การเดิน / การเดินทาง', meaningEn: 'Walking, movement, distance', hook: 'คำที่มี 辶 มักสื่อถึงการก้าวเดิน การเคลื่อนที่ ระยะทาง หรือการพบเจอ' },
    '目': { name: '目字旁 (目)', meaningTh: 'ดวงตา / การมองเห็น', meaningEn: 'Eye, vision, sight', hook: 'คำที่มี 目 มักเกี่ยวกับการใช้สายตามอง จ้อง ตรวจดู หรือการนอนหลับ' },
    '钅': { name: '金字旁 (钅)', meaningTh: 'โลหะ / เงินตรา / เครื่องมือ', meaningEn: 'Metal, money, coin, tools', hook: 'คำที่มี 钅 มักเกี่ยวกับสิ่งของที่เป็นโลหะ เหล็ก เงิน หรือของมีคม' },
    '土': { name: '土字旁 (土)', meaningTh: 'ดิน / ผืนดิน / สถานที่', meaningEn: 'Earth, ground, soil, place', hook: 'คำที่มี 土 สื่อถึงพื้นดิน สนาม กำแพง หรือสถานที่' },
    '女': { name: '女字旁 (女)', meaningTh: 'ผู้หญิง / เพศหญิง', meaningEn: 'Female, woman', hook: 'คำที่มี 女 มักเกี่ยวกับผู้หญิง แม่ พี่สาวน้องสาว หรือคำคุณศัพท์บางคำ' },
    '犭': { name: '反犬旁 (犭)', meaningTh: 'สัตว์เลี้ยงลูกด้วยนม', meaningEn: 'Animal, beast, mammalian', hook: 'คำที่มี 犭 มักเป็นชื่อสัตว์ เช่น สุนัข แมว หมู ลิง หมาป่า' },
    '疒': { name: '病字旁 (疒)', meaningTh: 'ความเจ็บป่วย / โรคภัย', meaningEn: 'Sickness, illness, disease', hook: 'คำที่มี 疒 สื่อถึงอาการปวด ไข้ โรคภัย หรือความเมื่อยล้า' },
    '虫': { name: '虫字旁 (虫)', meaningTh: 'แมลง / สัตว์เลื้อยคลาน', meaningEn: 'Insect, bug, reptile', hook: 'คำที่มี 虫 เกี่ยวกับแมลง ผึ้ง ยุง หรือสัตว์ตัวเล็กๆ' },
    '衤': { name: '衣字旁 (衤)', meaningTh: 'เสื้อผ้า / เครื่องแต่งกาย', meaningEn: 'Clothing, garments', hook: 'คำที่มี 衤 (มี 2 จุดบน) เกี่ยวกับเสื้อเชิ้ต กางเกง กระโปรง หรือผ้าห่ม' },
    '礻': { name: '示字旁 (礻)', meaningTh: 'สิ่งศักดิ์สิทธิ์ / พร / ศาสนา', meaningEn: 'Ritual, blessing, worship', hook: 'คำที่มี 礻 (มี 1 จุดบน) เกี่ยวกับพิธีกรรม ความโชคดี พร หรือบรรพบุรุษ' },
    '贝': { name: '贝字旁 (贝)', meaningTh: 'เปลือกหอย / ทรัพย์สิน / เงิน', meaningEn: 'Shell, money, wealth', hook: 'ในอดีตใช้เปลือกหอยแทนเงิน คำที่มี 贝 จึงมักเกี่ยวกับเงิน ความร่ำรวย ราคา ซื้อขาย' },
    '广': { name: '广字旁 (广)', meaningTh: 'อาคารกว้าง / โรงเรือน', meaningEn: 'Shelter, wide building', hook: 'คำที่มี 广 สื่อถึงอาคารขนาดใหญ่ ร้านค้า โรงเก็บ หรือห้องโถง' },
    '门': { name: '门字框 (门)', meaningTh: 'ประตู / ทางเข้า', meaningEn: 'Door, gate, entrance', hook: 'คำที่มี 门 มักเกี่ยวกับทางเข้า การปิด เปิด ถาม หรือช่องว่างระหว่างประตู' },
    '走': { name: '走字旁 (走)', meaningTh: 'การวิ่ง / การเดิน', meaningEn: 'Walking, running, hurrying', hook: 'คำที่มี 走 สื่อถึงการออกวิ่ง การเร่งรีบ หรือการก้าวหน้า' },
    '穴': { name: '穴宝盖 (穴)', meaningTh: 'ถ้ำ / ช่อง / รู', meaningEn: 'Cave, hole, cavity', hook: 'คำที่มี 穴 เกี่ยวกับที่ว่าง ช่องว่าง รู ถ้ำ หรือความว่างเปล่า' },
    '竹': { name: '竹字头 (⺮/竹)', meaningTh: 'ไม้ไผ่ / เครื่องเขียน', meaningEn: 'Bamboo, writing instruments', hook: 'คำที่มี ⺮ มักเป็นสิ่งของที่ทำจากไม้ไผ่ เช่น พู่กัน ตะกร้า ตะเกียบ สมุด' },
    '禾': { name: '禾木旁 (禾)', meaningTh: 'รวงข้าว / ธัญพืช', meaningEn: 'Grain, cereal, crops', hook: 'คำที่มี 禾 เกี่ยวกับการเพาะปลูก เมล็ดพืช ฤดูเก็บเกี่ยว หรือภาษี' },
    '车': { name: '车字旁 (车)', meaningTh: 'ยานพาหนะ / ล้อรถ', meaningEn: 'Vehicle, car, transport', hook: 'คำที่มี 车 สื่อถึงยานพาหนะ การขนส่ง ล้อ หรือการหมุน' },
    '足': { name: '足字旁 (⻊/足)', meaningTh: 'เท้า / การเตะ / การวิ่ง', meaningEn: 'Foot, leg, kicking, stepping', hook: 'คำที่มี ⻊ เกี่ยวกับการใช้เท้า เช่น วิ่ง กระโดด เตะ ก้าวเดิน' }
  };

  // 2. Character-to-Radical Direct Overrides & Detection Patterns
  const CHAR_RADICAL_MAP = {
    // 氵 (Water)
    '海': '氵', '河': '氵', '江': '氵', '湖': '氵', '洗': '氵', '渴': '氵', '汉': '氵', '流': '氵',
    '深': '氵', '清': '氵', '满': '氵', '游': '氵', '酒': '氵', '消': '氵', '活': '氵', '汗': '氵',
    '法': '氵', '洋': '氵', '温': '氵', '湿': '氵', '浪': '氵', '浮': '氵', '滴': '氵', '渐': '氵',
    '滑': '氵', '测': '氵', '济': '氵', '渔': '氵', '波': '氵', '注': '氵', '淡': '氵', '泪': '氵',
    '池': '氵', '汤': '氵', '污': '氵', '演': '氵', '洁': '氵', '涉': '氵', '液': '氵', '潮': '氵',

    // 亻 / 人 (Person)
    '他': '亻', '你': '亻', '们': '亻', '休': '亻', '会': '亻', '便': '亻', '借': '亻', '件': '亻',
    '住': '亻', '传': '亻', '作': '亻', '做': '亻', '低': '亻', '保': '亻', '倍': '亻', '像': '亻',
    '倒': '亻', '值': '亻', '假': '亻', '停': '亻', '代': '亻', '任': '亻', '份': '亻', '伙': '亻',
    '佩': '亻', '例': '亻', '供': '亻', '依': '亻', '偶': '亻', '候': '亻', '使': '亻', '优': '亻',

    // 扌 (Hand)
    '打': '扌', '找': '扌', '拿': '扌', '抱': '扌', '指': '扌', '提': '扌', '推': '扌', '接': '扌',
    '护': '扌', '排': '扌', '拉': '扌', '挂': '扌', '掉': '扌', '挑': '扌', '播': '扌', '抄': '扌',
    '拍': '扌', '拔': '扌', '持': '扌', '按': '扌', '握': '扌', '择': '扌', '抓': '扌', '搞': '扌',
    '换': '扌', '扔': '扌', '抽': '扌', '拾': '扌', '拼': '扌', '抬': '扌', '抗': '扌', '挡': '扌',

    // 口 (Mouth / Voice)
    '吃': '口', '喝': '口', '叫': '口', '听': '口', '问': '口', '唱': '口', '喊': '口', '嘴': '口',
    '喂': '口', '吧': '口', '吗': '口', '呢': '口', '呀': '口', '哈': '口', '响': '口', '告': '口',
    '品': '口', '器': '口', '呼': '口', '吸': '口', '味': '口', '鸣': '口', '咳': '口', '嗽': '口',

    // 木 (Tree / Wood)
    '林': '木', '森': '木', '机': '木', '杯': '木', '树': '木', '校': '木', '桌': '木', '样': '木',
    '根': '木', '李': '木', '桥': '木', '查': '木', '极': '木', '枝': '木', '棒': '木', '植': '木',
    '板': '木', '条': '木', '检': '木', '架': '木', '格': '木', '楼': '木', '楚': '木', '概': '木',

    // 讠 (Speech)
    '说': '讠', '话': '讠', '语': '讠', '读': '讠', '请': '讠', '认': '讠', '识': '讠', '谢': '讠',
    '讲': '讠', '谁': '讠', '课': '讠', '谈': '讠', '诉': '讠', '记': '讠', '论': '讠', '试': '讠',
    '许': '讠', '设': '讠', '计': '讠', '词': '讠', '调': '讠', '译': '讠', '诚': '讠', '谎': '讠',

    // 艹 (Grass / Plant)
    '茶': '艹', '药': '艹', '菜': '艹', '花': '艹', '苹': '艹', '蓝': '艹', '艺': '艹', '苦': '艹',
    '英': '艹', '节': '艹', '著': '艹', '草': '艹', '落': '艹', '获': '艹', '莫': '艹', '薄': '艹',

    // 饣 (Food)
    '饭': '饣', '饱': '饣', '馆': '饣', '饮': '饣', '饺': '饣', '饼': '饣', '馋': '饣', '饿': '饣',
    '饲': '饣', '饰': '饣', '饶': '饣',

    // 纟 (Silk / Thread)
    '给': '纟', '红': '纟', '绿': '纟', '练': '纟', '绍': '纟', '经': '纟', '细': '纟', '终': '纟',
    '组': '纟', '线': '纟', '结': '纟', '级': '纟', '纸': '纟', '绝': '纟', '统': '纟', '续': '纟',

    // 日 (Sun / Time)
    '明': '日', '早': '日', '昨': '日', '晚': '日', '时': '日', '星': '日', '晨': '日', '暑': '日',
    '景': '日', '暗': '日', '晴': '日', '暖': '日', '暴': '日', '普': '日', '映': '日',

    // 月 (Body / Flesh)
    '脑': '月', '肚': '月', '脸': '月', '胖': '月', '腿': '月', '胃': '月', '肥': '月', '脚': '月',
    '胸': '月', '腰': '月', '服': '月', '股': '月', '肌': '月', '胆': '月', '脏': '月', '腑': '月',

    // 宀 (Roof / Home)
    '家': '宀', '安': '宀', '定': '宀', '客': '宀', '室': '宀', '宿': '宀', '完': '宀', '官': '宀',
    '实': '宀', '审': '宀', '害': '宀', '富': '宀', '宽': '宀', '密': '宀', '察': '宀', '宝': '宀',

    // 心 / 忄 (Heart / Feeling)
    '想': '心', '念': '心', '忘': '心', '意': '心', '总': '心', '感': '心', '急': '心', '愿': '心',
    '快': '忄', '慢': '忄', '怕': '忄', '懂': '忄', '怪': '忄', '忙': '忄', '情': '忄', '恨': '忄',
    '恼': '忄', '忆': '忄', '悟': '忄', '愧': '忄', '慎': '忄', '慌': '忄',

    // 火 / 灬 (Fire / Heat)
    '热': '灬', '点': '灬', '黑': '灬', '照': '灬', '烈': '灬', '煮': '灬', '熊': '灬',
    '烧': '火', '烟': '火', '炒': '火', '烤': '火', '灯': '火', '灰': '火', '炉': '火', '烦': '火',

    // 辶 (Movement / Travel)
    '这': '辶', '边': '辶', '进': '辶', '远': '辶', '近': '辶', '迎': '辶', '迟': '辶', '遇': '辶',
    '过': '辶', '送': '辶', '道': '辶', '达': '辶', '运': '辶', '返': '辶', '连': '辶', '速': '辶',
    '选': '辶', '追': '辶', '退': '辶', '逃': '辶', '途': '辶', '适': '辶', '递': '辶',

    // 目 (Eye)
    '看': '目', '眼': '目', '睛': '目', '睡': '目', '盼': '目', '盯': '目', '省': '目', '盲': '目',
    '盾': '目', '睬': '目', '瞄': '目',

    // 钅 (Metal)
    '钱': '钅', '错': '钅', '银': '钅', '钟': '钅', '铁': '钅', '铜': '钅', '钢': '钅', '针': '钅',
    '销': '钅', '锁': '钅', '镜': '钅', '锤': '钅', '锦': '钅', '链': '钅',

    // 女 (Female)
    '妈': '女', '姐': '女', '妹': '女', '姑': '女', '娘': '女', '妻': '女', '她': '女', '奶': '女',
    '好': '女', '妙': '女', '始': '女', '婚': '女', '妨': '女', '婆': '女', '如': '女',

    // 犭 (Animal)
    '狗': '犭', '猫': '犭', '猪': '犭', '狼': '犭', '狐': '犭', '狸': '犭', '猴': '犭', '狮': '犭',
    '犯': '犭', '狂': '犭', '狠': '犭', '独': '犭', '猛': '犭', '猜': '犭', '猎': '犭',

    // 疒 (Sickness)
    '病': '疒', '痛': '疒', '疼': '疒', '瘦': '疒', '疯': '疒', '痒': '疒', '疲': '疒', '症': '疒',
    '疾': '疒', '疗': '疒', '疤': '疒', '瘫': '疒',

    // 贝 (Money / Trade)
    '贵': '贝', '费': '贝', '贸': '贝', '资': '贝', '财': '贝', '购': '贝', '贷': '贝', '赔': '贝',
    '负': '贝', '贫': '贝', '赚': '贝', '赞': '贝', '赠': '贝', '赋': '贝',

    // ⻊ (Foot)
    '跑': '足', '跳': '足', '踢': '足', '踏': '足', '距': '足', '路': '足', '跌': '足', '跟': '足',
    '跨': '足', '踩': '足', '践': '足'
  };

  // 3. Shared Phonetic Component Families
  const PHONETIC_FAMILIES = [
    {
      root: '青',
      pinyin: 'qīng',
      title: 'กลุ่มเสียง "青" (qīng)',
      desc: 'ตัวอักษรที่ใช้ 青 เป็นตัวสะกดเสียง สื่อถึงความเขียว บริสุทธิ์ หรือมีสระ -ing / -eng คล้ายกัน',
      chars: ['清', '请', '晴', '情', '睛', '静', '精', '猜', '靖']
    },
    {
      root: '巴',
      pinyin: 'bā',
      title: 'กลุ่มเสียง "巴" (bā)',
      desc: 'ตัวอักษรที่ลงท้ายด้วยเสียงสระ -a / -o เช่น bā, bà, pá',
      chars: ['把', '爸', '吧', '爬', '芭', '疤', '靶']
    },
    {
      root: '包',
      pinyin: 'bāo',
      title: 'กลุ่มเสียง "包" (bāo)',
      desc: 'ตัวอักษรที่ออกเสียงสระ -ao เช่น bāo, pǎo, bǎo, bào',
      chars: ['抱', '饱', '跑', '泡', '胞', '炮', '雹', '袍']
    },
    {
      root: '方',
      pinyin: 'fāng',
      title: 'กลุ่มเสียง "方" (fāng)',
      desc: 'ตัวอักษรที่ลงท้ายด้วยเสียง -ang เช่น fàng, fáng, fǎng',
      chars: ['放', '房', '防', '仿', '访', '芳', '纺']
    },
    {
      root: '亡 / 芒',
      pinyin: 'wáng / máng',
      title: 'กลุ่มเสียง "亡 / 芒" (ang)',
      desc: 'ตัวอักษรที่เกี่ยวข้องกับความสูญหาย หรือออกเสียง máng, wàng',
      chars: ['忙', '盲', '忘', '茫', '芒', '妄']
    },
    {
      root: '马',
      pinyin: 'mǎ',
      title: 'กลุ่มเสียง "马" (mǎ)',
      desc: 'ตัวอักษรที่ลงท้ายด้วยเสียง ma เช่น mā, má, mǎ, mà, ma',
      chars: ['妈', '吗', '骂', '码', '蚂', '玛']
    },
    {
      root: '艮',
      pinyin: 'gèn',
      title: 'กลุ่มเสียง "艮" (en/in)',
      desc: 'ตัวอักษรที่ออกเสียงสระ -en / -in เช่น hěn, gēn, yín, yǎn',
      chars: ['很', '跟', '银', '根', '眼', '狠', '恨', '艰']
    },
    {
      root: '寺',
      pinyin: 'sì',
      title: 'กลุ่มเสียง "寺" (i/e)',
      desc: 'ตัวอักษรที่ออกเสียง sì, děng, tè, chí, dài, shī',
      chars: ['等', '特', '持', '待', '诗', '侍', '痔']
    },
    {
      root: '分',
      pinyin: 'fēn',
      title: 'กลุ่มเสียง "分" (en/an)',
      desc: 'ตัวอักษรที่ออกเสียง fēn, fèn, fěn, pàn',
      chars: ['份', '粉', '盼', '吩', '芬', '盆']
    },
    {
      root: '可',
      pinyin: 'kě',
      title: 'กลุ่มเสียง "可" (e/o)',
      desc: 'ตัวอักษรที่ออกเสียง kě, gē, hé',
      chars: ['哥', '歌', '河', '何', '苛', '荷', '柯']
    },
    {
      root: '占',
      pinyin: 'zhàn',
      title: 'กลุ่มเสียง "占" (an/ian)',
      desc: 'ตัวอักษรที่ออกเสียง zhàn, diǎn, diàn, tiē',
      chars: ['点', '店', '站', '贴', '战', '粘']
    }
  ];

  // 4. Semantic Categories Taxonomy with comprehensive keywords (Thai & English)
  const SEMANTIC_CATEGORIES = [
    {
      id: 'food',
      name: 'อาหารและเครื่องดื่ม (Food & Dining)',
      icon: '🍜',
      desc: 'คำศัพท์เกี่ยวกับอาหาร เครื่องดื่ม การทำอาหาร ผลไม้ ผัก รสชาติ และร้านอาหาร',
      hook: 'คำศัพท์กลุ่มนี้เชื่อมโยงกับการดำรงชีวิต ความอร่อย การรับประทาน และวัฒนธรรมการกินของจีน',
      keywords: ['กิน', 'ดื่ม', 'อาหาร', 'ข้าว', 'น้ำ', 'ชา', 'กาแฟ', 'ผัก', 'ผลไม้', 'เนื้อ', 'ปลา', 'ไก่', 'หมู', 'ไข่', 'หวาน', 'เปรี้ยว', 'เผ็ด', 'เค็ม', 'ขม', 'อร่อย', 'ทำอาหาร', 'ต้ม', 'ทอด', 'ผัด', 'หิว', 'อิ่ม', 'ร้านอาหาร', 'จาน', 'ช้อน', 'ตะเกียบ', 'food', 'drink', 'eat', 'tea', 'coffee', 'meal', 'dish', 'fruit', 'vegetable', 'cook', 'hungry', 'sweet', 'sour', 'spicy']
    },
    {
      id: 'emotion',
      name: 'อารมณ์และความรู้สึก (Emotions & Psychology)',
      icon: '💖',
      desc: 'คำศัพท์เกี่ยวกับความรู้สึก อารมณ์ จิตใจ ความสุข ความโศกเศร้า และความกังวล',
      hook: 'คำศัพท์กลุ่มนี้มักมีรากอักษร 心 (หัวใจ) หรือ 忄 บ่งบอกถึงภาวะจิตใจและความรู้สึกภายใน',
      keywords: ['ดีใจ', 'เสียใจ', 'โกรธ', 'รัก', 'ชอบ', 'เกลียด', 'กลัว', 'กังวล', 'ตื่นเต้น', 'เหงา', 'คิดถึง', 'สงสัย', 'พอใจ', 'ผิดหวัง', 'อารมณ์', 'จิตใจ', 'ความสุข', 'สบายใจ', 'เหนื่อย', 'เบื่อ', 'เกรงใจ', 'love', 'happy', 'sad', 'angry', 'afraid', 'fear', 'worry', 'excited', 'lonely', 'miss', 'feeling', 'emotion', 'mood']
    },
    {
      id: 'nature',
      name: 'ธรรมชาติและสภาพอากาศ (Nature & Weather)',
      icon: '⛅',
      desc: 'คำศัพท์เกี่ยวกับท้องฟ้า ฤดูกาล แดด ลม ฝน หิมะ แม่น้ำ ภูเขา และสิ่งแวดล้อม',
      hook: 'คำศัพท์กลุ่มนี้สะท้อนปรากฏการณ์ธรรมชาติ มักมีรากอักษร 日 (แดด/เวลา), 氵 (น้ำ) หรือ 雨 (ฝน)',
      keywords: ['แดด', 'ฝน', 'หิมะ', 'ลม', 'เมฆ', 'หนาว', 'ร้อน', 'อบอุ่น', 'ฤดู', 'ฟ้า', 'อากาศ', 'ภูเขา', 'แม่น้ำ', 'ทะเล', 'ต้นไม้', 'ดอกไม้', 'ธรรมชาติ', 'ดวงอาทิตย์', 'พระจันทร์', 'ดาว', 'rain', 'snow', 'wind', 'sun', 'cloud', 'cold', 'hot', 'warm', 'season', 'weather', 'mountain', 'river', 'sea', 'nature']
    },
    {
      id: 'body',
      name: 'ร่างกายและสุขภาพ (Body & Health)',
      icon: '🩺',
      desc: 'คำศัพท์เกี่ยวกับอวัยวะร่างกาย โรคภัย ความเจ็บป่วย การรักษา ยา และโรงพยาบาล',
      hook: 'คำศัพท์หมวดนี้มักประกอบด้วยรากอักษร 月 (เนื้อ/อวัยวะ) หรือ 疒 (โรคภัยความเจ็บป่วย)',
      keywords: ['ตา', 'หู', 'จมูก', 'ปาก', 'ฟัน', 'มือ', 'เท้า', 'ขา', 'ศีรษะ', 'หัว', 'ผม', 'หน้า', 'ท้อง', 'หัวใจ', 'ป่วย', 'ไข้', 'เจ็บ', 'ปวด', 'ยา', 'หมอ', 'พยาบาล', 'โรงพยาบาล', 'รักษา', 'สุขภาพ', 'eye', 'ear', 'nose', 'mouth', 'hand', 'foot', 'leg', 'head', 'face', 'sick', 'illness', 'hospital', 'doctor', 'medicine', 'health', 'pain']
    },
    {
      id: 'family_people',
      name: 'บุคคล ครอบครัว และสังคม (People & Family)',
      icon: '👨‍👩‍👧',
      desc: 'คำศัพท์เกี่ยวกับสมาชิกในครอบครัว เพื่อน คนรู้จัก อาชีพ และบทบาททางสังคม',
      hook: 'คำศัพท์กลุ่มนี้เชื่อมโยงความสัมพันธ์ของมนุษย์ มักมีรากอักษร 亻 (คน) หรือ 女 (ผู้หญิง)',
      keywords: ['พ่อ', 'แม่', 'ลูก', 'พี่', 'น้อง', 'ปู่', 'ย่า', 'ตา', 'ยาย', 'เพื่อน', 'ครู', 'นักเรียน', 'คน', 'ผู้ชาย', 'ผู้หญิง', 'เด็ก', 'ผู้ใหญ่', 'แขก', 'ครอบครัว', 'father', 'mother', 'brother', 'sister', 'family', 'friend', 'teacher', 'student', 'person', 'child', 'boy', 'girl', 'guest']
    },
    {
      id: 'work_business',
      name: 'การทำงานและธุรกิจ (Work & Business)',
      icon: '💼',
      desc: 'คำศัพท์เกี่ยวกับการทำงาน บริษัท การประชุม อาชีพ เงินทอง เศรษฐกิจ และการค้าขาย',
      hook: 'คำศัพท์กลุ่มนี้เกี่ยวข้องกับการทำงานสร้างรายได้ มักมีรากอักษร 贝 (เงินตรา) หรือ 亻 (คน/แรงงาน)',
      keywords: ['ทำงาน', 'บริษัท', 'เจ้านาย', 'หัวหน้า', 'เพื่อนร่วมงาน', 'ประชุม', 'เงิน', 'ราคา', 'ซื้อ', 'ขาย', 'สัญญา', 'ธุรกิจ', 'การค้า', 'ธนาคาร', 'รวย', 'จน', 'แพง', 'ถูก', 'เงินเดือน', 'work', 'job', 'company', 'boss', 'meeting', 'money', 'price', 'buy', 'sell', 'business', 'bank', 'salary', 'economic']
    },
    {
      id: 'travel_places',
      name: 'การเดินทางและสถานที่ (Travel & Places)',
      icon: '✈️',
      desc: 'คำศัพท์เกี่ยวกับยานพาหนะ การเดินทาง สนามบิน สถานีรถไฟ ท่องเที่ยว โรงแรม และทิศทาง',
      hook: 'คำศัพท์กลุ่มนี้มักมีรากอักษร 辶 (การก้าวเดิน) หรือ 车 (รถ/ล้อ) แสดงถึงการเดินทาง',
      keywords: ['ไป', 'มา', 'เดิน', 'ขับรถ', 'รถ', 'รถไฟ', 'เครื่องบิน', 'เรือ', 'สนามบิน', 'สถานี', 'ตั๋ว', 'โรงแรม', 'ท่องเที่ยว', 'เที่ยว', 'ทิศ', 'ซ้าย', 'ขวา', 'เหนือ', 'ใต้', 'ถนน', 'ทาง', 'travel', 'car', 'bus', 'train', 'plane', 'airport', 'station', 'ticket', 'hotel', 'road', 'trip']
    },
    {
      id: 'education_study',
      name: 'การศึกษาและการเรียนรู้ (Education & Learning)',
      icon: '🎓',
      desc: 'คำศัพท์เกี่ยวกับโรงเรียน มหาวิทยาลัย การเรียน การสอน หนังสือ ปากกา ภาษา และข้อสอบ',
      hook: 'คำศัพท์กลุ่มนี้มักมีรากอักษร 讠 (คำพูด/ภาษา) หรือ ⺮ (ไม้ไผ่/เครื่องเขียน) บ่งบอกถึงปัญญาและการศึกษา',
      keywords: ['เรียน', 'สอบ', 'หนังสือ', 'การบ้าน', 'ห้องเรียน', 'มหาวิทยาลัย', 'โรงเรียน', 'ภาษา', 'อักษร', 'คำศัพท์', 'อ่าน', 'เขียน', 'สมุด', 'ปากกา', 'วิชา', 'ความรู้', 'study', 'learn', 'exam', 'book', 'homework', 'class', 'school', 'university', 'language', 'read', 'write', 'knowledge']
    },
    {
      id: 'time_calendar',
      name: 'เวลาและปฏิทิน (Time & Calendar)',
      icon: '⏰',
      desc: 'คำศัพท์เกี่ยวกับช่วงเวลา วันที่ สัปดาห์ เดือน ปี เช้า เที่ยง เย็น อดีต ปัจจุบัน และอนาคต',
      hook: 'คำศัพท์กลุ่มนี้มักมีรากอักษร 日 (ดวงอาทิตย์) หรือ 月 (ดวงจันทร์) แสดงการโคจรของกาลเวลา',
      keywords: ['เวลา', 'นาฬิกา', 'ชั่วโมง', 'นาที', 'วัน', 'เดือน', 'ปี', 'สัปดาห์', 'วันนี้', 'พรุ่งนี้', 'เมื่อวาน', 'เช้า', 'เที่ยง', 'บ่าย', 'เย็น', 'กลางคืน', 'ตอน', 'ก่อน', 'หลัง', 'ช้า', 'เร็ว', 'time', 'clock', 'hour', 'minute', 'day', 'month', 'year', 'week', 'today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'night']
    },
    {
      id: 'daily_household',
      name: 'ชีวิตประจำวันและของใช้ (Daily Life & Home)',
      icon: '🏠',
      desc: 'คำศัพท์เกี่ยวกับบ้าน เฟอร์นิเจอร์ เสื้อผ้า กิจวัตรประจำวัน การนอน การอาบน้ำ และความสะอาด',
      hook: 'คำศัพท์กลุ่มนี้เกี่ยวข้องกับบ้านและการอยู่อาศัย มักมีรากอักษร 宀 (หลังคาบ้าน) หรือ 衤 (เสื้อผ้า)',
      keywords: ['บ้าน', 'ห้อง', 'เตียง', 'โต๊ะ', 'เก้าอี้', 'ประตู', 'หน้าต่าง', 'เสื้อ', 'กางเกง', 'รองเท้า', 'หมวก', 'อาบน้ำ', 'นอน', 'ซักผ้า', 'โทรศัพท์', 'คอมพิวเตอร์', 'ของใช้', 'กุญแจ', 'room', 'bed', 'table', 'chair', 'door', 'window', 'clothes', 'shoes', 'sleep', 'shower', 'phone', 'computer']
    },
    {
      id: 'actions_verbs',
      name: 'การกระทำและการเคลื่อนไหว (Actions & Movement)',
      icon: '🏃',
      desc: 'คำกริยาแสดงการกระทำ การใช้ร่างกาย การหยิบ จับ วิ่ง กระโดด ผลัก และเคลื่อนไหว',
      hook: 'คำศัพท์กลุ่มนี้มักมีรากอักษร 扌 (มือ) หรือ ⻊ (เท้า) สะท้อนการออกแรงของร่างกาย',
      keywords: ['ทำ', 'เปิด', 'ปิด', 'หยิบ', 'ถือ', 'จับ', 'โยน', 'ดึง', 'ผลัก', 'วิ่ง', 'กระโดด', 'ยืน', 'นั่ง', 'รอ', 'มอง', 'ช่วย', 'ส่ง', 'รับ', 'move', 'take', 'hold', 'push', 'pull', 'run', 'jump', 'stand', 'sit', 'wait', 'help', 'send', 'receive']
    }
  ];

  // 5. Confusable Words Database (Pairs often confused by students)
  const CONFUSABLE_PAIRS = [
    {
      hanziList: ['待', '持'],
      warning: '待 (dài/dāi - รอ/คอย/ปฏิบัติ) มี 彳 (ก้าวเดิน) ส่วน 持 (chí - ถือ/รักษา) มี 扌 (มือ)'
    },
    {
      hanziList: ['晴', '睛'],
      warning: '晴 (qíng - อากาศแจ่มใส) มี 日 (ดวงอาทิตย์) ส่วน 睛 (jīng - ดวงตา) มี 目 (ตา)'
    },
    {
      hanziList: ['渴', '喝'],
      warning: '渴 (kě - กระหายน้ำ) มี 氵 (น้ำ) ส่วน 喝 (hē - ดื่ม) ใช้ 口 (ปากดื่ม)'
    },
    {
      hanziList: ['买', '卖'],
      warning: '买 (mǎi - ซื้อ) ไม่มี 十 ด้านบน ส่วน 卖 (mài - ขาย) มี 十 ด้านบน สื่อถึงมีของพร้อมปล่อยออก'
    },
    {
      hanziList: ['拔', '拨'],
      warning: '拔 (bá - ถอน/ดึง) ขวาคือ 犮 (มีจุด) ส่วน 拨 (bō - ปัด/หมุน/จัดสรร) ขวาคือ 发'
    },
    {
      hanziList: ['已', '己', '巳'],
      warning: '己 (jǐ - ตัวเอง) อ้าปากกว้าง, 已 (yǐ - แล้ว) ปิดครึ่งหนึ่ง, 巳 (sì - งู/ปีมะเส็ง) ปิดสนิท'
    },
    {
      hanziList: ['盲', '忙'],
      warning: '盲 (máng - ตาบอด) มี 目 (ตา) อยู่ล่าง ส่วน 忙 (máng - ยุ่ง) มี 忄 (ใจ) วิ่งวุ่น'
    },
    {
      hanziList: ['辩', '辨', '辫'],
      warning: '辩 (biàn - โต้เถียง) ตรงกลางคือ 讠(คำพูด), 辨 (biàn - จำแนก) ตรงกลางคือ 刀/刂(ผ่าแยก), 辫 (biàn - ถักเปีย) ตรงกลางคือ 纟(เส้นไหม)'
    },
    {
      hanziList: ['蓝', '篮'],
      warning: '蓝 (lán - สีน้ำเงิน) ด้านบนคือ 艹 (ต้นครามทำสีย้อม) ส่วน 篮 (lán - ตะกร้า) ด้านบนคือ ⺮ (สานจากไม้ไผ่)'
    },
    {
      hanziList: ['陪', '部'],
      warning: '陪 (péi - อยู่เป็นเพื่อน) 阝 อยู่ซ้าย (เนินดิน/ปกป้อง) ส่วน 部 (bù - แผนก/ส่วน) 阝 อยู่ขวา (เมือง/เขตแดน)'
    },
    {
      hanziList: ['爪', '瓜'],
      warning: '爪 (zhuǎ - กรงเล็บ/อุ้งเท้า) ไม่มีจุดเฉียงกลาง ส่วน 瓜 (guā - แตง) มีเส้นเฉียงและจุดตรงกลาง'
    },
    {
      hanziList: ['办', '为'],
      warning: '办 (bàn - จัดการ/ทำงาน) มี 力 (แรง) ตรงกลางขนาบด้วยสองจุด ส่วน 为 (wèi - เพื่อ/กระทำ) จุดอยู่ขวาบนและล่าง'
    },
    {
      hanziList: ['师', '帅'],
      warning: '师 (shī - ครู/อาจารย์) ขวามือคือ 帀 ส่วน 帅 (shuài - หล่อ/แม่ทัพ) ขวามือคือ 巾'
    }
  ];

  // 6. Curated Authentic Example Sentences for Study Groups
  const CURATED_SENTENCES = {
    '氵': [
      { hanzi: '海边的空气非常清新，让人感到轻松。', pinyin: 'Hǎibiān de kōngqì fēicháng qīngxīn, ràng rén gǎndào qīngsōng.', en: 'The seaside air is very fresh and makes people feel relaxed.', th: 'อากาศริมทะเลสดชื่นมาก ทำให้ผู้คนรู้สึกผ่อนคลาย' },
      { hanzi: '天气太热了，我喝了很多冰水还是觉得渴。', pinyin: 'Tiānqì tài rè le, wǒ hē le hěn duō bīngshuǐ háishì juéde kě.', en: 'The weather is too hot, I drank lots of ice water but still feel thirsty.', th: 'อากาศร้อนเกินไป ฉันดื่มน้ำเย็นไปเยอะมากแต่ก็ยังรู้สึกกระหาย' }
    ],
    '亻': [
      { hanzi: '他是我们公司最优秀的工程师，大家都很佩服他。', pinyin: 'Tā shì wǒmen gōngsī zuì yōuxiù de gōngchéngshī, dàjiā dōu hěn pèifú tā.', en: 'He is the most outstanding engineer in our company, everyone admires him.', th: 'เขาเป็นวิศวกรที่ยอดเยี่ยมที่สุดในบริษัทเรา ทุกคนต่างชื่นชมเขา' },
      { hanzi: '休息一下吧，我们做完这些事情就去吃晚饭。', pinyin: 'Xiūxi yíxià ba, wǒmen zuò wán zhèxiē shìqing jiù qù chī wǎnfàn.', en: 'Take a rest, we will go have dinner after finishing these tasks.', th: 'พักผ่อนสักหน่อยเถอะ พอเราทำงานเหล่านี้เสร็จแล้วก็จะไปกินข้าวเย็น' }
    ],
    '扌': [
      { hanzi: '请大家把手机拿出来，打开这个链接。', pinyin: 'Qǐng dàjiā bǎ shǒujī ná chūlai, dǎkāi zhège liànjiē.', en: 'Please take out your phones and open this link.', th: 'กรุณานำโทรศัพท์มือถือออกมา แล้วเปิดลิงก์นี้' },
      { hanzi: '遇到困难的时候，朋友们都会主动伸出援手。', pinyin: 'Yùdào kùnnan de shíhou, péngyoumen dōu huì zhǔdòng shēn chū yuánshǒu.', en: 'When facing difficulties, friends will proactively lend a helping hand.', th: 'ยามที่เผชิญความยากลำบาก เพื่อนๆ มักจะยื่นมือเข้ามาช่วยเหลือเสมอ' }
    ],
    '口': [
      { hanzi: '服务员热情地问我们要喝茶还是喝咖啡。', pinyin: 'Fúwùyuán rèqíng de wèn wǒmen yào hē chá háishì hē kāfēi.', en: 'The waiter warmly asked us if we wanted tea or coffee.', th: 'พนักงานเสิร์ฟถามพวกเราอย่างกระตือรือร้นว่าจะดื่มชาหรือดื่มกาแฟ' },
      { hanzi: '听到这个好消息，大家高兴地欢呼起来。', pinyin: 'Tīng dào zhège hǎo xiāoxi, dàjiā gāoxìng de huānhū qǐlai.', en: 'Upon hearing this good news, everyone cheered happily.', th: 'เมื่อได้ยินข่าวดีนี้ ทุกคนก็ส่งเสียงร้องแสดงความยินดีอย่างร่าเริง' }
    ],
    '木': [
      { hanzi: '公园里的树木郁郁葱葱，非常适合散步。', pinyin: 'Gōngyuán lǐ de shùmù yùyù cōngcōng, fēicháng shìhé sànbù.', en: 'The trees in the park are lush and green, very suitable for taking a stroll.', th: 'ต้นไม้ในสวนสาธารณะเขียวชอุ่ม ร่มรื่น เหมาะแก่การเดินเล่นมาก' },
      { hanzi: '请你检查一下桌子上的文件是否齐全。', pinyin: 'Qǐng nǐ jiǎnchá yíxià zhuōzi shang de wénjiàn shìfǒu qíquán.', en: 'Please check whether the documents on the desk are complete.', th: 'กรุณาตรวจสอบเอกสารบนโต๊ะว่าครบถ้วนหรือไม่' }
    ],
    '讠': [
      { hanzi: '老师耐心地向我们解释每一个新词语的意思。', pinyin: 'Lǎoshī nàixīn de xiàng wǒmen jiěshì měi yí gè xīn cíyǔ de yìsi.', en: 'The teacher patiently explained the meaning of each new word to us.', th: 'คุณครูอธิบายความหมายของคำศัพท์ใหม่แต่ละคำให้พวกเราฟังอย่างอดทน' },
      { hanzi: '大家在会议上热烈地讨论了新学期的计划。', pinyin: 'Dàjiā zài huìyì shang rèliè de tǎolùn le xīn xuéqī de jìhuà.', en: 'Everyone enthusiastically discussed the plan for the new semester in the meeting.', th: 'ทุกคนในที่ประชุมอภิปรายแผนงานของภาคเรียนใหม่อย่างกระตือรือร้น' }
    ],
    '艹': [
      { hanzi: '春天来了，草地上开满了五颜六色的鲜花。', pinyin: 'Chūntiān lái le, cǎodì shang kāi mǎn le wǔyán liùsè de xiānhuā.', en: 'Spring has arrived, the meadow is in full bloom with colorful flowers.', th: 'ฤดูใบไม้ผลิมาถึงแล้ว ทุ่งหญ้าเต็มไปด้วยดอกไม้สดหลากสีสัน' },
      { hanzi: '多吃新鲜蔬菜和水果对身体健康非常有益。', pinyin: 'Duō chī xīnxiān shūcài hé shuǐguǒ duì shēntǐ jiànkāng fēicháng yǒuyì.', en: 'Eating plenty of fresh vegetables and fruits is very beneficial to physical health.', th: 'การกินผักและผลไม้สดให้มากๆ มีประโยชน์ต่อสุขภาพร่างกายเป็นอย่างยิ่ง' }
    ],
    '饣': [
      { hanzi: '这家餐馆的中国菜味道非常地道，生意很好。', pinyin: 'Zhè jiā cānguǎn de Zhōngguócài wèidao fēicháng dìdao, shēngyi hěn hǎo.', en: 'The Chinese food in this restaurant tastes very authentic and business is great.', th: 'อาหารจีนของร้านนี้รสชาติดั้งเดิมแท้ๆ ธุรกิจจึงเจริญรุ่งเรืองมาก' },
      { hanzi: '今天做了很多水饺，大家都吃得非常饱。', pinyin: 'Jīntiān zuò le hěn duō shuǐjiǎo, dàjiā dōu chī de fēicháng bǎo.', en: 'We made many dumplings today, and everyone ate until they were completely full.', th: 'วันนี้ทำเกี๊ยวน้ำไว้เยอะมาก ทุกคนต่างกินกันจนอิ่มแปล้' }
    ],
    '纟': [
      { hanzi: '经过坚持不懈的练习，他的中文水平提高了很多。', pinyin: 'Jīngguò jiānchí bú xiè de liànxí, tā de Zhōngwén shuǐpíng tígāo le hěn duō.', en: 'Through persistent practice, his Chinese level improved tremendously.', th: 'ผ่านการฝึกฝนอย่างไม่ย่อท้อ ระดับภาษาจีนของเขาก็พัฒนาขึ้นอย่างมาก' },
      { hanzi: '我们把所有的线索结合起来，终于解决了问题。', pinyin: 'Wǒmen bǎ suǒyǒu de xiànsuǒ jiéhé qǐlai, zhōngyú jiějué le wèntí.', en: 'We combined all clues together and finally resolved the issue.', th: 'พวกเรารวบรวมเบาะแสทั้งหมดเข้าด้วยกัน จนในที่สุดก็แก้ไขปัญหาได้สำเร็จ' }
    ],
    'default': [
      { hanzi: '每天认真学习生词，语言能力就会逐步提高。', pinyin: 'Měitiān rènzhēn xuéxí shēngcí, yǔyán nénglì jiù huì zhúbù tígāo.', en: 'By studying new vocabulary diligently every day, language ability will gradually improve.', th: 'การตั้งใจเรียนรู้คำศัพท์ใหม่ทุกวัน ความสามารถทางภาษาจะค่อยๆ พัฒนาขึ้น' },
      { hanzi: '掌握汉字的偏旁部首，能帮助我们更轻松地记忆单词。', pinyin: 'Zhǎngwò hànzì de piānpáng bùshǒu, néng bāngzhù wǒmen gèng qīngsōng de jìyì dāncí.', en: 'Mastering Hanzi radicals can help us memorize vocabulary with greater ease.', th: 'การเข้าใจรากอักษรของตัวจีน จะช่วยให้เราจดจำคำศัพท์ได้อย่างง่ายดายยิ่งขึ้น' }
    ]
  };

  /**
   * Helper to detect primary radical of a character
   */
  function detectRadical(char) {
    if (!char) return null;
    if (CHAR_RADICAL_MAP[char]) {
      return CHAR_RADICAL_MAP[char];
    }
    // Check known radical characters directly inside the character
    for (const rad of Object.keys(RADICALS)) {
      if (char.includes(rad)) {
        return rad;
      }
    }
    return null;
  }

  /**
   * Helper to classify a word into semantic category
   */
  function detectCategory(wordObj) {
    if (!wordObj) return null;
    const textToMatch = `${wordObj.meaning || ''} ${wordObj.meaning_en || ''} ${wordObj.hanzi || ''}`.toLowerCase();

    for (const cat of SEMANTIC_CATEGORIES) {
      for (const kw of cat.keywords) {
        if (textToMatch.includes(kw.toLowerCase())) {
          return cat;
        }
      }
    }
    return null;
  }

  /**
   * Helper to find confusable warnings for a set of words
   */
  function findConfusablesForWords(words) {
    const hanziChars = new Set();
    words.forEach(w => {
      for (const char of w.hanzi) hanziChars.add(char);
    });

    const matches = [];
    for (const pair of CONFUSABLE_PAIRS) {
      const matchCount = pair.hanziList.filter(c => hanziChars.has(c)).length;
      if (matchCount >= 1) {
        matches.push(pair.warning);
      }
    }
    return matches.slice(0, 3);
  }

  /**
   * Get example sentences for radical or category
   */
  function getExampleSentences(key) {
    if (CURATED_SENTENCES[key]) {
      return CURATED_SENTENCES[key];
    }
    return CURATED_SENTENCES['default'];
  }

  return {
    RADICALS,
    CHAR_RADICAL_MAP,
    PHONETIC_FAMILIES,
    SEMANTIC_CATEGORIES,
    CONFUSABLE_PAIRS,
    detectRadical,
    detectCategory,
    findConfusablesForWords,
    getExampleSentences
  };
})();
