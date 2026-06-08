const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// 启用WAL模式提升性能
db.pragma('journal_mode = WAL');

// 创建人员表
db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_number TEXT NOT NULL,
    id_card_photo TEXT,
    face_photo TEXT,
    team TEXT NOT NULL,
    phone TEXT NOT NULL,
    health_check INTEGER NOT NULL DEFAULT 0,
    safety_confirmed INTEGER NOT NULL DEFAULT 0,
    valid_until TEXT,
    latitude REAL,
    longitude REAL,
    location_address TEXT,
    entry_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// 兼容旧表：如果不存在则添加定位字段
try { db.exec("ALTER TABLE workers ADD COLUMN latitude REAL"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN longitude REAL"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN location_address TEXT"); } catch (e) {}

module.exports = db;