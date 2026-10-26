import { anonymousId, EventLogger } from './lib/logger.js';
import { shuffle, makePick, summarise, verdictTier, quizScore, efficacyMean, nutrientWarning, remainingSeconds, validateLevels } from './lib/engine.js';

const main = document.querySelector('#main');
const live = document.querySelector('#announcement');
const dialog = document.querySelector('#guide');
const dialogContent = document.querySelector('#guide-content');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let strings, levels, quiz, config, logger, state, clock, statusClock;
let phase = 'intro';
const fmt = number => new Intl.NumberFormat('zh-HK', { maximumFractionDigits: 2 }).format(number);
const t = (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), strings[key]);
const s = (key, vars) => escape(t(key, vars));
const heading = (eyebrow, title, text = '') => `<div class="screen-heading"><p class="eyebrow">${escape(eyebrow)}</p><h1 tabindex="-1">${escape(title).replaceAll('\n','<br>')}</h1>${text ? `<p class="lead">${escape(text)}</p>` : ''}</div>`;
const button = (action, label, className = 'primary', extra = '') => `<button type="button" class="${className}" data-action="${action}" ${extra}>${label}</button>`;
const steps = () => `<ol class="steps">${strings.steps.map((step, i) => `<li><span class="step-number">0${i+1}</span><div><h3>${escape(step.title)}</h3><p>${escape(step.text)}</p></div></li>`).join('')}</ol>`;

async function load(file) {
  const response = await fetch(new URL(file, import.meta.url));
  if (!response.ok) throw new Error('Could not load game data');
  return response.json();
}

function focusScreen() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  (main.querySelector('h1') || main).focus({ preventScroll: true });
}
function announce(text) { live.textContent = text; }
function resetTimers() { clearInterval(clock); clearInterval(statusClock); clock = null; statusClock = null; }

