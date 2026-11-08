import { h } from './Panel.js';

const icon = (paths) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const chat = icon('<path d="M20 11a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 20 11Z"/><path d="M8 9h7M8 13h5"/>');


const FEEDBACK_FORM = 'https://derekfuture.feishu.cn/share/base/form/shrcnJhWu84wwE0XabiAMZUMBXc';

export function feedbackUrl(context = {}) {
  const url = new URL(FEEDBACK_FORM);
  const source = context.lesson
    ? [context.title, context.where, context.lesson].filter(Boolean).join(' · ')
    : '首页反馈';
  url.searchParams.set('prefill_反馈来源', source);
  url.searchParams.set('hide_反馈来源', '1');
  return url.href;
}

export function feedbackButton(context = {}) {
  return h('button', {
    class: 'feedback-entry',
    title: '打开反馈问卷（新窗口）',
    onclick: () => window.open(feedbackUrl(context), '_blank', 'noopener,noreferrer'),
  }, h('span', { html: chat }), h('span', {}, context.lesson ? '反馈' : '反馈与建议'));
}
export function lessonCommunity(context) {
  return h('div', {class:'lesson-community'},feedbackButton(context));
}
