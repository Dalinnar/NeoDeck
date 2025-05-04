import os
import locale
from settings import BASE_DIR
import time
from functools import lru_cache

# Global state
lang_files = {}
languages_info = []
default_lang = 'en_US'
lang_files_dir = ''
misc_lang_files_dir = ''
_temp_overrides_cache = {}
_file_last_modified = {}


def parse_lang_file(path: str) -> dict:
    """Parse a language file into a dictionary."""
    lang_dict = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith(("//", "#")):
                try:
                    key, value = line.split("=", 1)
                    lang_dict[key.strip()] = value.strip()
                except ValueError as e:
                    raise ValueError(f"Invalid line format: {line}") from e
    return lang_dict


def load_lang_file(lang, lang_file_path=None) -> dict:
    """Load a language file by name or path (preserved for backwards compatibility)."""
    # If a direct path is provided, parse it immediately
    if lang_file_path and os.path.isfile(lang_file_path):
        return parse_lang_file(lang_file_path)

    # Check standard locations
    search_paths = []
    if lang_files_dir:
        search_paths.append(os.path.join(lang_files_dir, f"{lang}.lang"))
    if misc_lang_files_dir:
        search_paths.append(os.path.join(misc_lang_files_dir, f"{lang}.lang"))

    for path in search_paths:
        if os.path.isfile(path):
            return parse_lang_file(path)

    # If not found in standard locations, search recursively
    if lang_files_dir:
        for root, _, files in os.walk(lang_files_dir):
            for file in files:
                if file.endswith(".lang") and file.startswith(lang):
                    return parse_lang_file(os.path.join(root, file))

    # If language is already loaded in memory, return that instead of failing
    if lang in lang_files:
        return lang_files[lang]

    raise FileNotFoundError(f"Language file for '{lang}' not found.")


@lru_cache(maxsize=32)
def get_language(lang=None) -> str:
    """Get the language code, with caching for performance."""
    lang = lang or get_system_language()
    return next((l for l in lang_files if l.lower().startswith(lang.lower())), default_lang)


def language_exists(language_code=None) -> bool:
    """Check if a language exists."""
    if not language_code:
        return False
    resolved = get_language(language_code)
    return resolved in lang_files and resolved.lower() == language_code.lower()


def set_default_language(lang: str) -> None:
    """Set the default language."""
    global default_lang
    if lang.lower() == 'system':
        lang = get_system_language()
    if language_exists(lang):
        default_lang = lang
    else:
        print(f"Language '{lang}' not found. Keeping default: '{default_lang}'")


def batch_load_lang_files() -> dict:
    """Load all language files at once to reduce file operations."""
    loaded_files = {}
    file_paths = {}
    
    # First, collect all file paths
    if os.path.isdir(lang_files_dir):
        for file in os.listdir(lang_files_dir):
            if file.endswith(".lang"):
                lang = file.split(".")[0]
                file_paths[lang] = os.path.join(lang_files_dir, file)
                _file_last_modified[file_paths[lang]] = os.path.getmtime(file_paths[lang])
                loaded_files[lang] = {'misc': False}
    
    if misc_lang_files_dir and os.path.isdir(misc_lang_files_dir):
        for file in os.listdir(misc_lang_files_dir):
            if file.endswith(".lang"):
                lang = file.split(".")[0]
                if lang not in file_paths:
                    file_paths[lang] = os.path.join(misc_lang_files_dir, file)
                    _file_last_modified[file_paths[lang]] = os.path.getmtime(file_paths[lang])
                    loaded_files[lang] = {}
                loaded_files[lang]['misc'] = True
    
    # Then parse all files in one batch
    for lang, path in file_paths.items():
        loaded_files[lang].update(parse_lang_file(path))
    
    # Pre-load temp overrides for common languages
    temp_dir = os.path.join(BASE_DIR, ".temp", "languages")
    if os.path.isdir(temp_dir):
        for file in os.listdir(temp_dir):
            if file.endswith(".lang"):
                lang = file.split(".")[0]
                path = os.path.join(temp_dir, file)
                _temp_overrides_cache[lang] = parse_lang_file(path)
                _file_last_modified[path] = os.path.getmtime(path)
    
    return loaded_files