function illustration() {
  return `<div class="market-art" role="img" aria-label="${s('illustrationLabel')}">
    <span class="art-note note-top">${s('illustrationTop')} <span aria-hidden="true">✳</span></span>
    <svg class="groceries" viewBox="0 0 440 430" aria-hidden="true">
      <defs><pattern id="grid" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0H0V27" fill="none" stroke="#c9cec1" stroke-width=".7"/></pattern><filter id="shadow"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-opacity=".09"/></filter></defs>
      <circle cx="220" cy="221" r="177" fill="#e9eddf"/><circle cx="220" cy="221" r="177" fill="url(#grid)"/>
      <ellipse cx="227" cy="381" rx="142" ry="17" fill="#d6dacb"/>
      <g transform="rotate(-13 130 170)"><path d="M99 200 95 100l26-24 42 18 5 103Z" fill="#e4a353" stroke="#4d523c" stroke-width="2"/><path d="m95 100 42 17 26-23m-26 23v82m-16-123 1 28" fill="none" stroke="#4d523c" stroke-width="2"/><path d="m99 130 37 14v37l-36-12" fill="#fff3d6"/><path d="m107 143 20 8m-19 2 17 7" stroke="#a04b2b" stroke-width="3"/></g>
      <g transform="rotate(16 280 160)"><path d="m263 197 5-84q-5-18 2-30h31q7 11 2 30l5 84Z" fill="#8eab7a" stroke="#4d523c" stroke-width="2"/><rect x="269" y="75" width="32" height="12" rx="3" fill="#e7e4d5" stroke="#4d523c" stroke-width="2"/><path d="M267 132h38v43h-39" fill="#fcf5df"/><path d="M277 143h19m-19 9h13m-13 9h17" stroke="#698359" stroke-width="3"/></g>
      <g><path d="m208 225 14-103 15-5-12 115" fill="#849b51" stroke="#4d523c" stroke-width="2"/><path d="m229 151-28-26m31 8 25-29" fill="none" stroke="#4d523c" stroke-width="7"/><path d="M182 124c-29-4-34-31-14-43-2-22 27-37 43-22 14-24 48-20 54 3 28-1 42 25 23 43 0 23-30 37-48 23-15 15-45 16-58-4Z" fill="#70854e" stroke="#4d523c" stroke-width="2"/><path d="M179 103q13-11 28 0m12-26q16-8 26 7m-17 27q16-13 31-3" fill="none" stroke="#a3b679" stroke-width="4" stroke-linecap="round"/></g>
      <g transform="rotate(-10 340 263)"><path d="m319 293 3-103q13-27 31-10l8 21-5 94Z" fill="#e4a353" stroke="#4d523c" stroke-width="2"/><path d="m330 204 14 8m-15 15 14 8m-16 14 14 8m-15 13 14 8" stroke="#b06d33" stroke-width="3" stroke-linecap="round"/></g>
      <g filter="url(#shadow)"><path d="m99 190 31 183h196l22-183Z" fill="#c47a4e" stroke="#754f33" stroke-width="2"/><path d="m99 190 28 19h196l25-19" fill="#dc9a70" stroke="#754f33" stroke-width="2"/><path d="m127 209 18 164m178-164-16 164" fill="none" stroke="#a86442" stroke-width="2"/><path d="M163 218v-39c0-70 112-70 112 0v39" fill="none" stroke="#684d34" stroke-width="13"/><path d="M163 218v-39c0-70 112-70 112 0v39" fill="none" stroke="#ead2a4" stroke-width="8"/>
      <rect x="149" y="258" width="145" height="73" rx="3" fill="#fbf3df" transform="rotate(-3 221 294)"/>
      <text x="222" y="290" text-anchor="middle" font-size="24" font-weight="800" font-family="sans-serif" fill="#454735">${s('bagBrand')}</text><text x="222" y="312" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#65624c">${s('bagCaption')}</text></g>
      <g transform="rotate(10 340 330)"><path d="M300 270h91v107l-7-4-7 4-8-4-7 4-8-4-8 4-8-4-8 4-8-4-7 4Z" fill="#fffdf5" stroke="#b6b8a4"/><path d="M314 292h62m-62 9h62m-62 16h34m11 0h17m-62 12h34m11 0h17m-62 16h62" stroke="#7d8068" stroke-width="2" stroke-dasharray="2 2"/><path d="m340 354 5 5 11-11" fill="none" stroke="#76915d" stroke-width="3"/></g>
      <path d="m70 251 8 9 16-19m273-102 8-10m7 20 13 1M85 90l-4-10m-8 19-10-3" fill="none" stroke="#ab5a36" stroke-width="3" stroke-linecap="round"/>
    </svg><span class="art-note note-bottom">✓ ${s('illustrationLabel')}</span></div>`;
}

