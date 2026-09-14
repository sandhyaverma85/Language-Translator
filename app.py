import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

app = Flask(__name__)

# Dictionary of supported languages with their display names and ISO codes
SUPPORTED_LANGUAGES = {
    'auto': 'Auto Detect',
    'en': 'English',
    'hi': 'Hindi',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh-CN': 'Chinese (Simplified)',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'ta': 'Tamil',
    'te': 'Telugu',
    'pa': 'Punjabi',
    'ur': 'Urdu'
}

def translate_with_google_api(text: str, source_lang: str, target_lang: str) -> str:
    """
    Primary translation engine using Google's Client API.
    Fast, reliable, and requires no API key.
    """
    url = 'https://clients5.google.com/translate_a/t'
    params = {
        'client': 'dict-chrome-ex',
        'sl': source_lang,
        'tl': target_lang,
        'q': text
    }
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
    
    response = requests.get(url, params=params, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    
    # Parse translated text
    if isinstance(data, list):
        if len(data) > 0:
            if isinstance(data[0], list):
                return ''.join([item[0] for item in data if isinstance(item, list) and len(item) > 0])
            return str(data[0])
    elif isinstance(data, str):
        return data
        
    return str(data)

def translate_with_mymemory(text: str, source_lang: str, target_lang: str) -> str:
    """
    Secondary fallback engine using MyMemory Translated API.
    """
    src = 'en' if source_lang == 'auto' else source_lang
    url = 'https://api.mymemory.translated.net/get'
    params = {
        'q': text,
        'langpair': f'{src}|{target_lang}'
    }
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    response = requests.get(url, params=params, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    
    response_data = data.get('responseData', {})
    translated_text = response_data.get('translatedText')
    
    if not translated_text or 'MYMEMORY WARNING' in translated_text:
        # Check matches list for best match
        matches = data.get('matches', [])
        for match in matches:
            trans = match.get('translation')
            if trans and 'MYMEMORY WARNING' not in trans:
                return trans
                
    if translated_text:
        return translated_text
        
    raise ValueError("MyMemory returned an empty translation.")

def execute_translation(text: str, source_lang: str, target_lang: str) -> str:
    """
    Tries primary translation engine, then falls back to secondary if primary fails.
    """
    # 1. Try Primary Engine (Google Client API)
    try:
        result = translate_with_google_api(text, source_lang, target_lang)
        if result and result.strip():
            return result
    except Exception as e_primary:
        print(f"⚠️ Primary translation error: {e_primary}. Switching to fallback engine...")
    
    # 2. Try Fallback Engine (MyMemory)
    try:
        result = translate_with_mymemory(text, source_lang, target_lang)
        if result and result.strip():
            return result
    except Exception as e_fallback:
        print(f"⚠️ Fallback translation error: {e_fallback}")
        raise RuntimeError(f"All translation engines failed. Please check your internet connection. (Error: {e_fallback})")

@app.route('/')
def home():
    """
    Renders the main translation UI.
    """
    return render_template('index.html', languages=SUPPORTED_LANGUAGES)

@app.route('/translate', methods=['POST'])
def translate_text():
    """
    Handles translation requests via JSON POST payload.
    """
    try:
        # 1. Parse JSON input
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request. Please provide JSON payload with text, source_lang, and target_lang.'
            }), 400

        text = data.get('text', '').strip()
        source_lang = data.get('source_lang', 'auto').strip()
        target_lang = data.get('target_lang', 'en').strip()

        # 2. Validate empty input
        if not text:
            return jsonify({
                'success': False,
                'error': 'Please enter some text to translate.'
            }), 400

        # 3. Validate character length limit
        if len(text) > 5000:
            return jsonify({
                'success': False,
                'error': 'Text is too long. Maximum allowed length is 5000 characters.'
            }), 400

        # 4. Validate target language
        if target_lang == 'auto' or target_lang not in SUPPORTED_LANGUAGES:
            return jsonify({
                'success': False,
                'error': 'Please select a valid target language.'
            }), 400

        # 5. Check for identical languages
        if source_lang == target_lang and source_lang != 'auto':
            return jsonify({
                'success': False,
                'error': 'Source and Target languages cannot be the same. Please choose different languages.'
            }), 400

        # 6. Execute translation through resilient pipeline
        translated_result = execute_translation(text, source_lang, target_lang)

        # 7. Return success response
        return jsonify({
            'success': True,
            'original_text': text,
            'translated_text': translated_result,
            'source_lang': source_lang,
            'target_lang': target_lang,
            'source_lang_name': SUPPORTED_LANGUAGES.get(source_lang, 'Auto Detect'),
            'target_lang_name': SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        }), 200

    except Exception as e:
        print(f"❌ Server Error during translation: {e}")
        return jsonify({
            'success': False,
            'error': f'Translation error: {str(e)}'
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 LinguaVerse Translator running at: http://127.0.0.1:{port}")
    app.run(debug=True, host='0.0.0.0', port=port)
