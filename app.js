import { createResultCard } from './share-card.js';

const screens = {
  landing: document.querySelector('#landingScreen'),
  quiz: document.querySelector('#quizScreen'),
  result: document.querySelector('#resultScreen'),
};

const elements = {
  startButton: document.querySelector('#startButton'),
  startButtonText: document.querySelector('#startButtonText'),
  loadError: document.querySelector('#loadError'),
  headerLink: document.querySelector('.header-link'),
  questionCount: document.querySelector('#questionCount'),
  questionCategory: document.querySelector('#questionCategory'),
  questionContext: document.querySelector('#questionContext'),
  questionTitle: document.querySelector('#questionTitle'),
  quizProgress: document.querySelector('#quizProgress'),
  quizProgressBar: document.querySelector('#quizProgressBar'),
  answerList: document.querySelector('#answerList'),
  questionInsight: document.querySelector('#questionInsight'),
  questionInsightText: document.querySelector('#questionInsightText'),
  mobileInsightButton: document.querySelector('#mobileInsightButton'),
  explanationDialog: document.querySelector('#explanationDialog'),
  explanationDialogText: document.querySelector('#explanationDialogText'),
  closeExplanationDialog: document.querySelector('#closeExplanationDialog'),
  gotItButton: document.querySelector('#gotItButton'),
  backButton: document.querySelector('#backButton'),
  nextButton: document.querySelector('#nextButton'),
  nextButtonText: document.querySelector('#nextButtonText'),
  resultLevelNumber: document.querySelector('#resultLevelNumber'),
  resultTitle: document.querySelector('#resultTitle'),
  resultSummary: document.querySelector('#resultSummary'),
  resultScore: document.querySelector('#resultScore'),
  resultRangeBar: document.querySelector('#resultRangeBar'),
  rawScore: document.querySelector('#rawScore'),
  categoryBreakdown: document.querySelector('#categoryBreakdown'),
  coachNoteText: document.querySelector('#coachNoteText'),
  shareButton: document.querySelector('#shareButton'),
  shareButtonText: document.querySelector('#shareButtonText'),
  retakeButton: document.querySelector('#retakeButton'),
  whatsappDialog: document.querySelector('#whatsappDialog'),
  closeShareDialog: document.querySelector('#closeShareDialog'),
  shareCardPreview: document.querySelector('#shareCardPreview'),
  downloadShareCard: document.querySelector('#downloadShareCard'),
  openWhatsApp: document.querySelector('#openWhatsApp'),
  toast: document.querySelector('#toast'),
};

const state = {
  data: null,
  currentQuestion: 0,
  answers: [],
  result: null,
  shareImage: null,
  toastTimer: null,
};

function isMobileQuizLayout() {
  return window.matchMedia('(max-width: 759px)').matches;
}

function showScreen(name) {
  const isQuiz = name === 'quiz';
  Object.entries(screens).forEach(([screenName, screen]) => {
    screen.hidden = screenName !== name;
  });
  elements.headerLink.hidden = name !== 'landing';
  document.documentElement.classList.toggle('quiz-active', isQuiz);
  document.body.classList.toggle('quiz-active', isQuiz);
}

function scrollToTop(instant = false) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: instant || reduceMotion ? 'auto' : 'smooth' });
}

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function validateData(data) {
  if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('The question bank is empty or invalid.');
  }
  if (!Array.isArray(data.levels) || data.levels.length === 0) {
    throw new Error('The score ranges are missing.');
  }
  if (!data.categories || typeof data.categories !== 'object') {
    throw new Error('The score categories are missing.');
  }

  data.questions.forEach((question) => {
    if (
      !question.id ||
      !question.prompt ||
      !question.whyItMatters ||
      !data.categories[question.category] ||
      !Array.isArray(question.answers) ||
      question.answers.length < 2 ||
      question.answers.some(
        (answer) => typeof answer.text !== 'string' || !Number.isFinite(answer.points) || answer.points < 0,
      )
    ) {
      throw new Error(`Question “${question.id || 'unknown'}” is invalid.`);
    }
  });
}

async function loadQuestions() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`Questions returned HTTP ${response.status}.`);
    }
    const data = await response.json();
    validateData(data);
    state.data = data;
    elements.startButton.disabled = false;
    elements.startButtonText.textContent = 'Find my level';
    elements.loadError.hidden = true;
  } catch (error) {
    console.error('Unable to load the quiz:', error);
    elements.startButton.disabled = true;
    elements.startButtonText.textContent = 'Questions unavailable';
    elements.loadError.hidden = false;
  }
}

function startQuiz() {
  if (!state.data) return;
  state.currentQuestion = 0;
  state.answers = new Array(state.data.questions.length).fill(undefined);
  state.result = null;
  if (isMobileQuizLayout()) {
    scrollToTop(true);
  }
  showScreen('quiz');
  renderQuestion();
  if (!isMobileQuizLayout()) {
    scrollToTop();
  }
  elements.questionTitle.focus({ preventScroll: true });
}