function renderIntro() {
  resetTimers(); phase = 'intro'; main.className = 'intro';
  main.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="little-dot"></span>${s('eyebrow')}</p><h1 tabindex="-1">${s('heroTitle')}<br><span class="accent">${s('heroAccent')}</span></h1><p class="hero-text">${s('heroText')}</p><div class="stats">${strings.stats.map(stat => `<div><strong>${escape(stat.value)}</strong><span>${escape(stat.label)}</span></div>`).join('')}</div><p class="consent-short" id="consent-short">${s('consentShort')}</p>${button('start',s('start'),'primary','aria-describedby="consent-short privacy-consent"')}<p class="flow-note">${s('flowNote')}</p>${button('start-private',s('playPrivate'),'text-button')}</div>${illustration()}</section><section class="how"><div><p class="eyebrow">${s('howEyebrow')}</p><h2>${s('howTitle')}</h2></div>${steps()}</section><section class="consent-note"><span class="consent-icon" aria-hidden="true">◎</span><div><h2>${s('consentLabel')}</h2><p id="privacy-consent">${s('consent')}</p></div></section>`;
}

function start(consent) {
  logger?.destroy();
  let storage;
  try { storage = localStorage; } catch { storage = null; }
  logger = new EventLogger(config, { storage });
  state = { sessionId: anonymousId(), consent, startedAt: new Date().toISOString(), picks: [], pre: null, post: null, levelIndex: 0, productOrders: levels.map(l => shuffle(l.products.map((_, i) => i))) };
  logger.start(state.sessionId, consent);
  logger.track('session_start', { deviceClass: matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop' });
  startQuiz('pre');
}

function startQuiz(kind) {
  resetTimers(); phase = `${kind}-quiz`;
  const knowledge = kind === 'post' ? shuffle(quiz.knowledge) : [...quiz.knowledge];
  state.quiz = { kind, index: 0, answers: {}, order: [...knowledge.map(q => ({ ...q, type: 'knowledge', options: kind === 'post' ? shuffle(q.options) : q.options })), ...quiz.efficacy.map(q => ({ ...q, type: 'efficacy', options: strings.likert.map((text, i) => ({ id: String(i + 1), text })) }))] };
  renderQuiz();
}

function renderQuiz() {
  const qz = state.quiz, q = qz.order[qz.index];
  const pre = qz.kind === 'pre';
  main.className = 'narrow quiz-screen';
  main.innerHTML = `${heading(t(pre ? 'preEyebrow' : 'postEyebrow'), t(pre ? 'preTitle' : 'postTitle'), t(pre ? 'preText' : 'postText'))}<div class="quiz-progress" aria-hidden="true">${qz.order.map((_,i) => `<span class="${i <= qz.index ? 'filled' : ''}"></span>`).join('')}</div><div class="question-meta"><span>${s('questionCount',{n:qz.index + 1,total:qz.order.length})}</span><span class="pill">${s(q.type === 'knowledge' ? 'knowledge' : 'confidence')}</span></div><form id="quiz-form"><fieldset><legend>${escape(q.question)}</legend>${q.type === 'efficacy' ? `<p class="muted">${s('confidenceNote')}</p>` : ''}<div class="answer-list">${q.options.map((opt, i) => `<label class="answer-option"><input type="radio" name="answer" value="${escape(opt.id)}" ${qz.answers[q.id] === opt.id ? 'checked' : ''} required><span class="option-marker" aria-hidden="true">${q.type === 'efficacy' ? opt.id : String.fromCharCode(65 + i)}</span><span>${escape(opt.text)}</span><span class="option-check" aria-hidden="true">✓</span></label>`).join('')}</div></fieldset><div class="quiz-actions">${button('quiz-back',`← ${s('previous')}`,'secondary',qz.index ? '' : 'disabled')}<button type="submit" class="primary" ${qz.answers[q.id] ? '' : 'disabled'}>${s(qz.index === qz.order.length - 1 ? pre ? 'finishPre' : 'finishPost' : 'nextQuestion')}</button></div></form>`;
  focusScreen();
}

function finishQuiz() {
  const qz = state.quiz;
  const result = { knowledgeScore: quizScore(quiz.knowledge, qz.answers), selfEfficacy: quiz.efficacy.map(q => Number(qz.answers[q.id])), answers: { ...qz.answers } };
  state[qz.kind] = result;
  logger.track(`${qz.kind}_quiz_done`, { knowledgeScore: result.knowledgeScore, selfEfficacy: result.selfEfficacy });
  if (qz.kind === 'pre') startLevel(); else renderThanks();
}

function nutritionTable(product, index) {
  return `<div class="nutrition" id="nutrition-${index}"><h3>${s('nutrition')}</h3><p class="serving">${s('serving', { size: product.label.servingSize, n: fmt(product.label.servingsPerPack) })}</p><div class="basis-switch" role="group" aria-label="${s('nutrition')}">${['100','serving','pack'].map((basis, i) => `<button type="button" class="basis-button" data-action="basis" data-index="${index}" data-basis="${basis}" aria-pressed="${i === 0}">${i === 0 ? s(product.form === 'liquid' ? 'per100Liquid' : 'per100Solid') : s(i === 1 ? 'perServing' : 'perPack')}</button>`).join('')}</div>${table(product, '100')}<p class="ingredients"><strong>${s('ingredients')}</strong>${escape(product.ingredients)}</p><p class="table-legend">${s('legend')}</p></div>`;
}

function table(product, basis) {
  const multiplier = basis === '100' ? 1 : product.label.servingAmount / 100 * (basis === 'pack' ? product.label.servingsPerPack : 1);
  const label = basis === '100' ? t(product.form === 'liquid' ? 'per100Liquid' : 'per100Solid') : t(basis === 'pack' ? 'perPack' : 'perServing');
  return `<table><caption class="sr-only">${escape(product.name)} · ${escape(label)}</caption><thead><tr><th scope="col">${s('nutrient')}</th><th scope="col">${escape(label)}</th></tr></thead><tbody>${strings.nutritionKeys.map(n => {
    const warning = nutrientWarning(n.key, product.label[n.key], product.form);
    return `<tr class="${warning ? 'nutrient-warning' : ''}"><th scope="row">${escape(n.name)}</th><td>${fmt(product.label[n.key] * multiplier)} ${escape(n.unit)}${warning ? ` <span class="warning-icon">${s(warning)}</span>` : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function productCard(level, index, pick) {
  const product = level.products[index], selected = pick?.productIndex === index;
  return `<article class="product-card ${pick && product.isBest ? 'best-card' : ''} ${selected ? 'selected-card' : ''}" data-product="${escape(product.id)}"><div class="product-top"><div class="product-emoji" aria-hidden="true">${escape(product.emoji)}</div><div class="product-heading"><span class="product-kicker">${s('fictionTag')}</span><h2>${escape(product.name)}</h2>${product.claim ? `<span class="claim">${escape(product.claim)}</span>` : ''}</div><strong class="price"><small>HK$</small>${fmt(product.price)}</strong></div>${pick ? `<div class="choice-tags">${selected ? `<span class="pill chosen-tag">${s('selected')}</span>` : ''}${product.isBest ? `<span class="pill best-tag">${s('bestChoice')}</span>` : ''}</div><p class="why">${escape(product.why)}</p>` : ''}<details class="label-disclosure" data-label="${index}" ${pick ? 'open' : ''}><summary><span class="closed-text">${s('look')}</span><span class="open-text">${s('hide')}</span><span class="disclosure-arrow" aria-hidden="true">＋</span></summary>${nutritionTable(product,index)}</details>${!pick ? button('pick',s('pick'),'basket-button',`data-index="${index}" aria-label="${escape(product.name)}：${s('pick')}"`) : ''}</article>`;
}

function startLevel() {
  resetTimers(); phase = 'playing';
  const level = levels[state.levelIndex];
  state.levelStart = Date.now(); state.deadline = state.levelStart + level.timeSec * 1000;
  state.announced = new Set();
  renderGame();
  logger.track('level_view', { levelId: level.id });
  tick(); clock = setInterval(tick,200);
}

function renderGame() {
  const level = levels[state.levelIndex];
  const pick = state.picks[state.levelIndex];
  const summary = summarise(state.picks);
  main.className = `narrow game-screen${pick ? ' has-feedback' : ''}`;
  main.innerHTML = `<div class="game-hud"><div class="hud-top"><span class="level-count">${s('levelCount',{n:level.id})}</span><div class="hud-budget ${summary.budgetLeft < 0 ? 'over-budget' : ''}"><small>${s('budget')}</small><strong id="budget-value">HK$${fmt(summary.budgetLeft)}</strong></div><div class="hud-time" id="timer-box"><small>${s('time')}</small><strong><span id="seconds">${pick ? 0 : level.timeSec}</span><span class="seconds-unit"> ${s('seconds')}</span></strong></div></div><div class="timer-track" id="timer-track" role="progressbar" aria-label="${s('time')}" aria-valuemin="0" aria-valuemax="${level.timeSec}" aria-valuenow="${pick ? 0 : level.timeSec}"><div id="timer-fill"></div></div>${summary.budgetLeft < 0 ? `<p class="budget-warning" role="status">▲ ${s('overspent',{n:fmt(-summary.budgetLeft)})}</p>` : ''}</div><div class="game-meta"><span class="eyebrow">${escape(strings.stageNames[level.stage])} / ${escape(level.title)}</span>${button('exit',s('exit'),'quiet')}</div><section class="mission-card"><span class="family-face" aria-hidden="true">${escape(level.familyFace)}</span><div><p class="mission-label">${s('mission')}</p><h1 tabindex="-1">${escape(level.need)}</h1></div></section>${pick ? `<section class="feedback ${pick.timedOut ? 'timeout' : pick.isBest ? 'success' : ''}" aria-label="${s('tip')}"><p class="feedback-icon" aria-hidden="true">${pick.timedOut ? '⌛' : pick.isBest ? '✦' : '↗'}</p><h2>${s(pick.timedOut ? 'feedbackTimeout' : pick.isBest ? 'feedbackBest' : 'feedbackOther')}</h2><p>${pick.timedOut ? s('timeoutText',{name:level.products[pick.productIndex].name}) : escape(level.products[pick.productIndex].why)}</p><span class="score-tag">${s('levelScore',{n:pick.health})}</span><div class="tip"><strong>${s('tip')}</strong><p>${escape(level.tip)}</p></div></section>` : `<p class="choose-hint">${s('chooseHint')}</p>`}<div class="products">${state.productOrders[state.levelIndex].map(index => productCard(level,index,pick)).join('')}</div>${pick ? `<div class="next-dock">${button('next-level',s(state.levelIndex === 14 ? 'toResults' : 'nextLevel'))}</div>` : ''}`;
  focusScreen();
  if (pick) { const feedbackHeading = main.querySelector('.feedback h2'); feedbackHeading.tabIndex = -1; feedbackHeading.focus({preventScroll:true}); }
}

function tick() {
  if (phase !== 'playing') return;
  const seconds = remainingSeconds(state.deadline);
  const level = levels[state.levelIndex];
  document.querySelector('#seconds').textContent = seconds;
  const track = document.querySelector('#timer-track');
  track.setAttribute('aria-valuenow', seconds);
  track.classList.toggle('urgent', seconds <= 8);
  document.querySelector('#timer-box').classList.toggle('urgent-text', seconds <= 8);
  document.querySelector('#timer-fill').style.width = `${seconds / level.timeSec * 100}%`;
  if (seconds > 0 && seconds % 10 === 0 && !state.announced.has(seconds)) { state.announced.add(seconds); announce(t('timeAnnouncement',{n:seconds})); }
  if (!seconds) choose(Math.floor(Math.random() * level.products.length), true);
}

function choose(index, timedOut = false) {
  if (phase !== 'playing') return;
  if (!timedOut && remainingSeconds(state.deadline) === 0) { choose(Math.floor(Math.random() * 3), true); return; }
  const level = levels[state.levelIndex];
  const pick = makePick(level,index,Math.min(level.timeSec * 1000,Date.now()-state.levelStart),timedOut);
  phase = 'feedback'; resetTimers(); state.picks.push(pick); logger.track('level_pick',pick);
  // An open guide must not hide the automatic timeout result.
  if (dialog.open) dialog.close();
  renderGame();
  announce(timedOut ? t('timeUpAnnouncement') : t('levelScore',{n:pick.health}));
}

function recap() {
  return `<section class="receipt"><div class="receipt-heading"><span aria-hidden="true">▤</span><h2>${s('recap')}</h2><p>${s('recapNote')}</p></div><ol class="recap-list">${state.picks.map(pick => {
    const level = levels.find(l => l.id === pick.levelId), product = level.products[pick.productIndex], best = level.products.find(p => p.isBest);
    return `<li><details><summary><span class="recap-number">${String(level.id).padStart(2,'0')}</span><span class="recap-name">${escape(product.name)}<small>${escape(level.title)}${pick.timedOut ? ` · ${s('timeoutBadge')}` : ''}</small></span><span class="recap-score ${pick.isBest ? 'good-score' : ''}">${s('recapScore',{n:pick.health})}<small>HK$${fmt(pick.price)}</small></span><span aria-hidden="true">＋</span></summary><div class="recap-detail"><p>${pick.timedOut ? s('timeoutText',{name:product.name}) : escape(product.why)}</p>${!pick.isBest ? `<strong>${s('reviewBest',{name:best.name})}</strong>` : ''}<p>${escape(level.tip)}</p></div></details></li>`;
  }).join('')}</ol><div class="receipt-total"><span>${s('spent')}</span><strong>HK$${fmt(summarise(state.picks).spent)}</strong></div></section>`;
}

function resultCard() {
  const summary = summarise(state.picks);
  return `<div class="result-card"><div class="result-seal" aria-hidden="true">✦</div><p class="eyebrow">${s('average')}</p><p class="big-score">${summary.avgHealth}<span>/ 100</span></p><h2>${escape(strings.verdicts[verdictTier(summary.avgHealth)])}</h2><div class="result-metrics"><div><span>${s('bestCount')}</span><strong>${summary.bestCount}<small> / 15</small></strong></div><div class="${summary.budgetLeft < 0 ? 'over-budget' : ''}"><span>${s('budgetLeft')}</span><strong><small>HK$</small>${fmt(summary.budgetLeft)}</strong></div></div>${summary.timeoutCount ? `<p class="muted">${summary.timeoutCount} ${s('timeoutCount')}</p>` : ''}</div>`;
}

function renderResults() {
  resetTimers(); phase = 'results'; main.className = 'narrow results-screen';
  logger.track('game_done', { avgHealth: summarise(state.picks).avgHealth, budgetLeft: summarise(state.picks).budgetLeft });
  main.innerHTML = `${heading(t('resultEyebrow'),t('resultTitle'))}${resultCard()}<div class="result-actions">${button('post',s('postButton'))}${button('download-card',s('downloadCard'),'secondary')}</div>${recap()}<section class="takeaway"><h2>${s('howTitle')}</h2>${steps()}</section><p class="fine-print">${s('fictionNote')}</p>${button('post',s('postButton'))}`;
  focusScreen();
}

function loggingStatus() {
  if (!state.consent || !logger.enabled) return t('loggingOff');
  if (!config.analyticsEndpoint) return t('loggingLocal');
  return t(logger.queue.length ? 'loggingPending' : 'loggingSent');
}

function renderThanks() {
  resetTimers(); phase = 'thanks'; main.className = 'narrow thanks-screen';
  const pre = state.pre, post = state.post;
  const knowledgeChange = post.knowledgeScore - pre.knowledgeScore;
  const efficacyChange = efficacyMean(post.selfEfficacy) - efficacyMean(pre.selfEfficacy);
  const signed = value => `${value > 0 ? '+' : ''}${fmt(value)}`;
  main.innerHTML = `<div class="thank-symbol" aria-hidden="true">✳</div>${heading(t('thankEyebrow'),t('thankTitle'),t('thankText'))}<section class="learning-card"><h2>${s('learning')}</h2><table><thead><tr><th scope="col">${s('learning')}</th><th scope="col">${s('before')}</th><th scope="col">${s('after')}</th><th scope="col">${s('change')}</th></tr></thead><tbody><tr><th scope="row">${s('knowledgeScore')}</th><td>${pre.knowledgeScore}</td><td>${post.knowledgeScore}</td><td>${signed(knowledgeChange)}</td></tr><tr><th scope="row">${s('efficacyScore')}</th><td>${fmt(efficacyMean(pre.selfEfficacy))}</td><td>${fmt(efficacyMean(post.selfEfficacy))}</td><td>${signed(efficacyChange)}</td></tr></tbody></table></section>${config.surveyUrl ? `<a class="primary" href="${escape(config.surveyUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-action="survey">${s('survey')}</a>` : `<p class="survey-note">${s('surveyUnavailable')}</p>`}<div class="result-actions">${button('again',s('playAgain'))}${button('download-card',s('downloadCard'),'secondary')}${button('download-data',s('downloadData'),'text-button')}</div><details class="quiz-review"><summary>${s('answers')}</summary>${quiz.knowledge.map(q => `<article><span class="answer-result">${s(post.answers[q.id] === q.correctId ? 'correct' : 'incorrect')}</span><h3>${escape(q.question)}</h3><p>${s('yourAnswer',{answer:q.options.find(o=>o.id===post.answers[q.id]).text})}</p><p><strong>${s('rightAnswer',{answer:q.options.find(o=>o.id===q.correctId).text})}</strong></p><p>${escape(q.explanation)}</p></article>`).join('')}</details><section class="privacy-status"><p id="logging-status" role="status">${escape(loggingStatus())}</p>${button('clear-data',s('clearData'),'text-button')}</section>`;
  focusScreen(); statusClock = setInterval(() => { const node = document.querySelector('#logging-status'); if (node && node.textContent !== loggingStatus()) node.textContent = loggingStatus(); },1500);
}

function openGuide() {
  dialogContent.innerHTML = `<div class="dialog-top"><p class="eyebrow">Label Hero</p>${button('close-dialog',s('close'),'quiet')}</div><h2 id="guide-title">${s('guideTitle')}</h2><p class="lead">${s('guideIntro')}</p>${steps()}<h3>${s('guideHeading')}</h3><ul class="guide-notes">${strings.guideNotes.map(text=>`<li>${escape(text)}</li>`).join('')}</ul><h3>${s('sourceHeading')}</h3><p class="muted">${s('sourceDate')}</p><ul class="source-list">${strings.sources.map(source=>`<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a></li>`).join('')}</ul><p class="fine-print">${s('fictionNote')}</p>${phase === 'playing' ? `<p class="budget-warning">${s('guideDuring')}</p>` : ''}${button('close-dialog',s('close'))}`;
  dialog.showModal();
}

function askExit() {
  dialogContent.innerHTML = `<h2 id="guide-title">${s('exitTitle')}</h2><p>${s('exitText')}</p><div class="dialog-actions">${button('close-dialog',s('continuePlay'))}${button('confirm-exit',s('exitConfirm'),'secondary')}</div>${phase === 'playing' ? `<p class="fine-print">${s('guideDuring')}</p>` : ''}`;
  dialog.showModal();
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
}

async function downloadCard() {
  try {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1200;
    const ctx = canvas.getContext('2d'), summary = summarise(state.picks);
    ctx.fillStyle = '#f8f7f2'; ctx.fillRect(0,0,1000,1200);
    ctx.fillStyle = '#ac4328'; ctx.fillRect(0,0,1000,16);
    ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(t('pageTitle'),70,95);
    ctx.textAlign = 'center'; ctx.fillStyle = '#454b39'; ctx.font = 'bold 48px sans-serif'; ctx.fillText(t('cardTitle'),500,215);
    ctx.font = '26px sans-serif'; ctx.fillText(t('cardSubtitle'),500,268);
    ctx.fillStyle = '#ac4328'; ctx.font = 'bold 180px sans-serif'; ctx.fillText(String(summary.avgHealth),500,485);
    ctx.font = '26px sans-serif'; ctx.fillText(t('average')+' / 100',500,540);
    ctx.fillStyle = '#454b39'; ctx.font = 'bold 42px sans-serif'; ctx.fillText(strings.verdicts[verdictTier(summary.avgHealth)],500,620);
    ctx.font = '30px sans-serif'; ctx.fillText(t('bestCount')+`  ${summary.bestCount}/15`,500,710); ctx.fillText(t('budgetLeft')+`  HK$${fmt(summary.budgetLeft)}`,500,765);
    ctx.strokeStyle = '#cacbbb'; ctx.beginPath(); ctx.moveTo(90,830); ctx.lineTo(910,830); ctx.stroke();
    ctx.font = 'bold 29px sans-serif'; strings.steps.forEach((step,i)=>ctx.fillText(`0${i+1}  ${step.title}`,500,900+i*58));
    ctx.fillStyle = '#666b5b'; ctx.font = '21px sans-serif'; ctx.fillText(t('cardFoot'),500,1130);
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if (!blob) throw new Error('Could not create image');
    download(blob,'label-hero-result.png'); announce(t('downloadReady'));
  } catch { announce(t('downloadError')); }
}

document.querySelector('#guide-button').addEventListener('click',()=>strings && openGuide());
document.addEventListener('click',event=>{
  const target = event.target.closest('[data-action]'); if (!target || !strings) return;
  const action = target.dataset.action;
  if (action === 'start' || action === 'start-private') start(action === 'start');
  else if (action === 'close-dialog') dialog.close();
  else if (action === 'quiz-back' && state.quiz.index > 0) { state.quiz.index--; renderQuiz(); }
  else if (action === 'pick') choose(Number(target.dataset.index));
  else if (action === 'basis') {
    const container = target.closest('.nutrition'), product = levels[state.levelIndex].products[Number(target.dataset.index)];
    container.querySelector('table').outerHTML = table(product,target.dataset.basis);
    container.querySelectorAll('.basis-button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===target)));
  }
  else if (action === 'next-level' && phase === 'feedback') { if (state.levelIndex === 14) renderResults(); else { state.levelIndex++; startLevel(); } }
  else if (action === 'post' && phase === 'results') startQuiz('post');
  else if (action === 'again') { logger?.destroy(); renderIntro(); focusScreen(); }
  else if (action === 'exit') askExit();
  else if (action === 'confirm-exit') { dialog.close(); resetTimers(); logger?.destroy(); renderIntro(); focusScreen(); }
  else if (action === 'download-card') downloadCard();
  else if (action === 'download-data') download(new Blob([JSON.stringify({appVersion:config.appVersion, sessionId:state.sessionId, consent:state.consent, startedAt:state.startedAt, pre:state.pre, post:state.post, picks:state.picks, summary:summarise(state.picks)},null,2)],{type:'application/json'}),'label-hero-session.json');
  else if (action === 'survey') logger.track('survey_click');
  else if (action === 'clear-data') { logger.clear(); state.consent = false; announce(t('dataCleared')); document.querySelector('#logging-status').textContent = loggingStatus(); }
});
main.addEventListener('change',event=>{
  if (event.target.matches('input[name="answer"]')) {
    const qz=state.quiz; qz.answers[qz.order[qz.index].id]=event.target.value;
    main.querySelector('[type="submit"]').disabled=false;
  }
});
main.addEventListener('submit',event=>{
  if (event.target.id !== 'quiz-form') return;
  event.preventDefault();
  const qz = state.quiz; if (!qz.answers[qz.order[qz.index].id]) { announce(t('selectAnswer')); return; }
  if (qz.index === qz.order.length-1) finishQuiz(); else { qz.index++; renderQuiz(); }
});
main.addEventListener('toggle',event=>{
  const detail=event.target;
  if (phase==='playing' && detail.matches('details[data-label]') && detail.open) logger.track('label_opened',{levelId:levels[state.levelIndex].id,productIndex:Number(detail.dataset.label),msSinceLevelStart:Date.now()-state.levelStart});
},true);
document.addEventListener('visibilitychange',()=>{ if (phase==='playing' && !document.hidden) tick(); });
window.addEventListener('pagehide',()=>logger?.flush());
// Prevent an accidental brand navigation during an active session; use the exit flow.
document.querySelector('.brand').addEventListener('click',event=>{if (!['intro','thanks'].includes(phase)) { event.preventDefault(); askExit(); }});

try {
  [strings,levels,quiz,config] = await Promise.all([load('./data/zh-Hant.json'),load('./data/levels.json'),load('./data/quiz.json'),load('./config.json')]);
  if (validateLevels(levels).length) throw new Error('Invalid game content');
  document.querySelector('#guide-button').textContent=t('guide');
  document.querySelector('#footer').innerHTML=`<span>${s('footer')}</span><span>${s('footerNote')}</span>`;
  renderIntro();
} catch {
  const fallback = strings || JSON.parse(document.querySelector('#boot-copy').textContent);
  main.className='narrow'; main.innerHTML=`<h1>${escape(fallback.errorTitle)}</h1><p>${escape(fallback.errorText)}</p><button type="button" class="primary" id="reload">${escape(fallback.reload)}</button>`;
  document.querySelector('#reload').addEventListener('click',()=>location.reload());
}
