const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { recognizeIdCard } = require('../ocr');

const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// 常量：安全须知内容
const SAFETY_RULES = [
  {
    title: '一、总则',
    content: '为保障临时作业人员（含外包、临时工、短期施工人员、设备安装调试人员等）人身安全，依据《安全生产法》《建设工程安全生产管理条例》，特制定本须知。所有临时作业人员必须先培训、后上岗，认真阅读并签署本须知后方可进入现场作业。'
  },
  {
    title: '二、入场基本要求',
    content: '1. 未满18周岁、患有高血压、心脏病、癫痫病、恐高症等禁忌症及酒后、服药影响安全状态者，严禁入场作业。\n2. 特种作业人员必须持有效特种作业操作证原件上岗，严禁无证或超范围作业。\n3. 必须在批准的作业时间和作业区域内活动，严禁擅自进入未授权的危险区域（基坑、塔吊半径、脚手架拆除区、高压带电区等）。'
  },
  {
    title: '三、个人防护要求',
    content: '1. 进入施工现场必须正确佩戴安全帽（系紧下颌带），穿着防滑劳保鞋，严禁穿拖鞋、凉鞋、高跟鞋、赤脚或赤膊作业。\n2. 高处作业（2米及以上）必须系好安全带（高挂低用），严禁抛掷工具、材料。\n3. 进入粉尘、噪音、焊接、有限空间等作业区域，必须按规定佩戴口罩、耳塞、护目镜、防毒面具等专用防护用品。\n4. 严禁拆除、损坏或挪用个人防护用品及现场安全防护设施。'
  },
  {
    title: '四、现场作业安全规范',
    content: '1. 严格遵守安全技术交底要求，服从班组长和现场安全员指挥，严禁违章指挥、违章作业、违反劳动纪律。\n2. 严禁擅自操作任何施工机械、电气设备、阀门开关及安全防护装置；非电工严禁接拆电线、电器。\n3. 动火作业、高处作业、有限空间作业、吊装作业等危险作业，必须先办理作业审批手续，落实安全措施后方可作业。\n4. 施工现场严禁吸烟、追逐打闹、酒后作业，严禁携带易燃易爆、管制刀具等危险物品入场。\n5. 临时用电必须使用合格的配电箱和电缆，做到"一机一闸一漏一箱"，严禁私拉乱接。'
  },
  {
    title: '五、紧急情况处置',
    content: '1. 发生安全事故或险情时，立即停止作业，迅速撤离至安全区域，并第一时间报告现场管理人员。\n2. 紧急撤离时听从统一指挥，有序疏散，严禁乘坐电梯。\n3. 项目部应急电话：15344132006、19892817011'
  }
];

// 获取安全须知
router.get('/safety-rules', (req, res) => {
  res.json({ rules: SAFETY_RULES });
});

// OCR识别身份证
router.post('/ocr-id-card', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传身份证照片' });
    }
    const result = await recognizeIdCard(req.file.path);
    res.json(result);
  } catch (err) {
    console.error('OCR识别失败:', err.message);
    res.status(500).json({ error: '身份证识别失败，请重试或手动填写' });
  }
});

// 上传人脸照片
router.post('/upload-face', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传人脸照片' });
  }
  res.json({ photo: '/uploads/' + req.file.filename });
});

// 提交人员登记
router.post('/register', (req, res) => {
  try {
    const { name, id_number, id_card_photo, face_photo, team, phone, health_check, safety_confirmed, valid_until, latitude, longitude, location_address } = req.body;

    if (!name || !id_number || !team || !phone) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO workers (id, name, id_number, id_card_photo, face_photo, team, phone, health_check, safety_confirmed, valid_until, latitude, longitude, location_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, id_number, id_card_photo || null, face_photo || null, team, phone,
      health_check ? 1 : 0, safety_confirmed ? 1 : 0, valid_until || null,
      latitude || null, longitude || null, location_address || null);

    res.json({ success: true, id });
  } catch (err) {
    console.error('登记失败:', err.message);
    res.status(500).json({ error: '登记失败，请重试' });
  }
});

// 获取人员列表（支持搜索和筛选）
router.get('/list', (req, res) => {
  try {
    const { search, team, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR id_number LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (team) {
      where += ' AND team = ?';
      params.push(team);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM workers ${where}`).get(...params);
    const total = countRow.total;

    const rows = db.prepare(
      `SELECT * FROM workers ${where} ORDER BY entry_time DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(pageSize), offset);

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), list: rows });
  } catch (err) {
    console.error('查询失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

// 获取人员详情
router.get('/detail/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: '未找到该人员' });
    }
    res.json(row);
  } catch (err) {
    console.error('查询详情失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

// 统计概览
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const todayCount = db.prepare(
      "SELECT COUNT(*) as count FROM workers WHERE date(entry_time) = ?"
    ).get(today);

    const currentCount = db.prepare(
      "SELECT COUNT(*) as count FROM workers WHERE valid_until >= date('now', 'localtime') OR valid_until IS NULL"
    ).get();

    const monthCount = db.prepare(
      "SELECT COUNT(*) as count FROM workers WHERE strftime('%Y-%m', entry_time) = strftime('%Y-%m', 'now', 'localtime')"
    ).get();

    const noHealthCount = db.prepare(
      "SELECT COUNT(*) as count FROM workers WHERE health_check = 0 AND (valid_until >= date('now', 'localtime') OR valid_until IS NULL)"
    ).get();

    // 近7天趋势
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const row = db.prepare(
        "SELECT COUNT(*) as count FROM workers WHERE date(entry_time) = ?"
      ).get(dateStr);
      trend.push({ date: dateStr, count: row.count });
    }

    // 班组分布
    const teamDist = db.prepare(
      "SELECT team, COUNT(*) as count FROM workers WHERE valid_until >= date('now', 'localtime') OR valid_until IS NULL GROUP BY team ORDER BY count DESC"
    ).all();

    res.json({
      todayCount: todayCount.count,
      currentCount: currentCount.count,
      monthCount: monthCount.count,
      noHealthCount: noHealthCount.count,
      trend,
      teamDistribution: teamDist
    });
  } catch (err) {
    console.error('统计失败:', err.message);
    res.status(500).json({ error: '统计失败' });
  }
});

// 导出Excel（CSV格式）
router.get('/export', (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT name, id_number, team, phone, entry_time, valid_until, health_check, safety_confirmed FROM workers ORDER BY entry_time DESC"
    ).all();

    const header = '姓名,身份证号,班组,手机号,进场时间,有效期至,是否体检,安全确认\n';
    const csv = rows.map(r => [
      r.name,
      r.id_number,
      r.team,
      r.phone,
      r.entry_time,
      r.valid_until || '',
      r.health_check ? '是' : '否',
      r.safety_confirmed ? '已确认' : '未确认'
    ].join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=人员列表.csv');
    // 添加BOM以支持Excel打开中文
    res.send('\uFEFF' + header + csv);
  } catch (err) {
    console.error('导出失败:', err.message);
    res.status(500).json({ error: '导出失败' });
  }
});

module.exports = router;