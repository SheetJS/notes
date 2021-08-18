# XLSB Short Records

There are 7 undocumented XLSB records (record types 12-18) that Excel supports.
They appear to specify cells using a "Short" cell structure

## Cell Structures

XLSB Cell structures are 8 bytes with the following layout:

```
column index (4 bytes)
style index (3 bytes)
flags (1 byte)
```

A "Short" structure is 4 bytes and omits the column:

```
style index (3 bytes)
flags (1 byte)
```

The actual column index is understood to be the column after the previous cell.
For example, if D3 was the last cell, a record using the Short structure is
defining cell E3.

## Cell Records

The various cell records (BrtCellBlank, BrtCellBool, etc) consist of a Cell
structure followed by the cell data.  The various formula records (BrtFmlaBool,
BrtFmlaError, etc) append the formula structure to the base cell record.

The "Short" cell records follow similar patterns but omit the 4-byte column
field from the cell structure.

For example, record type 18 "BrtShortIsst" is the short form of BrtCellIsst.

BrtCellIsst has the following layout:

```
column index (4 bytes)
style index (3 bytes)
flags (1 byte)
shared string table index (4 bytes)
```

BrtShortIsst omits the column index:

```
style index (3 bytes)
flags (1 byte)
shared string table index (4 bytes)
```

## Records

| Record | Name          | Long Cell Record |
|-------:|:--------------|:-----------------|
|   `12` | BrtShortBlank | BrtCellBlank     |
|   `13` | BrtShortRk    | BrtCellRk        |
|   `14` | BrtShortError | BrtFmlaError     |
|   `15` | BrtShortBool  | BrtCellBool      |
|   `16` | BrtShortReal  | BrtCellReal      |
|   `17` | BrtShortSt    | BrtCellSt        |
|   `18` | BrtShortIsst  | BrtCellIsst      |

Record 13 is informally referred to as "BrtShortRk".  It is the short form of
BrtCellRk.  BrtCellRk is a 12 byte structure:

```
column index (4 bytes)
style index (3 bytes)
flags (1 byte)
value stored as RkNumber (4 bytes)
```

The short form BrtShortRk is therefore an 8 byte structure:

```
style index (3 bytes)
flags (1 byte)
value stored as RkNumber (4 bytes)
```

## Test Files

- [`brt_str.xlsb`](./brt_str.xlsb) includes types 12,13,14,15,16,17
- [`brt_sst.xlsb`](./brt_sst.xlsb) includes types 12,13,14,15,16,18

[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
