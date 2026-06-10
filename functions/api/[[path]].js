/**
 * Cloudflare Pages Functions - API 处理
 * 处理所有 /api/* 请求
 */

// 回退到普通变量
let _env = null;

// ====== 内存存储（没绑定KV时使用） ======
const memoryStore = new Map();

function getKV(env) {
  if (env && env.KV) return env.KV;
  // 回退到内存存储
  return {
    async get(key) { return memoryStore.get(key) || null; },
    async put(key, value) { memoryStore.set(key, value); },
    async delete(key) { memoryStore.delete(key); },
    async list(opts) {
      const prefix = (opts && opts.prefix) || '';
      const keys = [];
      for (const k of memoryStore.keys()) {
        if (k.startsWith(prefix)) keys.push({ name: k });
      }
      return { keys };
    }
  };
}

// ====== 数据库操作 ======
const WORKER_PREFIX = 'worker:';
const IDS_KEY = 'workers:ids';
const COUNTER_KEY = 'workers:counter';

async function createWorker(kv, data) {
  const counterStr = await kv.get(COUNTER_KEY);
  const counter = (parseInt(counterStr) || 0) + 1;
  await kv.put(COUNTER_KEY, String(counter));
  const workerId = String(counter);
  const now = new Date().toISOString();
  const record = {
    id: workerId,
    name: data.name,
    id_number: data.id_number,
    id_card_photo: data.id_card_photo || null,
    face_photo: data.face_photo || null,
    team: data.team,
    phone: data.phone,
    health_check: data.health_check ? 1 : 0,
    safety_confirmed: data.safety_confirmed ? 1 : 0,
    valid_until: data.valid_until || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    location_address: data.location_address || null,
    entry_time: data.entry_time || now,
    created_at: data.created_at || now
  };
  await kv.put(WORKER_PREFIX + workerId, JSON.stringify(record));
  let idsStr = await kv.get(IDS_KEY);
  let ids = idsStr ? JSON.parse(idsStr) : [];
  ids.unshift(workerId);
  await kv.put(IDS_KEY, JSON.stringify(ids));
  return record;
}

