import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Radio, DatePicker, Checkbox, MessagePlugin, Loading, Tag } from 'tdesign-react';
import { ocrIdCard, uploadFace, submitRegister, getSafetyRules } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 表单数据
  const [idCardPhoto, setIdCardPhoto] = useState('');
  const [idCardPreview, setIdCardPreview] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [facePhoto, setFacePhoto] = useState('');
  const [facePreview, setFacePreview] = useState('');
  const [team, setTeam] = useState('');
  const [phone, setPhone] = useState('');
  const [healthCheck, setHealthCheck] = useState(null);
  const [validUntil, setValidUntil] = useState('');
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [safetyRules, setSafetyRules] = useState([]);

  // 提交成功信息
  const [submitTime, setSubmitTime] = useState('');

  // 定位信息
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const idCardInputRef = useRef(null);
  const faceInputRef = useRef(null);

  // 加载安全须知
  useState(() => {
    getSafetyRules().then(res => setSafetyRules(res.data.rules)).catch(() => {
      setSafetyRules([
        {
          title: '一、总则',
          content: '为保障临时作业人员（含外包、临时工、短期施工人员、设备安装调试人员等）人身安全，依据《安全生产法》《建设工程安全生产管理条例》，特制定本须知。所有临时作业人员必须先培训、后上岗，认真阅读并签署本须知后方可进入现场作业。'
        },
        {
          title: '二、入场基本要求',
          content: '1. 未满18周岁、患有高血压、心脏病、癫痫病、恐高症等禁忌症及酒后、服药影响安全状态者，严禁入场作业。\n2. 特种作业人员必须持有效特种作业操作证原件上岗，严禁无证或超范围作业。\n3. 必须在批准的作业时间和作业区域内活动，严禁擅自进入未授权的危险区域（基坑、塔吊半径、脚手架拆除区、高压带电区等）。'
        }
      ]);
    });
  });

  // 处理身份证上传
  const handleIdCardUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setIdCardPreview(preview);
    setIdCardPhoto('');

    setLoading(true);
    try {
      const res = await ocrIdCard(file);
      setOcrResult(res.data);
      setName(res.data.name || '');
      setIdNumber(res.data.id_number || '');
      MessagePlugin.success('身份证识别成功');
    } catch (err) {
      MessagePlugin.warning('身份证识别失败，请手动填写信息');
      setOcrResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 处理人脸拍照
  const handleFaceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setFacePreview(preview);

    setLoading(true);
    try {
      const res = await uploadFace(file);
      setFacePhoto(res.data.photo);
      MessagePlugin.success('人脸照片上传成功');
    } catch (err) {
      MessagePlugin.error('人脸照片上传失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取GPS定位
  const getLocation = () => {
    if (!navigator.geolocation) {
      MessagePlugin.warning('您的浏览器不支持定位功能');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocating(false);
        MessagePlugin.success('定位成功');
      },
      (err) => {
        setLocating(false);
        let msg = '定位失败';
        if (err.code === 1) msg = '定位被拒绝，请在浏览器设置中允许定位权限';
        else if (err.code === 2) msg = '无法获取定位信息';
        else if (err.code === 3) msg = '定位超时';
        MessagePlugin.warning(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 进入步骤2时自动获取定位
  useEffect(() => {
    if (step === 2 && !location) {
      getLocation();
    }
  }, [step]);

  // 提交登记
  const handleSubmit = async () => {
    if (!name || !idNumber) {
      MessagePlugin.warning('请先完成身份证识别或手动填写姓名和身份证号');
      return;
    }
    if (!team) {
      MessagePlugin.warning('请填写班组');
      return;
    }
    if (!phone) {
      MessagePlugin.warning('请填写手机号');
      return;
    }
    if (healthCheck === null) {
      MessagePlugin.warning('请选择是否已体检');
      return;
    }
    if (!safetyConfirmed) {
      MessagePlugin.warning('请确认安全须知');
      return;
    }

    setLoading(true);
    try {
      await submitRegister({
        name,
        id_number: idNumber,
        id_card_photo: idCardPhoto || null,
        face_photo: facePhoto || null,
        team,
        phone,
        health_check: healthCheck,
        safety_confirmed: safetyConfirmed,
        valid_until: validUntil || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_address: location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : null
      });
      MessagePlugin.success('登记成功！');
      const now = new Date();
      setSubmitTime(now.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
      setStep(4);
    } catch (err) {
      MessagePlugin.error(err.response?.data?.error || '登记失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['身份认证', '填写信息', '安全确认'];

  // 重置表单，登记新人员
  const handleNewRegister = () => {
    setStep(1);
    setName(''); setIdNumber(''); setTeam(''); setPhone('');
    setHealthCheck(null); setValidUntil(''); setSafetyConfirmed(false);
    setOcrResult(null); setIdCardPreview(''); setFacePreview('');
    setIdCardPhoto(''); setFacePhoto('');
    setSubmitTime('');
  };

  return (
    <div className="register-container">
      <Loading loading={loading} fullscreen />

      {/* 步骤条 */}
      <div className="register-steps">
        {steps.map((s, i) => (
          <div key={i} className={`register-step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
            <div className="step-dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* 步骤1：身份认证 */}
      {step === 1 && (
        <div className="register-body">
          <div className="section-title">第一步：上传身份证</div>
          <div className="upload-area" onClick={() => idCardInputRef.current?.click()}>
            <div className="upload-icon">📷</div>
            <div className="upload-text">点击拍照或上传身份证正面</div>
            <div className="upload-hint">系统自动识别姓名、身份证号</div>
          </div>
          <input ref={idCardInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIdCardUpload} />

          {idCardPreview && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <img src={idCardPreview} alt="身份证预览" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #f0f0f0' }} />
            </div>
          )}

          {ocrResult && (
            <div className="ocr-result">
              <div className="ocr-label">识别结果（自动填充）</div>
              <div className="ocr-field"><strong>姓名：</strong>{ocrResult.name}</div>
              <div className="ocr-field"><strong>身份证号：</strong>{ocrResult.id_number}</div>
            </div>
          )}

          {!ocrResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>手动填写</div>
              <Input placeholder="姓名" value={name} onChange={setName} style={{ marginBottom: 12 }} />
              <Input placeholder="身份证号" value={idNumber} onChange={setIdNumber} />
            </div>
          )}

          {/* 人脸拍照 */}
          <div style={{ marginTop: 24 }}>
            <div className="section-title">人脸照片采集</div>
            <div className="upload-area" onClick={() => faceInputRef.current?.click()}>
              <div className="upload-icon">🤳</div>
              <div className="upload-text">点击拍摄人脸照片</div>
            </div>
            <input ref={faceInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFaceUpload} />
            {facePreview && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <img src={facePreview} alt="人脸照片" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #f0f0f0' }} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button theme="primary" block onClick={() => setStep(2)}>
              下一步
            </Button>
          </div>
        </div>
      )}

      {/* 步骤2：填写信息 */}
      {step === 2 && (
        <div className="register-body">
          <div className="section-title">第二步：填写信息</div>

          <div style={{ marginBottom: 16 }}>
            <div className="detail-label">班组</div>
            <Input placeholder="如：钢筋班 / 木工班 / 水电工" value={team} onChange={setTeam} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="detail-label">手机号</div>
            <Input placeholder="请输入手机号" value={phone} onChange={setPhone} maxlength={11} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="detail-label">是否已体检</div>
            <Radio.Group value={healthCheck} onChange={setHealthCheck}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="detail-label">进场有效期</div>
            <DatePicker
              placeholder="请选择有效期截止日期"
              value={validUntil}
              onChange={setValidUntil}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="detail-label">定位信息</div>
            {locating ? (
              <div style={{ color: '#0052d9', fontSize: 13 }}>正在获取定位...</div>
            ) : location ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag theme="success" variant="light" size="small">已定位</Tag>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                <Button size="small" variant="text" onClick={getLocation}>重新定位</Button>
              </div>
            ) : (
              <Button size="small" variant="outline" onClick={getLocation}>
                获取定位
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button theme="default" onClick={() => setStep(1)} style={{ flex: 1 }}>上一步</Button>
            <Button theme="primary" onClick={() => setStep(3)} style={{ flex: 1 }}>下一步</Button>
          </div>
        </div>
      )}

      {/* 步骤3：安全确认 */}
      {step === 3 && (
        <div className="register-body">
          <div className="section-title">第三步：安全确认</div>

          <div className="safety-notice" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <div className="safety-title">⚠ 安全须知</div>
            {safetyRules.map((rule, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div className="safety-item" style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>{rule.title}</div>
                <div className="safety-item" style={{ whiteSpace: 'pre-line' }}>{rule.content}</div>
              </div>
            ))}
          </div>

          <Checkbox checked={safetyConfirmed} onChange={setSafetyConfirmed}>
            本人已阅读并承诺遵守以上安全规定，如有违反愿承担相应责任
          </Checkbox>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button theme="default" onClick={() => setStep(2)} style={{ flex: 1 }}>上一步</Button>
            <Button theme="primary" onClick={handleSubmit} style={{ flex: 1, background: '#2ba471', borderColor: '#2ba471' }}>
              提交登记
            </Button>
          </div>
        </div>
      )}

      {/* 步骤4：登记成功 */}
      {step === 4 && (
        <div className="register-body" style={{ textAlign: 'center' }}>
          <div style={{ marginTop: 40, marginBottom: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#2ba471',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', fontSize: 40, color: '#fff', fontWeight: 'bold'
            }}>✓</div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: '#2ba471', marginBottom: 8 }}>
            登记成功
          </div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
            您已成功完成进场登记
          </div>

          <div style={{
            background: '#f6ffed', borderRadius: 8, padding: 20, marginBottom: 32,
            border: '1px solid #b7eb8f'
          }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>提交时间</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{submitTime}</div>
          </div>

          <Button theme="primary" size="large" block onClick={handleNewRegister}
            style={{ background: '#0052d9', borderColor: '#0052d9' }}>
            登记新人员
          </Button>
        </div>
      )}
    </div>
  );
}