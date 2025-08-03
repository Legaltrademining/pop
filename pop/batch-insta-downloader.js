const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Make sure downloads/ folder exists
const downloadsDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
  console.log(`✅ Created folder: ${downloadsDir}`);
}

async function downloadMediaFromUrl(url, index) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    console.log(`\n🔗 Opening: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('script[type="application/ld+json"]', { timeout: 10000 });

    const jsonData = await page.$$eval('script[type="application/ld+json"]', scripts => {
      return scripts
        .map(script => {
          try {
            return JSON.parse(script.innerText);
          } catch {
            return null;
          }
        })
        .find(data => data && (data['@type'] === 'ImageObject' || data['@type'] === 'VideoObject'));
    });

    if (!jsonData || !jsonData.contentUrl) {
      console.log('❌ Could not extract media URL.');
      return;
    }

    const caption = jsonData.caption || 'No caption';
    const mediaUrl = jsonData.contentUrl;
    const ext = mediaUrl.includes('.mp4') ? '.mp4' : '.jpg';

    const fileBase = `post_${index}`;
    const mediaPath = path.join(downloadsDir, `${fileBase}${ext}`);
    const captionPath = path.join(downloadsDir, `${fileBase}.txt`);

    // Save caption
    fs.writeFileSync(captionPath, caption, 'utf-8');
    console.log(`📝 Saved caption: ${captionPath}`);

    // Download media
    const writer = fs.createWriteStream(mediaPath);
    const response = await axios({
      url: mediaUrl,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`📥 Downloaded media to: ${mediaPath}`);
  } catch (err) {
    console.error(`❌ Error for URL ${url}:`, err.message);
  } finally {
    await browser.close();
  }
}

// 🔗 List of public Instagram post or reel URLs
const urls = [
  'https://www.instagram.com/reel/COkNVpPHD1n/',
  'https://www.instagram.com/p/Ce3xR35MzKt/', // Add as many as you like
];

(async () => {
  for (let i = 0; i < urls.length; i++) {
    await downloadMediaFromUrl(urls[i], i + 1);
  }
})();
