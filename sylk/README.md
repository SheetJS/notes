# Symbolic Link format

Files start with `ID` (`0x49 0x44`).  Files are interpreted as plaintext in the
system ANSI codepage.


## Basics

The file consists of a series of plaintext records.  Records are separated by
newline characters (both `\r\n` and `\n` newlines are accepted by newer versions
of Excel, but generated files should prefer CRLF).

### Fields

A record consists of a record type and a series of fields.  Each part of the
record is separated by a single `;` character.

The literal semicolon is encoded as two consecutive semicolons `;;`.  Example:

```
C;Y1;X1;K"abc;;def"
```

### Encoding

In addition to the escaped semicolon, Excel understand two types of Encodings:

#### Raw Byte Trigrams

Trigrams matching the pattern `\x1B[\x20-\x2F][\x30-\x3F]` are decoded into a
single byte whose high bits are taken from the second character and whose low
bits are taken from the third character.

For example. `"\x1B :" == "\x1B\x20\x3A` encodes the byte `"\x0A"` (newline)

`"\x1B#;` encodes a literal semicolon.

#### Special Escapes

Excel also understands a set of special escapes that start with `\x1BN`.  For
clarity, the `\x1BN` part is not included in the table:

|    |  0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 |  A |  B |  C |  D |  E |  F |
|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|`0_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`1_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`2_`|    |    | `*`| `&`|    |    |    | `)`|    |    |    |    |    | `P`|    |    |
|`3_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`4_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`5_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`6_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`7_`|    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|`8_`|    |    |    |    |    |    |    |    |    |    |    |    | `j`|    |    |    |
|`9_`|    |    |    |    |    |    |    |    |    |    |    |    | `z`|    |    |    |
|`A_`|    | `!`| `"`| `#`| `(`| `%`|    | `'`|`H `| `S`| `c`| `+`|    |    | `R`|    |
|`B_`|`J `| `1`| `2`| `3`|`B `| `5`| `6`| `7`|    | `Q`| `k`| `;`| `<`| `=`| `>`| `?`|
|`C_`|`AA`|`BA`|`CA`|`DA`|`HA`|`JA`| `a`|`KC`|`AE`|`BE`|`CE`|`HE`|`AI`|`BI`|`CI`|`HI`|
|`D_`| `b`|`DN`|`AO`|`BO`|`CO`|`DO`|`HO`|    | `i`|`AU`|`BU`|`CU`|`HU`|    | `l`| `{`|
|`E_`|`Aa`|`Ba`|`Ca`|`Da`|`Ha`|`Ja`| `q`|`Kc`|`Ae`|`Be`|`Ce`|`He`|`Ai`|`Bi`|`Ci`|`Hi`|
|`F_`| `s`|`Dn`|`Ao`|`Bo`|`Co`|`Do`|`Ho`|    | `y`|`Au`|`Bu`|`Cu`|`Hu`|    | `|`|`Hy`|

For example, `\x1BNj` encodes byte `0x8C`

- Both `\x1BN0` and `\x1BNJ ` appear to encode `0xB0`
- Both `\x1BN9` and `\x1BN)` appear to encode `0x27`
- Bytes `0xA8`, `0xB0` and `0xB4` have space characters (` `) after the letter.
  Byte `0xA8` is encoded as `\x1BNH\x20`


## Record Types

| Record Type | Description          |
|:------------|:---------------------|
| `ID`        | Header               |
| `E`         | EOF                  |
| `B`         | Worksheet Dimensions |
| `O`         | Options              |
| `P`         | Number Format        |
| `F`         | Formatting           |
| `C`         | Cell                 |


## EOF Record (E)

There are no fields.


## Cell Record (C)


### Comments

The `A` field of the `C` record can specify plaintext comments. They are encoded
using the same text encoding in `K` fields.

### Shared Formulae

The `S` field of the `C` record signals that a cell is using a shared formula.
The `R` and `C` fields are the 1-indexed row and column indices of the cell with
the formula.  The formula should be extracted from the original location and
shifted to the current cell (relative references adjusted by the offset).



[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
