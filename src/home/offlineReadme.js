import { offlineHtmlName } from './offlineSubjects.js';

// 打开说明用 UTF-8 BOM，方便 Windows 记事本识别中文。
function readme(open) {
  return [
    '\uFEFF活页课本离线版', '',
    '1. 将整个压缩包解压到电脑或 U 盘，不要直接在压缩包内打开。',
    `2. ${open}`,
    '3. 微信、QQ、网盘里的文件预览不能运行实验，请先下载到电脑。',
    '4. 如果有 books 文件夹，请与 HTML 放在一起，转发时发送整个压缩包。',
    '5. 原书页需要对应版本的教材 PDF；没有 PDF 也能使用实验。',
    '6. 这是下载时的内容快照，更新后请回网站重新下载：https://livebook.derekfuture.club/',
    '',
  ].join('\r\n');
}

export const OFFLINE_README = readme('右键“活页课本.html”，选择“打开方式”→新版 Microsoft Edge 或 Google Chrome。');
export const offlinePackReadme = (subjects) => readme([
  '每个科目一个 HTML 文件，双击对应的文件就能打开，不用联网。',
  ...subjects.map((subject) => `   双击“${offlineHtmlName(subject)}”打开${subject.label}。`),
  '   可以右键文件，选择“打开方式”→新版 Microsoft Edge 或 Google Chrome。',
].join('\r\n'));
