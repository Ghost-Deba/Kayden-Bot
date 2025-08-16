const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const webp = require('node-webpmux');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function addExif(webpSticker, packname, author) {
  const img = new webp.Image();
  const stickerPackId = crypto.randomBytes(32).toString('hex');
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: ['✨', '❀', '������']
  };
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  await img.load(webpSticker);
  img.exif = exif;
  return await img.save(null);
}

module.exports = {
  status: "on",
  name: 'Sticker WM',
  command: ['حقوق'],
  category: 'sticker',
  description: 'تغيير العلامة المائية لملصق',
  hidden: false,
  version: '1.0',

  async execute(sock, msg) {
    try {
      const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      const args = body.trim().split(' ').slice(1).join(' ').split('|').map(v => v.trim());
      let [packname, author] = args;
      if (!packname) packname = '✦ Kayden ✦';
      if (!author) author = '© Ghost ✧';

      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.stickerMessage) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: '✿ الرجاء الرد على ملصق لتغيير العلامة المائية (WM)'
        }, { quoted: msg });
      }

      // تنزيل الملصق كـ Buffer
      const stickerBuffer = await downloadMediaMessage(
        { message: quotedMsg },
        'buffer',
        {}
      );

      // تعديل الـ WM
      const newSticker = await addExif(stickerBuffer, packname, author);

      // إرسال الملصق المعدل
      await sock.sendMessage(msg.key.remoteJid, {
        sticker: newSticker
      }, { quoted: msg });

    } catch (error) {
      console.error('❌ Sticker WM Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء تعديل العلامة المائية.' }, { quoted: msg });
    }
  }
};