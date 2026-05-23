# languages.md

## Language System

NeoDeck includes a built-in translation system with support for:

* multiple languages
* plugin language overrides
* runtime language merging
* fallback translations
* metadata support
* hot-loaded plugin translations

Language files use a simple `.lang` format.

* * *

# Language File Format

Language files follow:

```
key=value
```

Example:

```
save=Save
cancel=Cancel
hello=Hello World
```

* * *

# Comments

Lines starting with:

```
// comment
# comment
```

are ignored.

Example:

```
// Main UI
save=Save

# Buttons
play=Play
```

* * *

# File Naming

Language files should use locale-style names.

Examples:

```
en_US.lang
es_ES.lang
fr_FR.lang
pt_BR.lang
```

* * *

# Plugin Language Folder

Plugins must place translations inside:

```
languages/
```

Example:

```
my_plugin/
├── languages/
│   ├── en_US.lang
│   └── es_ES.lang
```

* * *

# Automatic Plugin Merging

When plugins load:

1. NeoDeck scans all plugin `languages/` folders
2. All `.lang` files are parsed
3. Keys are merged into temporary runtime language files

Generated files are stored in:

```
.temp/languages/
```

* * *

# Translation Priority

NeoDeck resolves translations in this order:

## 1. Base English

```
en_US
```

acts as the fallback language.

* * *

## 2. Base Selected Language

Example:

```
es_ES
```

* * *

## 3. Plugin Overrides

Plugin translations override existing keys.

Example:

```
save=Guardar Plugin
```

will replace the default translation.

* * *

# Fallback Behavior

If a key does not exist:

```
text("missing_key")
```

NeoDeck returns:

```
missing_key
```

This helps identify missing translations during development.

* * *