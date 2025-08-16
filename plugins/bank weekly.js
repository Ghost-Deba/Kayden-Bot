const fs = require('fs');
const path = require('path');
const similarity = require('similarity');

const threshold = 0.72;
const tekaFile = path.join(process.cwd(), 'tekateki.json');

// تحميل أو إنشاء ملف JSON للأسئلة
function loadTeka() {
  if (!fs.existsSync(tekaFile)) {
    fs.writeFileSync(tekaFile, JSON.stringify({ current: {}, scores: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(tekaFile));
}

function saveTeka(data) {
  fs.writeFileSync(tekaFile, JSON.stringify(data, null, 2));
}

module.exports = {
  command: 'عين',
  description: 'إرسال لغز كصورة ومتابعة الإجابة',
  category: 'tools',

  async execute(sock, msg, args = []) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.participant || msg.key.remoteJid;

    let data = loadTeka();

    // الأسئلة (ممكن تخليها في ملف خارجي)
    const questions = [
      {
        question: 'https://i.imgur.com/nl4uZfh.png', // صورة اللغز
        answer: 'القمر',
        points: 50,
      },
      {
        question: 'https://i.imgur.com/4AiXzf8.jpeg',
        answer: 'الشمس',
        points: 40,
      }
    ];

    // اختيار عشوائي
    const teka = questions[Math.floor(Math.random() * questions.length)];

    // تخزين حالة الغز الحالي
    data.current[chatId] = {
      answer: teka.answer,
      points: teka.points,
      id: msg.key.id,
    };
    saveTeka(data);

    // إرسال الصورة
    return sock.sendMessage(chatId, {
      image: { url: teka.question },
      caption: `������ *جاوب على اللغز!* (النقاط: ${teka.points})`
    }, { quoted: msg });
  },

  // المراقبة قبل أي رسالة (نفس فكرة before)
  async before(sock, m) {
    if (!m.message?.conversation) return;
    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.participant || m.key.remoteJid;

    let data = loadTeka();
    if (!data.current[chatId]) return;

    const teka = data.current[chatId];
    const text = m.message.conversation.toLowerCase().trim();

    if (text === teka.answer.toLowerCase()) {
      // إضافة النقاط
      data.scores[sender] = (data.scores[sender] || 0) + teka.points;

      delete data.current[chatId];
      saveTeka(data);

      return sock.sendMessage(chatId, {
        text: `✅ اجابة صحيحة!\n+${teka.points} نقطة ������`
      }, { quoted: m });
    } else if (similarity(text, teka.answer.toLowerCase()) >= threshold) {
      return sock.sendMessage(chatId, {
        text: `������ قربت من الاجابة!`
      }, { quoted: m });
    } else {
      return sock.sendMessage(chatId, {
        text: `❌ اجابة غلط جرب تاني`
      }, { quoted: m });
    }
  }
};