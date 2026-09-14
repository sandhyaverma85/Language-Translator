/**
 * LinguaVerse - Language Translation Tool Frontend Controller
 * CSE AI-ML Internship Project
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // DOM Element References
    // ----------------------------------------------------
    const sourceText = document.getElementById('sourceText');
    const targetText = document.getElementById('targetText');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    
    const translateBtn = document.getElementById('translateBtn');
    const swapLangBtn = document.getElementById('swapLangBtn');
    const clearSourceBtn = document.getElementById('clearSourceBtn');
    const clearTargetBtn = document.getElementById('clearTargetBtn');
    
    const copyBtn = document.getElementById('copyBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    const targetSpeakBtn = document.getElementById('targetSpeakBtn');
    const sourceSpeakBtn = document.getElementById('sourceSpeakBtn');
    
    const charCount = document.getElementById('charCount');
    const targetWordCount = document.getElementById('targetWordCount');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    let toastTimer = null;

    // ----------------------------------------------------
    // Language Code to Speech Synthesis BCP-47 Mapping
    // ----------------------------------------------------
    const SPEECH_LANG_MAP = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt': 'pt-PT',
        'ru': 'ru-RU',
        'zh-CN': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'ar': 'ar-SA',
        'bn': 'bn-IN',
        'mr': 'mr-IN',
        'gu': 'gu-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'pa': 'pa-IN',
        'ur': 'ur-PK'
    };

    // ----------------------------------------------------
    // Helper: Toast Notifications
    // ----------------------------------------------------
    function showToast(message, type = 'error') {
        if (toastTimer) clearTimeout(toastTimer);

        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;

        if (type === 'error') {
            toastIcon.className = 'fa-solid fa-circle-exclamation';
        } else if (type === 'success') {
            toastIcon.className = 'fa-solid fa-circle-check';
        } else {
            toastIcon.className = 'fa-solid fa-circle-info';
        }

        toastTimer = setTimeout(() => {
            toast.className = 'toast';
        }, 4000);
    }

    // ----------------------------------------------------
    // Character Counter & Input Monitoring
    // ----------------------------------------------------
    function updateSourceStats() {
        const length = sourceText.value.length;
        charCount.textContent = `${length} / 5000`;
        sourceSpeakBtn.disabled = length === 0;
    }

    function updateTargetStats() {
        const text = targetText.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        targetWordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
        
        const hasContent = text.length > 0;
        copyBtn.disabled = !hasContent;
        targetSpeakBtn.disabled = !hasContent;
    }

    sourceText.addEventListener('input', updateSourceStats);

    // ----------------------------------------------------
    // Clear Buttons
    // ----------------------------------------------------
    clearSourceBtn.addEventListener('click', () => {
        sourceText.value = '';
        updateSourceStats();
        sourceText.focus();
    });

    clearTargetBtn.addEventListener('click', () => {
        targetText.value = '';
        updateTargetStats();
    });

    // ----------------------------------------------------
    // Swap Languages & Text
    // ----------------------------------------------------
    swapLangBtn.addEventListener('click', () => {
        const currentSource = sourceLang.value;
        const currentTarget = targetLang.value;

        // If source was 'auto', swap target to source and default target to 'en'
        if (currentSource === 'auto') {
            sourceLang.value = currentTarget;
            targetLang.value = 'en';
        } else {
            sourceLang.value = currentTarget;
            targetLang.value = currentSource;
        }

        // Also swap text if target text exists
        const currentSrcText = sourceText.value;
        const currentTrgText = targetText.value;

        if (currentTrgText) {
            sourceText.value = currentTrgText;
            targetText.value = currentSrcText;
            updateSourceStats();
            updateTargetStats();
        }
    });

    // ----------------------------------------------------
    // Translation Logic (AJAX / Fetch API)
    // ----------------------------------------------------
    async function performTranslation() {
        const text = sourceText.value.trim();
        const source_lang = sourceLang.value;
        const target_lang = targetLang.value;

        // Validation Checks
        if (!text) {
            showToast('Please enter text to translate.', 'error');
            sourceText.focus();
            return;
        }

        if (source_lang === target_lang && source_lang !== 'auto') {
            showToast('Source and Target languages cannot be identical.', 'error');
            return;
        }

        // Show loading state
        loadingOverlay.classList.remove('hidden');
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Translating...</span>';

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    source_lang: source_lang,
                    target_lang: target_lang
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                targetText.value = data.translated_text;
                updateTargetStats();
                showToast(`Translated successfully to ${data.target_lang_name}!`, 'success');
            } else {
                showToast(data.error || 'Translation failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to connect to the backend server. Make sure Flask is running.', 'error');
        } finally {
            // Restore button and remove loader
            loadingOverlay.classList.add('hidden');
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Translate Now</span>';
        }
    }

    translateBtn.addEventListener('click', performTranslation);

    // Keyboard shortcut: Ctrl + Enter or Cmd + Enter to trigger translation
    sourceText.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            performTranslation();
        }
    });

    // ----------------------------------------------------
    // Clipboard Copy Feature
    // ----------------------------------------------------
    copyBtn.addEventListener('click', async () => {
        const text = targetText.value;
        if (!text) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                targetText.select();
                document.execCommand('copy');
            }

            // Visual confirmation
            copyBtnText.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            showToast('Translation copied to clipboard!', 'success');

            setTimeout(() => {
                copyBtnText.textContent = 'Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            showToast('Could not copy text to clipboard.', 'error');
        }
    });

    // ----------------------------------------------------
    // Text-to-Speech (Web Speech API)
    // ----------------------------------------------------
    function speakText(text, langCode) {
        if (!('speechSynthesis' in window)) {
            showToast('Text-to-speech is not supported by your browser.', 'error');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        const bcp47Code = SPEECH_LANG_MAP[langCode] || langCode;
        utterance.lang = bcp47Code;
        utterance.rate = 0.95; // Natural speaking rate

        // Try to pick a matching system voice
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => v.lang === bcp47Code || v.lang.startsWith(langCode));
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            showToast('Speech playback error.', 'error');
        };

        window.speechSynthesis.speak(utterance);
    }

    targetSpeakBtn.addEventListener('click', () => {
        speakText(targetText.value, targetLang.value);
    });

    sourceSpeakBtn.addEventListener('click', () => {
        speakText(sourceText.value, sourceLang.value === 'auto' ? 'en' : sourceLang.value);
    });

    // Populate browser voices cache if needed
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    // Initial state setup
    updateSourceStats();
    updateTargetStats();
});
