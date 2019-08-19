const axios = require('axios')
const puppeteer = require("puppeteer-extra")
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth())

let browser = null;

async function solve() {
    browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });

    /* GOTO */

    let frames = await page.frames();

    const recaptchaFrame = frames.find(frame => frame.url().includes('api2/anchor'));
    const checkbox = await recaptchaFrame.$('#recaptcha-anchor');

    const value = await recaptchaFrame.evaluate((obj) => {
        return obj.getAttribute('aria-checked');
    }, checkbox);
    await checkbox.click();

    await this.sleep(2000);

    const challengeFrame = frames.find(frame => frame.url().includes('api2/bframe'));

    const audioButton = await challengeFrame.waitForSelector('#recaptcha-audio-button', { visible: true, timeout: 0 }).then(() => {
        return challengeFrame.$('#recaptcha-audio-button');
    });
    await audioButton.click();

    await this.sleep(5000);

    let audioCaptchaURL = await challengeFrame.evaluate(() => {
        return document.querySelector('a').href;
    });

    await downloadMp3(audioCaptchaURL, 'audioCaptcha.mp3');
    let answer = await recognizeSpeech('audioCaptcha.mp3')

    await challengeFrame.type('#audio-response', answer);

    await this.sleep(5000);
    await challengeFrame.click('#recaptcha-verify-button');

    await this.sleep(2500);
    await page.click('button.js-signup-button');
}

async function downloadMp3(url, path) {
    const res = await axios.request({
        responseType: 'arraybuffer',
        url: url,
        method: 'get',
        headers: {
            'Content-Type': 'audio/mpeg',
        },
    }).then((result) => {
        const outputFilename = path;
        fs.writeFileSync(outputFilename, result.data);
        return outputFilename;
    });
    return res;
}

async function recognizeSpeech(path) {
    let payload = new FormData();
    payload.append('audio', fs.createReadStream(path));
    let res = await axios.post('https://api.wit.ai/speech', payload, {
        headers: {
            'Authorization': 'Bearer <auth_token>',
            'Content-Type': 'audio/mpeg3'
        },
    }).then(response => {
        return response.data._text;
    })
    return res;
}

solve();
