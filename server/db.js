/**
 * 数据存储层
 * Vercel环境：使用 process.env 中的 KV 变量（需在Vercel Dashboard创建KV Store并关联）
 * 本地开发：使用内存存储（重启后数据丢失）
 */

// 简易内存存储（兼容KV API）
class MemoryStore {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    const val = this.store.get(key);
    return val === undefined ? null : val;
  }
  async set(key, value) {
    this.store.set(key, value);
    return 'OK';
  }
  async del(key) {
    this.store.delete(key);
    return 1;
  }
  async incr(key) {
    const val = (parseInt(this.store.get(key)) || 0) + 1;
    this.store.set(key, val.toString());
    return val;
  }
  async keys(pattern) {
    const prefix = pattern.replace('*', '');
    const result = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        result.push(key);
      }
    }
    return result;
  }
}

let kv;
try {
  // 尝试使用 Vercel KV
  const { kv: vercelKv } = require('@vercel/kv');
  kv = vercelKv;
} catch {
  // 回退到内存存储
  kv = new MemoryStore();
}

// ========== 数据库操作 ==========

const WORKER_PREFIX = 'worker:';
const IDS_KEY = 'workers:ids';
const COUNTER_KEY = 'workers:counter';

// 创建人员记录
async function createWorker(data) {
  const id = await kv.incr(COUNTER_KEY);
  const workerId = id.toString();
  const record = {
    id: workerId,
    ...data,
    entry_time: data.entry_time || new Date().toISOString(),
    created_at: data.created_at || new Date().toISOString()
  };
  await kv.set(WORKER_PREFIX + workerId, JSON.stringify(record));

  // 更新ID列表（最新的在前面）
  let ids = await kv.get(IDS_KEY);
  ids = ids ? JSON.parse(ids) : [];
  ids.unshift(workerId);
  await kv.set(IDS_KEY, JSON.stringify(ids));

  return record;
}

// 获取单个人员
async function getWorker(id) {
  const raw = await kv.get(WORKER_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

// 获取人员列表（带搜索和分页）
async function listWorkers({ search, team, page = 1, pageSize = 20 } = {}) {
  let ids = await kv.get(IDS_KEY);
  ids = ids ? JSON.parse(ids) : [];

  // 获取所有记录
  const all = [];
  for (const id of ids) {
    const worker = await getWorker(id);
    if (worker) all.push(worker);
  }

  // 过滤
  let filtered = all;
  if (search) {
    const s = search.toLowerCase();
    filtered = all.filter(w =>
      (w.name && w.name.toLowerCase().includes(s)) ||
      (w.phone && w.phone.includes(s)) ||
      (w.id_number && w.id_number.includes(s))
    );
  }
  if (team) {
    filtered = filtered.filter(w => w.team === team);
  }

  const total = filtered.length;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const list = filtered.slice(offset, offset + parseInt(pageSize));

  return { total, page: parseInt(page), pageSize: parseInt(pageSize), list };
}

// 获取所有人员
async function getAllWorkers() {
  let ids = await kv.get(IDS_KEY);
  ids = ids ? JSON.parse(ids) : [];
  const all = [];
  for (const id of ids) {
    const worker = await getWorker(id);
    if (worker) all.push(worker);
  }
  return all;
}

// 获取统计概览
async function getStats() {
  const all = await getAllWorkers();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const todayCount = all.filter(w => w.entry_time && w.entry_time.startsWith(todayStr)).length;

  const currentCount = all.filter(w => {
    if (!w.valid_until) return true;
    return new Date(w.valid_until) >= new Date(todayStr);
  }).length;

  const monthCount = all.filter(w => w.entry_time && w.entry_time.startsWith(monthStr)).length;

  const noHealthCount = all.filter(w => {
    if (w.health_check) return false;
    if (!w.valid_until) return true;
    return new Date(w.valid_until) >= new Date(todayStr);
  }).length;

  // 近7天趋势
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = all.filter(w => w.entry_time && w.entry_time.startsWith(dateStr)).length;
    trend.push({ date: dateStr, count });
  }

  // 班组分布
  const teamMap = {};
  all.forEach(w => {
    const valid = !w.valid_until || new Date(w.valid_until) >= new Date(todayStr);
    if (valid && w.team) {
      teamMap[w.team] = (teamMap[w.team] || 0) + 1;
    }
  });
  const teamDistribution = Object.entries(teamMap)
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count);

  return {
    todayCount,
    currentCount,
    monthCount,
    noHealthCount,
    trend,
    teamDistribution
  };
}

module.exports = {
  createWorker,
  getWorker,
  listWorkers,
  getAllWorkers,
  getStats
};