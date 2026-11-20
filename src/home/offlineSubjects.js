export const OFFLINE_SUBJECTS = [
  { slug: 'physics', label: '物理', htmlMB: 13, zipMB: 7 },
  { slug: 'chemistry', label: '化学', htmlMB: 15, zipMB: 8 },
  { slug: 'geography', label: '地理', htmlMB: 21, zipMB: 13 },
];

export const offlinePath = (subject, extension) => `/offline-${subject.slug}.${extension}`;
export const offlineFolder = (subject) => `活页课本-${subject.label}`;
export const offlineHtmlName = (subject) => `${offlineFolder(subject)}.html`;
export const offlineZipName = (...subjects) => `活页课本（${subjects.map(({ label }) => label).join('、')}离线版）.zip`;