function updateQuestionInsights() {
  const question = state.data.questions[state.currentQuestion];
  const visible = state.answers[state.currentQuestion] !== undefined;
  elements.questionInsight.hidden = !visible;
  elements.mobileInsightButton.hidden = !visible;
  elements.questionInsightText.textContent = question.whyItMatters;
  elements.explanationDialogText.textContent = question.whyItMatters;
}

function selectAnswer(answerIndex, moveFocus = false) {
  state.answers[state.currentQuestion] = answerIndex;
  const options = elements.answerList.querySelectorAll('.answer-option');
  options.forEach((option, index) => {
    const selected = index === answerIndex;
    option.setAttribute('aria-checked', String(selected));
    option.tabIndex = selected ? 0 : -1;
  });
  updateQuestionInsights();
  elements.nextButton.disabled = false;
  if (moveFocus) options[answerIndex].focus();
}

function handleAnswerKeys(event) {
  if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
  event.preventDefault();
  const options = [...elements.answerList.querySelectorAll('.answer-option')];
  const focusedIndex = options.indexOf(document.activeElement);
  if (focusedIndex === -1) return;
  const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
  const nextIndex = (focusedIndex + (forward ? 1 : -1) + options.length) % options.length;
  selectAnswer(nextIndex, true);
}

function renderQuestion() {
  const { questions, categories } = state.data;
  const question = questions[state.currentQuestion];
  const selectedAnswer = state.answers[state.currentQuestion];
  const questionNumber = state.currentQuestion + 1;

  elements.questionCount.textContent = `Question ${String(questionNumber).padStart(2, '0')} / ${questions.length}`;
  elements.questionCategory.textContent = categories[question.category].label;
  elements.questionContext.textContent = question.context;
  elements.questionTitle.textContent = question.prompt;
  elements.quizProgress.setAttribute('aria-valuemax', String(questions.length));
  elements.quizProgress.setAttribute('aria-valuenow', String(questionNumber));
  elements.quizProgressBar.style.width = `${(questionNumber / questions.length) * 100}%`;
  elements.backButton.disabled = state.currentQuestion === 0;
  elements.nextButton.disabled = selectedAnswer === undefined;
  elements.nextButtonText.textContent = questionNumber === questions.length ? 'See my level' : 'Next question';

  const fragment = document.createDocumentFragment();
  question.answers.forEach((answer, answerIndex) => {
    const option = document.createElement('button');
    const selected = selectedAnswer === answerIndex;
    option.type = 'button';
    option.className = 'answer-option';
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(selected));
    option.tabIndex = selected || (selectedAnswer === undefined && answerIndex === 0) ? 0 : -1;
    option.addEventListener('click', () => selectAnswer(answerIndex));

    const letter = document.createElement('span');
    letter.className = 'answer-letter';
    letter.setAttribute('aria-hidden', 'true');
    letter.textContent = String.fromCharCode(65 + answerIndex);

    const text = document.createElement('span');
    text.className = 'answer-text';
    text.textContent = answer.text;

    const indicator = document.createElement('span');
    indicator.className = 'answer-indicator';
    indicator.setAttribute('aria-hidden', 'true');

    option.append(letter, text, indicator);
    fragment.append(option);
  });
  elements.answerList.replaceChildren(fragment);
  updateQuestionInsights();
}

function resetQuestionScroll() {
  const card = screens.quiz.querySelector('.question-card');
  if (card) card.scrollTop = 0;
}

function goBack() {
  if (state.currentQuestion === 0) return;
  state.currentQuestion -= 1;
  renderQuestion();
  if (isMobileQuizLayout()) {
    resetQuestionScroll();
  } else {
    scrollToTop();
  }
  elements.questionTitle.focus({ preventScroll: true });
}

function goNext() {
  if (state.answers[state.currentQuestion] === undefined) return;
  if (state.currentQuestion === state.data.questions.length - 1) {
    showResults();
    return;
  }
  state.currentQuestion += 1;
  renderQuestion();
  if (isMobileQuizLayout()) {
    resetQuestionScroll();
  } else {
    scrollToTop();
  }
  elements.questionTitle.focus({ preventScroll: true });
}

function calculateResult() {
  const categoryScores = {};
  Object.keys(state.data.categories).forEach((category) => {
    categoryScores[category] = { points: 0, maxPoints: 0, percentage: 0 };
  });

  let points = 0;
  let maxPoints = 0;

  state.data.questions.forEach((question, questionIndex) => {
    const selectedAnswer = question.answers[state.answers[questionIndex]];
    const questionMax = Math.max(...question.answers.map((answer) => answer.points));
    points += selectedAnswer.points;
    maxPoints += questionMax;
    categoryScores[question.category].points += selectedAnswer.points;
    categoryScores[question.category].maxPoints += questionMax;
  });

  Object.values(categoryScores).forEach((category) => {
    category.percentage = category.maxPoints === 0 ? 0 : Math.round((category.points / category.maxPoints) * 100);
  });

  const score = Math.round((points / maxPoints) * 100);
  const levelIndex = state.data.levels.findIndex((level) => score >= level.min && score <= level.max);
  if (levelIndex === -1) throw new Error(`No level configured for score ${score}.`);

  return {
    points,
    maxPoints,
    score,
    categoryScores,
    questionCount: state.data.questions.length,
    level: state.data.levels[levelIndex],
    levelIndex,
  };
}