async function getWorker(kv, id) {
  const raw = await kv.get(WORKER_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

async function getAllWorkers(kv) {
  let idsStr = await kv.get(IDS_KEY);
  let ids = idsStr ? JSON.parse(idsStr) : [];
  const all = [];
  for (const id of ids) {
    const worker = await getWorker(kv, id);
    if (worker) all.push(worker);
  }
  return all;
}

// ====== 百度OCR ======
async function getBaiduToken(env) {
  const apiKey = env.BAIDU_OCR_API_KEY;
  const secretKey = env.BAIDU_OCR_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error('百度OCR未配置');
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.access_token) throw new Error('获取百度token失败');
  return data.access_token;
}

async function recognizeIdCard(imageBuffer, env) {
  const token = await getBaiduToken(env);
  const u8 = new Uint8Array(imageBuffer);
  const binary = Array.from(u8, b => String.fromCharCode(b)).join('');
  const imageBase64 = btoa(binary);
  const body = new URLSearchParams({
    id_card_side: 'front',
    image: imageBase64,
    detect_risk: 'true'
  });
  const res = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const result = await res.json();
  if (result.words_result) {
    return {
      name: result.words_result['姓名']?.words || '',
      id_number: result.words_result['公民身份号码']?.words || '',
      gender: result.words_result['性别']?.words || '',
      nation: result.words_result['民族']?.words || '',
      birthday: result.words_result['出生']?.words || '',
      address: result.words_result['住址']?.words || ''
    };
  }
  throw new Error(result.error_msg || '身份证识别失败');
}

// ====== 安全须知 ======
const SAFETY_RULES = [
  { title: '一、总则', content: '为保障临时作业人员（含外包、临时工、短期施工人员、设备安装调试人员等）人身安全，依据《安全生产法》《建设工程安全生产管理条例》，特制定本须知。所有临时作业人员必须先培训、后上岗，认真阅读并签署本须知后方可进入现场作业。' },
  { title: '二、入场基本要求', content: '1. 未满18周岁、患有高血压、心脏病、癫痫病、恐高症等禁忌症及酒后、服药影响安全状态者，严禁入场作业。\n2. 特种作业人员必须持有效特种作业操作证原件上岗，严禁无证或超范围作业。\n3. 必须在批准的作业时间和作业区域内活动，严禁擅自进入未授权的危险区域（基坑、塔吊半径、脚手架拆除区、高压带电区等）。' },
  { title: '三、个人防护要求', content: '1. 进入施工现场必须正确佩戴安全帽（系紧下颌带），穿着防滑劳保鞋，严禁穿拖鞋、凉鞋、高跟鞋、赤脚或赤膊作业。\n2. 高处作业（2米及以上）必须系好安全带（高挂低用），严禁抛掷工具、材料。\n3. 进入粉尘、噪音、焊接、有限空间等作业区域，必须按规定佩戴口罩、耳塞、护目镜、防毒面具等专用防护用品。\n4. 严禁拆除、损坏或挪用个人防护用品及现场安全防护设施。' },
  { title: '四、现场作业安全规范', content: '1. 严格遵守安全技术交底要求，服从班组长和现场安全员指挥，严禁违章指挥、违章作业、违反劳动纪律。\n2. 严禁擅自操作任何施工机械、电气设备、阀门开关及安全防护装置；非电工严禁接拆电线、电器。\n3. 动火作业、高处作业、有限空间作业、吊装作业等危险作业，必须先办理作业审批手续，落实安全措施后方可作业。\n4. 施工现场严禁吸烟、追逐打闹、酒后作业，严禁携带易燃易爆、管制刀具等危险物品入场。\n5. 临时用电必须使用合格的配电箱和电缆，做到"一机一闸一漏一箱"，严禁私拉乱接。' },
  { title: '五、紧急情况处置', content: '1. 发生安全事故或险情时，立即停止作业，迅速撤离至安全区域，并第一时间报告现场管理人员。\n2. 紧急撤离时听从统一指挥，有序疏散，严禁乘坐电梯。\n3. 项目部应急电话：15344132006、19892817011' }
];

// ====== 主路由处理 ======
export async function onRequest(context) {
  const { request, env } = context;
  _env = env;
  const kv = getKV(env);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    let result;

    // GET /api/config
    if (path === '/api/config' && method === 'GET') {
      result = json({ publicUrl: url.origin });
    }

    // GET /api/workers/safety-rules
    else if (path === '/api/workers/safety-rules' && method === 'GET') {
      result = json({ rules: SAFETY_RULES });
    }

    // POST /api/workers/ocr-id-card
    else if (path === '/api/workers/ocr-id-card' && method === 'POST') {
      const form = await request.formData();
      const file = form.get('image');
      if (!file) { result = json({ error: '请上传身份证照片' }, 400); }
      else {
        const buffer = await file.arrayBuffer();
        const ocrResult = await recognizeIdCard(buffer, env);
        result = json(ocrResult);
      }
    }

    // POST /api/workers/upload-face
    else if (path === '/api/workers/upload-face' && method === 'POST') {
      const form = await request.formData();
      const file = form.get('image');
      if (!file) { result = json({ error: '请上传人脸照片' }, 400); }
      else {
        const buffer = await file.arrayBuffer();
        const u8 = new Uint8Array(buffer);
        const binary = Array.from(u8, b => String.fromCharCode(b)).join('');
        const base64 = btoa(binary);
        const mime = file.type || 'image/jpeg';
        result = json({ photo: `data:${mime};base64,${base64}` });
      }
    }

    // POST /api/workers/register
    else if (path === '/api/workers/register' && method === 'POST') {
      const data = await request.json();
      if (!data.name || !data.id_number || !data.team || !data.phone) {
        result = json({ error: '请填写完整信息' }, 400);
      } else {
        const record = await createWorker(kv, data);
        result = json({ success: true, id: record.id });
      }
    }

    // GET /api/workers/list
    else if (path === '/api/workers/list' && method === 'GET') {
      const search = url.searchParams.get('search') || '';
      const team = url.searchParams.get('team') || '';
      const page = parseInt(url.searchParams.get('page')) || 1;
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;

      let all = await getAllWorkers(kv);
      if (search) {
        const s = search.toLowerCase();
        all = all.filter(w =>
          (w.name && w.name.toLowerCase().includes(s)) ||
          (w.phone && w.phone.includes(s)) ||
          (w.id_number && w.id_number.includes(s))
        );
      }
      if (team) {
        all = all.filter(w => w.team === team);
      }
      const total = all.length;
      const offset = (page - 1) * pageSize;
      const list = all.slice(offset, offset + pageSize);
      result = json({ total, page, pageSize, list });
    }

    // GET /api/workers/stats
    else if (path === '/api/workers/stats' && method === 'GET') {
      const all = await getAllWorkers(kv);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      const todayCount = all.filter(w => w.entry_time && w.entry_time.startsWith(todayStr)).length;
      const currentCount = all.filter(w => !w.valid_until || new Date(w.valid_until) >= new Date(todayStr)).length;
      const monthCount = all.filter(w => w.entry_time && w.entry_time.startsWith(monthStr)).length;
      const noHealthCount = all.filter(w => !w.health_check && (!w.valid_until || new Date(w.valid_until) >= new Date(todayStr))).length;

      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        trend.push({ date: ds, count: all.filter(w => w.entry_time && w.entry_time.startsWith(ds)).length });
      }

      const teamMap = {};
      all.forEach(w => {
        if ((!w.valid_until || new Date(w.valid_until) >= new Date(todayStr)) && w.team) {
          teamMap[w.team] = (teamMap[w.team] || 0) + 1;
        }
      });
      const teamDistribution = Object.entries(teamMap).map(([team, count]) => ({ team, count })).sort((a, b) => b.count - a.count);

      result = json({ todayCount, currentCount, monthCount, noHealthCount, trend, teamDistribution });
    }

    // GET /api/workers/export
    else if (path === '/api/workers/export' && method === 'GET') {
      const all = await getAllWorkers(kv);
      const header = '姓名,身份证号,班组,手机号,进场时间,有效期至,是否体检,安全确认\n';
      const csv = all.map(r => [
        r.name, r.id_number, r.team, r.phone, r.entry_time,
        r.valid_until || '', r.health_check ? '是' : '否', r.safety_confirmed ? '已确认' : '未确认'
      ].join(',')).join('\n');
      result = new Response('\uFEFF' + header + csv, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=人员列表.csv' }
      });
    }

    // GET /api/workers/detail/:id
    else if (path.startsWith('/api/workers/detail/') && method === 'GET') {
      const id = path.split('/').pop();
      const worker = await getWorker(kv, id);
      if (!worker) { result = json({ error: '未找到该人员' }, 404); }
      else { result = json(worker); }
    }

    // POST /api/admin/verify
    else if (path === '/api/admin/verify' && method === 'POST') {
      const body = await request.json();
      const adminPassword = env.ADMIN_PASSWORD || 'admin123';
      if (body.password === adminPassword) {
        result = json({ success: true, token: 'admin_' + Date.now() });
      } else {
        result = json({ error: '密码错误' }, 401);
      }
    }

    // 404
    else {
      result = json({ error: 'Not Found' }, 404);
    }

    return result;
  } catch (err) {
    return json({ error: err.message || '服务器错误' }, 500);
  }
}

// ====== 工具函数 ======
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}