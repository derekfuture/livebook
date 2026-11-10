// 每本书对应的课本：版本写清楚，用户才能下到同一份 PDF（页数对上，活页的位置才对得上）。
// 来源：国家中小学智慧教育平台的教材目录（2026-11-04 核对）；页数按平台上的 PDF 实测（八下、化学九下要登录才能下，按本地同版 PDF）。
const SMARTEDU = (id) => `https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId=${id}&catalogType=tchMaterial&subCatalog=tchMaterial`;
const PEP = '人民教育出版社';
const REV = '根据 2022 年版课程标准修订';
const YEAR = '2024 年新版（封面印有“国家教材委员会专家委员会审核通过 2024”）';

export const EDITIONS = {
  'wuli-8s': { name: '义务教育教科书·物理 八年级 上册', press: PEP, rev: REV, year: YEAR, pages: 170, isbn: '978-7-107-38258-1', url: SMARTEDU('e5618f17-c06e-4c4c-944e-0ee8ced25391'), login: false },
  'wuli-8x': { name: '义务教育教科书·物理 八年级 下册', press: PEP, rev: REV, year: YEAR, pages: 131, isbn: '', url: SMARTEDU('aec6de38-33d2-417a-bbdb-e39154a046a9'), login: true },
  'wuli-9': { name: '义务教育教科书·物理 九年级 全一册', press: PEP, rev: REV, year: YEAR, pages: 218, isbn: '978-7-107-38956-6', url: SMARTEDU('ed5f6a59-0cc5-47e9-adc3-0033711700ea'), login: false },
  'huaxue-9s': { name: '义务教育教科书·化学 九年级 上册', press: PEP, rev: REV, year: YEAR, pages: 199, isbn: '978-7-107-38260-4', url: SMARTEDU('8c419b19-b3a9-4dbf-a8b4-546b7d337528'), login: false },
  'huaxue-9x': { name: '义务教育教科书·化学 九年级 下册', press: PEP, rev: REV, year: YEAR, pages: 127, isbn: '', url: SMARTEDU('1998204c-f017-4f49-9000-0ba0b93d2a4d'), login: true },
  'dili-bx2': { name: '普通高中教科书·地理 必修 第二册', press: PEP, rev: '依据《普通高中地理课程标准（2017 年版）》编写', year: '2019 年版', short: '2019 年版', pages: 134, isbn: '', url: '', login: false },
  'dili-bx1': { name: '普通高中教科书·地理 必修 第一册', press: PEP, rev: '依据《普通高中地理课程标准（2017 年版）》编写', year: '2019 年版', short: '2019 年版', pages: 134, isbn: '', url: '', login: false },
  'dili-xb1': { name: '普通高中教科书·地理 选择性必修1 自然地理基础', press: PEP, rev: '依据《普通高中地理课程标准（2017 年版）》编写', year: '2019 年版（2019 年经国家教材委员会专家委员会审核通过）', short: '2019 年版', pages: 106, isbn: '', url: '', login: false },
  'dili-xb2': { name: '普通高中教科书·地理 选择性必修2 区域发展', press: PEP, rev: '依据《普通高中地理课程标准（2017 年版）》编写', year: '2019 年版（2019 年经国家教材委员会专家委员会审核通过）', short: '2019 年版', pages: 102, isbn: '', url: '', login: false },
};

/** 导入提示、下载离线版里写的书名：人教版《物理 八年级下册》 */
export const bookName = (id, title) => `人教版《${(EDITIONS[id]?.name ?? title).replace(/^(义务教育|普通高中)教科书·/, '').replace(/ (上册|下册|全一册)$/, '$1')}》`;
