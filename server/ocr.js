/**
 * 百度OCR身份证识别
 * 使用百度智能云API：https://cloud.baidu.com/doc/OCR/s/dk3iqnq51
 *
 * 使用前请设置环境变量：
 *   BAIDU_OCR_API_KEY     - 百度OCR应用的API Key
 *   BAIDU_OCR_SECRET_KEY  - 百度OCR应用的Secret Key
 *
 * 免费额度：1000次/月
 */

const fs = require('fs');
const https = require('https');

let accessToken = null;
let tokenExpireTime = 0;

// 获取百度API access_token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpireTime) {
      return resolve(accessToken);
    }

    const apiKey = process.env.BAIDU_OCR_API_KEY;
    const secretKey = process.env.BAIDU_OCR_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return reject(new Error('百度OCR API Key未配置，请设置环境变量 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY'));
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            accessToken = result.access_token;
            tokenExpireTime = Date.now() + (result.expires_in - 60) * 1000;
            resolve(accessToken);
          } else {
            reject(new Error('获取百度OCR token失败: ' + JSON.stringify(result)));
          }
        } catch (e) {
          reject(new Error('解析百度OCR token响应失败'));
        }
      });
    }).on('error', reject);
  });
}

// 身份证识别
function recognizeIdCard(imagePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken();
      const imageBase64 = fs.readFileSync(imagePath).toString('base64');

      const postData = new URLSearchParams({
        id_card_side: 'front',
        image: imageBase64,
        detect_risk: 'true'
      }).toString();

      const options = {
        hostname: 'aip.baidubce.com',
        path: `/rest/2.0/ocr/v1/idcard?access_token=${token}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.words_result) {
              resolve({
                name: result.words_result.姓名?.words || '',
                id_number: result.words_result.公民身份号码?.words || '',
                gender: result.words_result.性别?.words || '',
                nation: result.words_result.民族?.words || '',
                birthday: result.words_result.出生?.words || '',
                address: result.words_result.住址?.words || ''
              });
            } else if (result.error_msg) {
              reject(new Error(result.error_msg));
            } else {
              reject(new Error('身份证识别失败'));
            }
          } catch (e) {
            reject(new Error('解析OCR结果失败'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { recognizeIdCard };