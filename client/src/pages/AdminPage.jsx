import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Table, Dialog, Tag, MessagePlugin, Loading } from 'tdesign-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getWorkerList, getStats, getWorkerDetail, getExportUrl } from '../api';

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 图片放大弹窗
  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState({ url: '', title: '' });

  const openPhotoDialog = (url, title) => {
    setCurrentPhoto({ url, title });
    setPhotoDialogVisible(true);
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  // 加载人员列表
  const loadList = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (search) params.search = search;
      if (teamFilter) params.team = teamFilter;
      const res = await getWorkerList(params);
      setWorkerList(res.data.list);
      setTotal(res.data.total);
    } catch (err) {
      console.error('加载列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadList();
  }, [page, search, teamFilter]);

  // 班组列表（从统计数据中提取）
  const teamOptions = stats?.teamDistribution?.map(t => ({
    label: t.team,
    value: t.team
  })) || [];

  const columns = [
    { colKey: 'name', title: '姓名', width: 80 },
    { colKey: 'id_number', title: '身份证号', width: 180, cell: ({ row }) => (
      <span style={{ color: '#999' }}>{row.id_number?.replace(/(\d{3})\d+(\d{4})/, '$1***********$2')}</span>
    )},
    { colKey: 'team', title: '班组', width: 100 },
    { colKey: 'phone', title: '手机号', width: 130, cell: ({ row }) => (
      <span>{row.phone?.replace(/(\d{3})\d+(\d{4})/, '$1****$2')}</span>
    )},
    { colKey: 'entry_time', title: '进场时间', width: 150 },
    { colKey: 'valid_until', title: '有效期至', width: 120, cell: ({ row }) => (
      <span>{row.valid_until || '未设置'}</span>
    )},
    { colKey: 'health_check', title: '体检', width: 80, cell: ({ row }) => (
      <Tag theme={row.health_check ? 'success' : 'danger'} variant="light" size="small">
        {row.health_check ? '是' : '否'}
      </Tag>
    )},
    { colKey: 'safety_confirmed', title: '安全确认', width: 100, cell: ({ row }) => (
      <Tag theme={row.safety_confirmed ? 'success' : 'warning'} variant="light" size="small">
        {row.safety_confirmed ? '已确认' : '未确认'}
      </Tag>
    )},
    { colKey: 'action', title: '操作', width: 80, cell: ({ row }) => (
      <Button theme="primary" variant="text" size="small" onClick={() => showDetail(row)}>
        查看详情
      </Button>
    )}
  ];

  const showDetail = async (row) => {
    // 如果列表数据已有照片标记，从接口拉完整数据
    if (row.has_idcard_photo || row.has_face_photo || row.id_card_photo || row.face_photo) {
      // 已有内嵌照片直接用
      setDetailData(row);
      setDetailVisible(true);
      return;
    }
    // 否则调接口取完整详情（含照片）
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const res = await getWorkerDetail(row.id);
      setDetailData(res.data);
    } catch {
      setDetailData(row);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = () => {
    window.open(getExportUrl(), '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_login_time');
    navigate('/login', { replace: true });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>工地临时人员管理系统</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button theme="default" size="small" onClick={() => navigate('/qrcode')}>
            二维码
          </Button>
          <Button theme="danger" size="small" variant="outline" onClick={handleLogout}>
            退出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">今日进场人数</div>
          <div className="stat-value" style={{ color: '#0052d9' }}>{stats?.todayCount ?? '-'}</div>
          <div className="stat-sub">今日</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">当前在场人数</div>
          <div className="stat-value" style={{ color: '#e37318' }}>{stats?.currentCount ?? '-'}</div>
          <div className="stat-sub">有效期内的在場人员</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">本月累计进场</div>
          <div className="stat-value" style={{ color: '#333' }}>{stats?.monthCount ?? '-'}</div>
          <div className="stat-sub">人次</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">未体检人员</div>
          <div className="stat-value" style={{ color: '#d54941' }}>{stats?.noHealthCount ?? '-'}</div>
          <div className="stat-sub" style={{ color: '#d54941' }}>需关注</div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>近7天进场趋势</h3>
          {stats?.trend && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={v => v.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0052d9" radius={[4, 4, 0, 0]} name="进场人数" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="chart-card">
          <h3>班组分布</h3>
          {stats?.teamDistribution && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.teamDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="team" width={70} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2ba471" radius={[0, 4, 4, 0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 人员列表 */}
      <div className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <span style={{ fontSize: 14, fontWeight: 600 }}>人员列表</span>
            <span style={{ fontSize: 12, color: '#999' }}>共 {total} 条记录</span>
          </div>
          <div className="toolbar-right">
            <Input
              placeholder="搜索姓名/身份证号/手机号"
              value={search}
              onChange={v => { setSearch(v); setPage(1); }}
              style={{ width: 220 }}
              clearable
            />
            <Select
              placeholder="全部班组"
              value={teamFilter}
              onChange={v => { setTeamFilter(v); setPage(1); }}
              options={teamOptions}
              clearable
              style={{ width: 130 }}
            />
            <Button theme="primary" variant="outline" onClick={handleExport}>
              导出Excel
            </Button>
          </div>
        </div>

        <Table
          data={workerList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (pageInfo) => setPage(pageInfo.current)
          }}
          hover
          stripe
          size="medium"
        />
      </div>

      {/* 详情弹窗 */}
      <Dialog
        header="人员详情"
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loading size="large" /></div>
        ) : detailData && (
          <div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">姓名</div>
                <div className="detail-value">{detailData.name}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">身份证号</div>
                <div className="detail-value">{detailData.id_number}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">班组</div>
                <div className="detail-value">{detailData.team}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">手机号</div>
                <div className="detail-value">{detailData.phone}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">进场时间</div>
                <div className="detail-value">{detailData.entry_time}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">有效期至</div>
                <div className="detail-value">{detailData.valid_until || '永久'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">定位坐标</div>
                <div className="detail-value">
                  {detailData.latitude && detailData.longitude
                    ? `${detailData.latitude.toFixed(6)}, ${detailData.longitude.toFixed(6)}`
                    : '未获取'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">体检状态</div>
                <div className="detail-value">
                  <Tag theme={detailData.health_check ? 'success' : 'danger'} variant="light" size="small">
                    {detailData.health_check ? '已体检' : '未体检'}
                  </Tag>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">安全确认</div>
                <div className="detail-value">
                  <Tag theme={detailData.safety_confirmed ? 'success' : 'warning'} variant="light" size="small">
                    {detailData.safety_confirmed ? '已确认' : '未确认'}
                  </Tag>
                </div>
              </div>
            </div>

            {/* 照片 */}
            <div className="detail-photos">
              <div className="photo-block">
                <div className="photo-label">身份证照片</div>
                {detailData.id_card_photo ? (
                  <img src={detailData.id_card_photo} alt="身份证" style={{ cursor: 'pointer', maxWidth: '100%' }} onClick={() => openPhotoDialog(detailData.id_card_photo, '身份证照片')} />
                ) : (
                  <div className="upload-area" style={{ padding: 20, color: '#999', fontSize: 13 }}>未上传</div>
                )}
              </div>
              <div className="photo-block">
                <div className="photo-label">人脸照片</div>
                {detailData.face_photo ? (
                  <img src={detailData.face_photo} alt="人脸照片" style={{ cursor: 'pointer', maxWidth: '100%' }} onClick={() => openPhotoDialog(detailData.face_photo, '人脸照片')} />
                ) : (
                  <div className="upload-area" style={{ padding: 20, color: '#999', fontSize: 13 }}>未上传</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* 图片放大弹窗 */}
      <Dialog
        header={currentPhoto.title}
        visible={photoDialogVisible}
        onClose={() => setPhotoDialogVisible(false)}
        width={800}
        footer={null}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <img
            src={currentPhoto.url}
            alt={currentPhoto.title}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      </Dialog>
    </div>
  );
}