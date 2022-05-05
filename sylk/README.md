# Symbolic Link format

Files start with `ID` (`0x49 0x44`).  Files are interpreted as plaintext in the
system ANSI codepage.

This is a native file format of Multiplan and has been supported in all versions
of Excel for Windows (to date).  It is also used in the game "Warcraft III" and
various mods including "Defense of the Ancients".

## Basics

**Records**

The file consists of a series of plaintext records.  Records are separated by
newline characters (both `\r\n` and `\n` newlines are accepted by newer versions
of Excel, but generated files should prefer CRLF).

As stated in the Multiplan manual, "parsers must be prepared to ignore records
and fields that they do not understand".  Loosely speaking, software can report
error messages on each unsupported record but should read valid records.

**Fields**

A record consists of a record type and a series of fields.  Each part of the
record is separated by a single `;` character.

The literal semicolon is encoded as two consecutive semicolons `;;`.  Example:

```
C;Y1;X1;K"abc;;def"
```

### Global State

The `Y` and `X` fields set the current row / column before processing records.
Parsing is stateful.  Records that apply to a specific cell but do not have `X`
or `Y` fields will use the global state:

```sylk
F;M4;Y1;X1  <-- set current cell to A1
// current cell is A1
C;K"A1"     <-- set cell value to "A1"
F;M5;X2     <-- set current column to B (no Y -> row is unchanged)
// current cell is B1
C;K"C1";X3  <-- set current column to C, then assign value "C1"
// current cell is C1
C;K"C2";Y2  <-- set current row to 2, then assign value "C2"
// current cell is C2
F;M4        <-- set current cell style
```

This also means that records must be processed in order.

### Encoding

In addition to the escaped semicolon, Excel understand two types of Encodings.
They are not covered in the Multiplan documentation.

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

The following table lists the known record types.

