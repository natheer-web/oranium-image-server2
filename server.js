const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve generated images publicly at /images/filename.png
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use('/images', express.static(imagesDir));

function buildHtml({ line1, line2, line3, line4 }) {
  return `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; padding: 0; }
    .canvas {
      width: 1080px;
      height: 1080px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-sizing: border-box;
      padding: 80px;
    }
    .heart { position: absolute; top: 220px; left: 260px; font-size: 42px; }
    .lines { display: flex; flex-direction: column; align-items: center; gap: 55px; }
    .line {
      font-family: 'Aref Ruqaa', serif;
      font-weight: 700;
      font-size: 64px;
      color: #1a1a1a;
      text-align: center;
      white-space: nowrap;
    }
  </style>
  </head>
  <body>
    <div class="canvas">
      <div class="heart">&#10084;&#65039;</div>
      <div class="lines">
        <div class="line">${line1 || ''}</div>
        <div class="line">${line2 || ''}</div>
        <div class="line">${line3 || ''}</div>
        <div class="line">${line4 || ''}</div>
      </div>
    </div>
  </body>
  </html>`;
}

app.post('/generate', async (req, res) => {
  try {
    const { line1, line2, line3, line4 } = req.body;
    const html = buildHtml({ line1, line2, line3, line4 });

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const filename = `dua-${Date.now()}.png`;
    const filepath = path.join(imagesDir, filename);
    await page.screenshot({ path: filepath, type: 'png' });
    await browser.close();

    // Build the full public URL using the request's own host
    const publicUrl = `${req.protocol}://${req.get('host')}/images/${filename}`;

    res.json({ url: publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Dua image server is running. POST to /generate with {line1, line2, line3, line4}');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