function renderCategoryBreakdown(result) {
  const fragment = document.createDocumentFragment();
  Object.entries(result.categoryScores).forEach(([categoryId, categoryResult]) => {
    const row = document.createElement('div');
    row.className = 'category-row';

    const top = document.createElement('div');
    top.className = 'category-row-top';
    const label = document.createElement('span');
    label.textContent = state.data.categories[categoryId].label;
    const value = document.createElement('span');
    value.textContent = `${categoryResult.percentage}%`;
    top.append(label, value);

    const track = document.createElement('div');
    track.className = 'category-track';
    track.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span');
    bar.style.width = `${categoryResult.percentage}%`;
    track.append(bar);

    row.append(top, track);
    fragment.append(row);
  });
  elements.categoryBreakdown.replaceChildren(fragment);
}

function showResults() {
  const result = calculateResult();
  state.result = result;

  elements.resultLevelNumber.textContent = `Level ${result.levelIndex + 1} of ${state.data.levels.length}`;
  elements.resultTitle.textContent = result.level.label;
  elements.resultSummary.textContent = result.level.summary;
  elements.resultScore.textContent = result.score;
  elements.rawScore.textContent = `${result.points} / ${result.maxPoints} points`;
  elements.resultRangeBar.style.width = '0%';
  renderCategoryBreakdown(result);

  if (result.score === 100) {
    elements.coachNoteText.textContent = state.data.perfectScoreTip;
  } else {
    const weakestCategory = Object.entries(result.categoryScores).sort((a, b) => a[1].percentage - b[1].percentage)[0][0];
    elements.coachNoteText.textContent = state.data.categories[weakestCategory].tip;
  }

  showScreen('result');
  scrollToTop();
  elements.resultTitle.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elements.resultRangeBar.style.width = `${result.score}%`;
    });
  });
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function getShareUrl() {
  return window.location.href.split('#')[0];
}

function getShareText(result) {
  const breakdown = Object.entries(result.categoryScores)
    .map(([categoryId, category]) => `${state.data.categories[categoryId].label} ${category.percentage}%`)
    .join(' · ');
  return `My padel verdict: ${result.level.label} (${result.score}/100)\n${breakdown}\nThink you can beat me? ${getShareUrl()}`;
}

function getShareFileName(result) {
  const level = result.level.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `padel-verdict-${level}-${result.score}.png`;
}

async function getShareImage(result) {
  if (state.shareImage?.result === result) return state.shareImage;
  if (state.shareImage) URL.revokeObjectURL(state.shareImage.url);

  const blob = await createResultCard(result, state.data.categories, getShareUrl());
  state.shareImage = {
    blob,
    result,
    url: URL.createObjectURL(blob),
    fileName: getShareFileName(result),
  };
  return state.shareImage;
}

function setShareLoading(loading) {
  elements.shareButton.disabled = loading;
  elements.shareButton.setAttribute('aria-busy', String(loading));
  elements.shareButtonText.textContent = loading ? 'Making your card…' : 'Share on WhatsApp';
}

function openWhatsAppFallback(image, text) {
  elements.shareCardPreview.src = image.url;
  elements.downloadShareCard.href = image.url;
  elements.downloadShareCard.download = image.fileName;
  elements.openWhatsApp.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  openDialog(elements.whatsappDialog);
}

async function shareResult() {
  if (!state.result || elements.shareButton.disabled) return;
  const result = state.result;
  setShareLoading(true);

  try {
    const image = await getShareImage(result);
    if (state.result !== result) return;
    const text = getShareText(result);
    const file = new File([image.blob], image.fileName, { type: 'image/png' });

    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'My padel verdict', text, files: [file] });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    openWhatsAppFallback(image, text);
  } catch (error) {
    console.error('Unable to share the result card:', error);
    showToast('Could not create your result card. Please try again.');
  } finally {
    setShareLoading(false);
  }
}

elements.startButton.addEventListener('click', startQuiz);
elements.retakeButton.addEventListener('click', startQuiz);
elements.backButton.addEventListener('click', goBack);
elements.nextButton.addEventListener('click', goNext);
elements.answerList.addEventListener('keydown', handleAnswerKeys);
elements.mobileInsightButton.addEventListener('click', () => openDialog(elements.explanationDialog));
elements.closeExplanationDialog.addEventListener('click', () => closeDialog(elements.explanationDialog));
elements.gotItButton.addEventListener('click', () => closeDialog(elements.explanationDialog));
elements.explanationDialog.addEventListener('click', (event) => {
  if (event.target === elements.explanationDialog) closeDialog(elements.explanationDialog);
});
elements.shareButton.addEventListener('click', shareResult);
elements.closeShareDialog.addEventListener('click', () => closeDialog(elements.whatsappDialog));
elements.whatsappDialog.addEventListener('click', (event) => {
  if (event.target === elements.whatsappDialog) closeDialog(elements.whatsappDialog);
});

loadQuestions();