| Type | Description                      | Vintage   |
|:-----|:---------------------------------|:----------|
| `ID` | [Header](#header-id)             | Multiplan |
| `P`  | [Style](#style-p)                | Excel     |
| `F`  | [Format](#format-f)              | Multiplan |
| `B`  | [Dimensions](#dimensions-b)      | Multiplan |
| `O`  | [Options](#options-o)            | Excel     |
| `NN` | [Defined Name](#defined-name-nn) | Multiplan |
| `C`  | [Cell](#cell-c)                  | Multiplan |
| `E`  | [EOF](#eof-e)                    | Multiplan |
| `W`  | Window Layout                    | Multiplan |
| `NE` | External Link                    | Multiplan |
| `NU` | Filename Substitution            | Multiplan |
| `NL` | Chart External Link              | Excel     |

The supported fields for each type are listed in the relevant subsections. Excel
supports every field that Multiplan supports.

### Header (ID)

Files must start with the `ID` record.

_Multiplan_

The `P` field specifies the name of the program that generated the file.  This
record is not validated, although the typical value `WXL` is used in Excel.

### Style (P)

_Undocumented_

The `P` record encodes data for multiple style tables, based on the fields. Each
table is zero-indexed.

```sylk
ID;PWXL;N;E
P;PGeneral
P;P0
P;P0.00
P;P#,##0
```

The 4 `P` records above are number format records.  In the number format table,
index 0 will be `General`, index 1 will be `0`, etc.

#### Number Format Table

The `P` field indicates that the record specifies a number format.  The value is
an escaped number format similar to XLS encoding.  `;;` encodes a semicolon as
used in a multi-part number format.  For example:

```sylk
P;P#,##0.00_);;[Red]\(#,##0.00\)
```

corresponds to the XLSX number format `#,##0.00_);[Red]\(#,##0.00\)`

#### Font Table

The four default fonts (normal, bold, italic, bold+italic) are specified with
the `F` field.  Other fonts are specified with the `E` field.  It appears that
Excel treats the fields as interchangeable, so either field type can be used.

Other supported fields are listed below:

| Field | Interpretation                          |
|------:|:----------------------------------------|
| `F/E` | Font name                               |
|   `M` | Font size in twips                      |
|   `L` | Indexed color (from 1 to 64)            |
|   `S` | Font Attributes (see table below)       |

The `S` field value is a list of attribute characters:

| Value | Interpretation |
|------:|:---------------|
|   `B` | Bold           |
|   `I` | Italic         |
|   `U` | Underline      |
|   `S` | Strikeout      |

### Format (F)

This record includes worksheet-level and cell-level formatting properties.  The
fields and interpretations vary based on position in the file.

#### Common Value Types

Multiplan "Cell Type" format codes:

| Value | Interpretation    | Multiplan name |
|:------|:------------------|:---------------|
| `D`   | Default           | Def            |
| `C`   | "Continuous"      | Cont           |
| `E`   | Exponential       | Exp            |
| `F`   | Fixed Point       | Fix            |
| `G`   | General           | Gen            |
| `$`   | Currency          | Dollar         |
| `*`   | Data Bar Cond Fmt | Bar Graph      |
| `%`   | Percentage        | Percent        |

Note that there is an error in the `sylksum.doc` documentation: `C` is a normal
format (the spec claims it is "currency")

Multiplan "Horizontal Alignment" format codes:

| Value | Interpretation                     | XLS HorizAlign  |
|:------|:-----------------------------------|:----------------|
| `D`   | Default                            |                 |
| `G`   | General (text left, numbers right) | `0x00 ALCGEN`   |
| `L`   | Left                               | `0x01 ALCLEFT`  |
| `C`   | Center                             | `0x02 ALCCTR`   |
| `R`   | Right                              | `0x03 ALCRIGHT` |
| `X`   | Fill                               | `0x04 ALCFILL`  |
| `-`   | Unspecified                        | `0xFF ALCNIL`   |

#### Default Styling (immediately after P records)

The records in this area typically define high-level properties including the
default format and column widths.

| Field    | Interpretation                                                   |
|:---------|:-----------------------------------------------------------------|
| `P#`     | Default number format (index into table)                         |
| `M#`     | Default row height in twips                                      |
| `D_#_#`  | Default cell type, decimals, horizontal alignment, column width  |

For example, the following record sets the default number format to index 0,
the default cell type to "General", the left cell alignment to left, the default
column width to 8 characters, and the default row height to 32 pt:

```sylk
F;P0;DG0L8;M640
```

#### Column Widths (immediately after O record)

The `W` field specifies widths for multiple columns and takes the form:

```sylk
F;W# # # <-- 1-indexed start col, 1-indexed end col, width in characters
```

The first two parameters are the starting and ending column (1-indexed numbers)
and the last parameter is the width as measured in characters.  When specifying
a single column width, the start and end should be equal:

```sylk
F;W1 1 11 <-- column "A" is 11 characters wide
F;W2 3 6  <-- columns "B" and "C" are 6 characters wide
```

#### Cell Styling (interspersed with cell records)

Cell level styling is distinguished by the absence of the `W`, `R`, `D` and `C`
fields or the presence of the `X` or `Y` fields.

`X` and `Y` fields modify the global state before applying formatting.

| Field  | Interpretation                                           |
|:-------|:---------------------------------------------------------|
| `F_#_` | Simple format: cell type, decimals, horizontal alignment |
| `S...` | Style string (see below)                                 |
| `P#`   | Number format (index into format table)                  |

The style string can include the following attributes: 

| Value | Interpretation |
|:------|:---------------|
| `D`   | Bold           |
| `I`   | Italic         |
| `M#`  | Font index     |
| `L`   | Left Border    |
| `R`   | Right Border   |
| `T`   | Top Border     |
| `B`   | Bottom Border  |
| `S`   | Fill "gray125" |

#### Row Heights and Styling (after column widths, before first cell of row)

The `R` field indicates that a format record applies to the specified row.  In
addition to the cell styling properties, the row height can be specified with
the `M` field.

For example, the following record sets the height of row 5 to 19 pt and sets
the font to index 78 of the font table:

```sylk
F;R5;SM78;M380 <-- use index 78 of font table and set height to 19 pt for row 5
```

#### Column Styling (after column widths, before first cell of column)

The `C` field indicates that a format record applies to the specified column. As
column widths are handled separately, the supported fields are identical to the
cell-level styling fields:

```sylk
F;C1;SM78 <-- use index 78 of font table for column 1 
```

### Dimensions (B)

The bounds are not authoritative, and cells can exist outside of the range.
As with XLSX/XLSB/XLS, Excel ignores this field and uses the actual cell records
to determine the dimensions. 

_Multiplan_

The `Y` and `X` fields specify the number of rows and columns respectively.

_Undocumented_

The `D` field specifies the worksheet dimensions, in the order `r c R C` with
zero-indexed values.  For example:

```sylk
B;Y5;X3;D3 1 4 2
```

Multiplan will interpret the dimensions based on the `Y` and `X` field, assuming
an origin of `A1`.  This would be `A1:C5` in the example.

Excel will use `3 1 4 2` which is `B4:C5` (`3 1` cell `B4` and `4 2` cell `E5`)

### Options (O)

This record includes a number of workbook-level settings

_Excel_

Field interpretations in quotes do not appear to be used in Excel 2019.

|  Field | Interpretation                                              |
|:-------|:------------------------------------------------------------|
| `A# #` | XLS CalcIter / CalcDelta (enables iterative calculation)    |
| `C`    | "Completion test at current cell"                           |
| `P`    | "Sheet is protected (but no password)."                     |
| `L`    | Use A1-style formulae (default is R1C1 formulae)            |
| `M`    | Manual recalculation (XLS CalcMode 0)                       |
| `R`    | Precision as displayed (XLS CalcPrecision 0)                |
| `E`    | "File is a macrosheet"                                      |

_Undocumented_

|  Field | Interpretation                                                   |
|:-------|:-----------------------------------------------------------------|
| `G# #` | XLS CalcIter / CalcDelta (does not enable iterative calculation) |
| `V#`   | Date system: (0 = 1900, 1/2/3/4 = 1904)                          |
| `K#`   | currently unknown (Value must be between 1 and 255)              |
| `D`    | currently unknown                                                |
| `B`    | currently unknown                                                |
| `S`    | currently unknown (found in Warcraft III files)                  |

### Defined Name (NN)

The `N` field of the `NN` record is the name of the defined name.

The `E` field is the expression (interpreted as R1C1 or A1-style depending on
the presence or absence of the `L` field in the `O` record.

```sylk
NN;N_rng;ER4C3:R7C4            <-- name "_rng" reference to `$C$4:$D$7`
NN;N_arr;E{"a","b","c";;1,2,3} <-- name "_arr" excel array {"a","b","c";1,2,3}
```

### Cell (C)

`X` and `Y` fields modify the global state before applying cell values.

The `K` field specifies the cell value.  Numbers are specified as-is.  Text
should be wrapped in double quotes.  Logical values are specified as TRUE/FALSE.
Dates should be specified using the date codes after applying the appropriate
number format (behavior identical to XLS):

```sylk
ID;PWXL;N;E
P;PGeneral   <-- format 0 is "General"
P;Pm/d/yy    <-- format 1 specifies the default Date format
C;Y1;X1;K123 <-- set cell A1 value to the number 123
C;X2;K"123"  <-- set cell B1 value to the string "123"
C;X3;KTRUE   <-- set cell C1 value to the logical TRUE
F;Y2;P1      <-- move to cell C2, set number format to date
C;K44444     <-- set cell C2 value to the number 44444 (formatted date 9/5/21)
E
```

The `E` field specifies a formula. If the formula is included, it must be
consistent with the worksheet expression style (A1 or R1C1) in the `O` record.

#### Comments

The `A` field of the `C` record can specify plaintext comments. They are encoded
using the same text encoding in `K` fields.

```sylk
C;Y4;X2;AHello! <-- sets comment on cell B4 to "Hello!"
```

[`comment.slk`](./comment.slk) includes a few comments with newline encoding.

#### Shared Formulae

The `S` field of the `C` record signals that a cell is using a shared formula.
The `R` and `C` fields are the 1-indexed row and column indices of the cell with
the formula.  The formula should be extracted from the original location and
shifted to the current cell (relative references adjusted by the offset).

```sylk
C;Y1;X1;K1          <-- cell A1=1
C;Y2;K2;ER[-1]C+1   <-- cell B1=A1+1 (both column and row relative)
C;Y3;K3;S;R2;C1     <-- cell C1=B1+1 (shifting formula from B1 +1 row)
C;X2;K3;S;R2;C1     <-- cell C2=B2+1 (shifting formula from B1 +1 row +1 col)
```

[`shared_formula.slk`](./shared_formula.slk) includes a few shared formulae.

### EOF (E)

This must be the last record of the file.  There are no fields.


## References

The Multiplan manual (1982) includes an appendix covering the SYLK format.

`sylksum.doc` (1986) with author `MCK, Microsoft` was available on a Microsoft
server.  Public references to its existence date back to the 20th century.

Günter Born's "The File Formats Handbook" expands upon `sylksum.doc`.  While the
core details are covered in official specs, the chart extension details are not
covered in the public specifications.


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
