# Number Formatting

ECMA-376 includes general guidelines for number formatting specifiers.  `MS-XLS`
has a sketch ABNF grammar


### Auto-Correcting Number Formats

Google Sheets and other third party writers employ number formats that are do
not follow the formal grammar.  Excel will transparently auto-correct them when
round-tripping.  Some of the known autocorrections are listed below:

| Format | Correction |
|:-------|:-----------|
| `d.m`  | `d\.m`     |


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
