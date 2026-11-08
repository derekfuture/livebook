import { h } from './Panel.js';
import { openFeedback } from './Feedback.js';

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
    title: '反馈与建议',
    onclick: () => location.protocol === 'file:' ? window.open(feedbackUrl(context), '_blank', 'noopener,noreferrer') : openFeedback(context),
  }, h('span', { html: chat }), h('span', {}, context.lesson ? '反馈' : '反馈与建议'));
}
export function lessonCommunity(context) {
  return h('div', {class:'lesson-community'},feedbackButton(context));
}

// GitHub mark from github.com/primer/octicons (mark-github-16).
export function githubButton() {
  return h('a', { class: 'github-entry', href: 'https://github.com/derekfuture/livebook', target: '_blank', rel: 'noopener noreferrer', title: '查看 GitHub 项目（新窗口）' },
    h('span', { html: '<svg aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656"/></svg>' }), h('span', {}, 'GitHub'));
}
