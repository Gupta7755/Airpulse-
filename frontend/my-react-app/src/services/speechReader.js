/**
 * Airpulse MoSPI APIx - Web Speech Synthesis Reader Service
 * Intelligently extracts readable content from the active page view,
 * maps DOM text nodes to spoken words, and highlights each active word
 * subtly and non-overwhelmingly using CSS Custom Highlights and smooth cursor overlay.
 */

let activeUtterance = null;
let keepAliveTimer = null;
let sentenceQueue = [];
let currentIndex = 0;
let isCurrentlySpeaking = false;
let currentActiveWord = '';
let currentActiveSentence = '';
let stateChangeListeners = new Set();

export function subscribeSpeechState(listener) {
  stateChangeListeners.add(listener);
  return () => stateChangeListeners.delete(listener);
}

function notifyState(isSpeaking, currentSentence = '', currentWord = '') {
  isCurrentlySpeaking = isSpeaking;
  currentActiveSentence = currentSentence;
  currentActiveWord = currentWord;
  stateChangeListeners.forEach((fn) => {
    try {
      fn({ isSpeaking, currentSentence, currentWord });
    } catch (e) {
      console.error('Error in speech state listener:', e);
    }
  });
}

/**
 * Clean & Format individual words or text chunks for high-fidelity spoken output
 */
export function sanitizeWordForSpeech(rawWord) {
  if (!rawWord) return '';

  return rawWord
    // Currency & numbers
    .replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, '$1 Rupees')
    .replace(/%/g, ' percent')
    .replace(/×/g, ' multiplied by ')
    .replace(/∑/g, ' sum of ')
    .replace(/➔|→/g, ' to ')
    .replace(/•/g, ', ')
    // Flight route pairs
    .replace(/\bDEL-BOM\b/gi, 'Delhi to Mumbai')
    .replace(/\bDEL-BLR\b/gi, 'Delhi to Bengaluru')
    .replace(/\bBOM-BLR\b/gi, 'Mumbai to Bengaluru')
    .replace(/\bDEL-CCU\b/gi, 'Delhi to Kolkata')
    .replace(/\bBLR-HYD\b/gi, 'Bengaluru to Hyderabad')
    .replace(/\bMAA-DEL\b/gi, 'Chennai to Delhi')
    .replace(/\bDEL-HYD\b/gi, 'Delhi to Hyderabad')
    .replace(/\bBOM-GOI\b/gi, 'Mumbai to Goa')
    .replace(/\bBOM-MAA\b/gi, 'Mumbai to Chennai')
    .replace(/\bCCU-BLR\b/gi, 'Kolkata to Bengaluru')
    // Advance purchase horizons
    .replace(/\bT\+0\b/gi, 'T plus 0, same day booking')
    .replace(/\bT\+1\b/gi, 'T plus 1 day')
    .replace(/\bT\+7\b/gi, 'T plus 7 days')
    .replace(/\bT\+15\b/gi, 'T plus 15 days')
    .replace(/\bT\+30\b/gi, 'T plus 30 days')
    .replace(/\bT\+45\b/gi, 'T plus 45 days')
    // Official acronyms
    .replace(/\bMoSPI\b/g, 'M-O-S-P-I')
    .replace(/\bDGCA\b/g, 'D-G-C-A')
    .replace(/\bAPIx\b/g, 'A-P-I-x Airfare Index')
    .replace(/\bCPI\b/g, 'Consumer Price Index')
    .replace(/\bNSO\b/g, 'National Statistical Office')
    .replace(/\bPax\/yr\b/gi, 'passengers per year')
    .replace(/\bpax\b/gi, 'passengers')
    .replace(/\bIQR\b/gi, 'Interquartile Range')
    .replace(/\bOTAs\b/gi, 'Online Travel Agencies')
    .replace(/\bOTA\b/gi, 'Online Travel Agency')
    // Millions and thousands
    .replace(/([0-9]+)\.([0-9]+)M\b/gi, '$1 point $2 Million')
    .replace(/([0-9]+)M\b/gi, '$1 Million')
    .replace(/([0-9]+)k\b/gi, '$1 Thousand')
    .trim();
}

/**
 * Get or create the floating focus reading cursor element
 */
function getOrCreateReadingCursor() {
  if (typeof document === 'undefined') return null;
  let cursor = document.getElementById('speech-reading-cursor');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.id = 'speech-reading-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
  }
  return cursor;
}

