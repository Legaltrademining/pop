const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function downloadFromInstagram(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    console.log(`Opening: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for JSON-LD metadata
    await page.waitForSelector('script[type="application/ld+json"]');

    // Extract data from JSON-LD
    const jsonData = await page.$$eval('script[type="application/ld+json"]', scripts => {
      return scripts.map(script => JSON.parse(script.innerText)).find(data => data && data['@type'] === 'ImageObject' || data['@type'] === 'VideoObject');
    });

    const caption = jsonData.caption || 'No caption';
    const mediaUrl = jsonData.contentUrl;

    console.log('Caption:', caption);
    console.log('Media URL:', mediaUrl);

    // Download media file
    const ext = mediaUrl.includes('.mp4') ? '.mp4' : '.jpg';
    const filePath = path.resolve(__dirname, 'downloads', `insta_media${ext}`);

    const writer = fs.createWriteStream(filePath);
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

    console.log(`Downloaded to: ${filePath}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Replace with a public Instagram post/Reel URL
const postUrl = 'https://www.instagram.com/reel/COkNVpPHD1n/'; // Example
downloadFromInstagram(postUrl);