def reload_all_lang_files():
    """Reload all language files."""
    global lang_files, _temp_overrides_cache
    lang_files = batch_load_lang_files()
    _temp_overrides_cache = {}  # Clear cache on reload
    get_language.cache_clear()  # Clear the LRU cache


def get_languages_info(current_lang_files=None) -> list:
    """Get information about available languages."""
    current_lang_files = current_lang_files or lang_files
    if not current_lang_files:
        current_lang_files = batch_load_lang_files()

    return [{
        'code': lang,
        'code_short': data.get('lang_code', ''),
        'native_name': data.get('native_name', ''),
        'english_name': data.get('english_name', ''),
        'author_name': data.get('author_name', ''),
        'author_github_username': data.get('author_github_username', ''),
        'misc': data.get('misc', False),
    } for lang, data in current_lang_files.items()]


def get_system_language() -> str:
    """Get the system language."""
    system_lang = locale.getdefaultlocale()[0]
    return system_lang if system_lang else default_lang


def init(lang_files_directory=None, misc_lang_files_directory=None, default_language=None):
    """Initialize the language system."""
    global languages_info, lang_files_dir, misc_lang_files_dir

    if not lang_files_directory:
        raise ValueError("'lang_files_directory' must be specified")

    lang_files_dir = lang_files_directory
    misc_lang_files_dir = misc_lang_files_directory or misc_lang_files_dir

    # Load all languages at once
    reload_all_lang_files()
    set_default_language(default_language or default_lang)
    languages_info = get_languages_info()
    return languages_info


def get_temp_overrides(lang: str) -> dict:
    """Get temporary overrides for a language with caching."""
    if lang in _temp_overrides_cache:
        path = os.path.join(BASE_DIR, ".temp", "languages", f"{lang}.lang")
        if os.path.isfile(path):
            current_mtime = os.path.getmtime(path)
            if path in _file_last_modified and current_mtime > _file_last_modified[path]:
                # File changed, reload it
                _temp_overrides_cache[lang] = parse_lang_file(path)
                _file_last_modified[path] = current_mtime
        return _temp_overrides_cache[lang]
    
    path = os.path.join(BASE_DIR, ".temp", "languages", f"{lang}.lang")
    if os.path.isfile(path):
        _temp_overrides_cache[lang] = parse_lang_file(path)
        _file_last_modified[path] = os.path.getmtime(path)
        return _temp_overrides_cache[lang]
    
    _temp_overrides_cache[lang] = {}
    return {}


# Create a merged language dictionary to avoid repeated merges
_merged_lang_cache = {}
_merged_lang_timestamp = {}

def get_merged_lang_dict(lang):
    """Get a merged language dictionary, including all overrides."""
    global _merged_lang_cache, _merged_lang_timestamp
    
    current_time = time.time()
    cache_key = lang
    
    # Use cached version if recent (within 5 seconds)
    if cache_key in _merged_lang_cache and cache_key in _merged_lang_timestamp:
        if current_time - _merged_lang_timestamp[cache_key] < 5:
            return _merged_lang_cache[cache_key]
    
    # Start with English (base language)
    merged = lang_files.get("en_US", {}).copy()
    
    # Add English overrides
    en_overrides = get_temp_overrides("en_US")
    merged.update(en_overrides)
    
    # Add target language and its overrides if different from English
    if lang != "en_US":
        if lang in lang_files:
            merged.update(lang_files[lang])
        
        lang_overrides = get_temp_overrides(lang)
        merged.update(lang_overrides)
    
    # Cache the result
    _merged_lang_cache[cache_key] = merged
    _merged_lang_timestamp[cache_key] = current_time
    
    return merged


def text(text=None, lang=None) -> str:
    """Get a translated text string."""
    if not text:
        return ""
    
    lang = get_language(lang or default_lang)
    merged = get_merged_lang_dict(lang)
    
    return merged.get(text, text)


def get_new_text(lang=None) -> dict:
    """Get all translations for a language."""
    lang = get_language(lang or default_lang)
    return get_merged_lang_dict(lang)