/**
 * Highlight a specific word in the DOM using CSS.highlights and smooth cursor overlay
 */
export function highlightDomWord(domNode, startOffset, endOffset) {
  if (!domNode || typeof Range === 'undefined') return;

  try {
    const textLen = domNode.textContent ? domNode.textContent.length : 0;
    const safeStart = Math.max(0, Math.min(startOffset, textLen));
    const safeEnd = Math.max(safeStart, Math.min(endOffset, textLen));

    if (safeStart === safeEnd) return;

    const range = new Range();
    range.setStart(domNode, safeStart);
    range.setEnd(domNode, safeEnd);

    // 1. Native W3C CSS Custom Highlight API (Zero DOM modification)
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      try {
        const highlight = new Highlight(range);
        CSS.highlights.set('speech-word-highlight', highlight);
      } catch (err) {
        // Fallback gracefully
      }
    }

    // 2. Smooth universal cursor overlay (works across all browsers)
    const cursor = getOrCreateReadingCursor();
    if (cursor) {
      const rect = range.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        cursor.style.display = 'block';
        cursor.style.top = `${rect.top - 1}px`;
        cursor.style.left = `${rect.left - 2}px`;
        cursor.style.width = `${rect.width + 4}px`;
        cursor.style.height = `${rect.height + 2}px`;
        cursor.style.opacity = '1';
      }
    }

    // 3. Subtle auto-scroll if element is out of visible viewport
    if (domNode.parentElement) {
      const pRect = domNode.parentElement.getBoundingClientRect();
      if (pRect.top < 50 || pRect.bottom > window.innerHeight - 70) {
        domNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  } catch (err) {
    console.debug('Highlight DOM word error:', err);
  }
}

/**
 * Clear all word highlights and hide the reading cursor
 */
export function clearWordHighlight() {
  if (typeof CSS !== 'undefined' && CSS.highlights) {
    try {
      CSS.highlights.delete('speech-word-highlight');
    } catch (e) {}
  }
  if (typeof document !== 'undefined') {
    const cursor = document.getElementById('speech-reading-cursor');
    if (cursor) {
      cursor.style.opacity = '0';
      cursor.style.display = 'none';
    }
  }
}

/**
 * Find the target word in a sentence by charIndex
 */
function findWordAtCharIndex(words, charIndex) {
  if (!words || words.length === 0) return null;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const nextStart = (i + 1 < words.length) ? words[i + 1].charIndex : w.charIndex + Math.max(w.charLength, 1) + 10;
    if (charIndex >= w.charIndex && charIndex < nextStart) {
      return w;
    }
  }

  for (let i = words.length - 1; i >= 0; i--) {
    if (charIndex >= words[i].charIndex) return words[i];
  }

  return words[0];
}

/**
 * Extract structured sentences and word tokens mapped directly to live DOM text nodes
 */
