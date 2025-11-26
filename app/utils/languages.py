import os
import locale
from settings import BASE_DIR

# Global state
lang_files = {}
languages_info = []
default_lang = 'en_US'
lang_files_dir = ''
misc_lang_files_dir = ''


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
                except ValueError:
                    raise ValueError(f"Invalid line format: {line}")
    return lang_dict


def load_lang_file(lang, lang_file_path=None) -> dict:
    """Load a language file by name or path (preserved for backwards compatibility)."""
    if lang_file_path and os.path.isfile(lang_file_path):
        return parse_lang_file(lang_file_path)

    search_paths = []
    if lang_files_dir:
        search_paths.append(os.path.join(lang_files_dir, f"{lang}.lang"))
    if misc_lang_files_dir:
        search_paths.append(os.path.join(misc_lang_files_dir, f"{lang}.lang"))

    for path in search_paths:
        if os.path.isfile(path):
            return parse_lang_file(path)

    if lang_files_dir:
        for root, _, files in os.walk(lang_files_dir):
            for file in files:
                if file.endswith(".lang") and file.startswith(lang):
                    return parse_lang_file(os.path.join(root, file))

    if lang in lang_files:
        return lang_files[lang]

    raise FileNotFoundError(f"Language file for '{lang}' not found.")


def get_language(lang=None) -> str:
    """Get the language code."""
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

    if os.path.isdir(lang_files_dir):
        for file in os.listdir(lang_files_dir):
            if file.endswith(".lang"):
                lang = file.split(".")[0]
                file_paths[lang] = os.path.join(lang_files_dir, file)
                loaded_files[lang] = {'misc': False}

    if misc_lang_files_dir and os.path.isdir(misc_lang_files_dir):
        for file in os.listdir(misc_lang_files_dir):
            if file.endswith(".lang"):
                lang = file.split(".")[0]
                if lang not in file_paths:
                    file_paths[lang] = os.path.join(misc_lang_files_dir, file)
                    loaded_files[lang] = {}
                loaded_files[lang]['misc'] = True

    for lang, path in file_paths.items():
        loaded_files[lang].update(parse_lang_file(path))

    return loaded_files


def reload_all_lang_files():
    """Reload all language files."""
    global lang_files
    lang_files = batch_load_lang_files()


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

    reload_all_lang_files()
    set_default_language(default_language or default_lang)
    languages_info = get_languages_info()
    return languages_info


def get_temp_overrides(lang: str) -> dict:
    """Get temporary overrides for a language without cache."""
    path = os.path.join(BASE_DIR, ".temp", "languages", f"{lang}.lang")
    if os.path.isfile(path):
        return parse_lang_file(path)
    return {}


def get_merged_lang_dict(lang):
    """Get a merged language dictionary, including all overrides."""
    merged = lang_files.get("en_US", {}).copy()
    merged.update(get_temp_overrides("en_US"))

    if lang != "en_US":
        if lang in lang_files:
            merged.update(lang_files[lang])
        merged.update(get_temp_overrides(lang))

    return merged


def text(key=None, lang=None) -> str | dict:
    """Get a translated string if key is given, or full language dict if key is None."""
    lang = get_language(lang or default_lang)
    merged = get_merged_lang_dict(lang)

    if key is None:
        return merged
    return merged.get(key, key)