export function extractStructuredContent() {
  if (typeof document === 'undefined') return [];

  const candidateSelectors = [
    '.home-simple-container',
    '.deck-white-dashboard',
    '.india-map-container',
    '.index-trend-container',
    '.windows-view-container',
    '.airlines-view-container',
    '.quotes-explorer-container',
    '.scraper-health-view',
    '.scraper-health-container',
    '.nso-export-container',
    '.harmont-content-area',
    '.harmont-viewport-frame'
  ];

  let container = null;
  for (const sel of candidateSelectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) {
      container = el;
      break;
    }
  }

  if (!container) {
    container = document.querySelector('main') || document.body;
  }

  const IGNORE_SELECTORS = [
    '.left-sidebar-nav',
    '.sidebar-mobile-backdrop',
    '.mobile-app-header',
    '.airpulse-theme-toggle-group',
    '.volume-reader-btn',
    '.search-nav-bar',
    '.search-nav-btn',
    '.quick-search-backdrop',
    '.quick-search-modal',
    '.floating-page-reader',
    '#speech-reading-cursor',
    '.modal-backdrop',
    '.modal-close-btn',
    'svg',
    'script',
    'style',
    'noscript',
    '[aria-hidden="true"]',
    'input[type="checkbox"]'
  ];

  const isIgnored = (node) => {
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el && el !== container && el !== document.body) {
      for (const sel of IGNORE_SELECTORS) {
        if (el.matches && el.matches(sel)) return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (isIgnored(node)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const sentences = [];
  let currentWords = [];
  let currentSentenceText = '';
  let lastParent = null;

  const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'tr', 'li', 'section', 'article', 'header']);

  let currNode;
  while ((currNode = walker.nextNode())) {
    const parent = currNode.parentElement;
    const isNewBlock = lastParent && parent !== lastParent && BLOCK_TAGS.has(parent.tagName.toLowerCase());

    if (isNewBlock && currentWords.length > 0) {
      sentences.push({
        text: currentSentenceText.trim(),
        words: currentWords
      });
      currentWords = [];
      currentSentenceText = '';
    }
    lastParent = parent;

    const text = currNode.textContent;
    const regex = /\S+/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const rawWord = match[0];
      const spokenWord = sanitizeWordForSpeech(rawWord);
      const charIndex = currentSentenceText.length;
      currentSentenceText += spokenWord + ' ';

      currentWords.push({
        rawWord,
        spokenWord,
        charIndex,
        charLength: spokenWord.length,
        domNode: currNode,
        startOffset: match.index,
        endOffset: match.index + rawWord.length
      });

      // Split sentence at terminating punctuation
      if (/[.!?]$/.test(rawWord)) {
        sentences.push({
          text: currentSentenceText.trim(),
          words: currentWords
        });
        currentWords = [];
        currentSentenceText = '';
      }
    }
  }

  if (currentWords.length > 0) {
    sentences.push({
      text: currentSentenceText.trim(),
      words: currentWords
    });
  }

  return sentences.filter(s => s.text && s.text.length > 0);
}

/**
 * Start speaking the active page text
 */
export function startPageReader() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert('Web Speech Synthesis is not supported in this browser.');
    return false;
  }

  // Stop any active speech and clear previous highlights
  stopPageReader();

  const structuredSentences = extractStructuredContent();
  if (!structuredSentences || structuredSentences.length === 0) {
    const fallbackUtterance = new SpeechSynthesisUtterance("Welcome to Airpulse. Official MoSPI Airfare Price Index portal.");
    window.speechSynthesis.speak(fallbackUtterance);
    return true;
  }

  sentenceQueue = structuredSentences;
  currentIndex = 0;

  notifyState(true, sentenceQueue[0].text, '');

  // Chromium 15-second speech synthesis pause bug workaround
  clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);

  speakNextSentence();
  return true;
}

function speakNextSentence() {
  if (currentIndex >= sentenceQueue.length) {
    stopPageReader();
    return;
  }

  const currentBlock = sentenceQueue[currentIndex];
  notifyState(true, currentBlock.text, '');

  const utterance = new SpeechSynthesisUtterance(currentBlock.text);
  activeUtterance = utterance;

  // Configure voice settings for clean professional articulation
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.lang = 'en-IN';

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => (v.lang === 'en-IN' || v.name.includes('India')) && !v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en'))
    || null;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Word-by-word boundary callback to highlight each word
  utterance.onboundary = (e) => {
    if (e.name === 'word') {
      const targetWord = findWordAtCharIndex(currentBlock.words, e.charIndex);
      if (targetWord) {
        highlightDomWord(targetWord.domNode, targetWord.startOffset, targetWord.endOffset);
        notifyState(true, currentBlock.text, targetWord.spokenWord || targetWord.rawWord);
      }
    }
  };

  utterance.onend = () => {
    clearWordHighlight();
    currentIndex++;
    speakNextSentence();
  };

  utterance.onerror = (e) => {
    clearWordHighlight();
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('SpeechSynthesis error:', e);
    }
    currentIndex++;
    if (currentIndex < sentenceQueue.length && e.error !== 'canceled') {
      speakNextSentence();
    } else {
      stopPageReader();
    }
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop active speech reader immediately
 */
export function stopPageReader() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
  activeUtterance = null;
  sentenceQueue = [];
  currentIndex = 0;
  clearWordHighlight();
  notifyState(false, '', '');
}

/**
 * Toggle speech reader (Start if idle, Stop if speaking)
 */
export function togglePageReader() {
  if (isCurrentlySpeaking) {
    stopPageReader();
    return false;
  } else {
    return startPageReader();
  }
}

export function getIsSpeaking() {
  return isCurrentlySpeaking;
}

export function getCurrentWord() {
  return currentActiveWord;
}

export function getCurrentSentence() {
  return currentActiveSentence;
}
