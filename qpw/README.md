# Quattro Pro File Format

QPW workbooks are structurally similar to other binary formats like Lotus WK\#

### CFB Container

Modern QPW files use the same CFB container as XLS.

The actual stream name has changed over the years but the typical names are
`PerfectOffice_MAIN` and `NativeContent_MAIN`.

## Stream Structure

Like Lotus, the QPW stream consists of an array of records with 16-bit lengths
and 16-bit record types.

For QPW streams, the BOF version field typically encodes "QPW" in ASCII.

### Record Organization

Each file is divided into a notebooks (typically one notebook per file).  Each
notebook is divided into a series of worksheets.

Each worksheet is divided into a series of columns and data cells are stored
within each column block.

Each part of the file is wrapped with beginning and ending records.  The end
record type is typically one larger than the beginning record type.

| Part      | Begin Type | End Type |
|:----------|-----------:|---------:|
| File      |   `0x0001` | `0x0002` |
| Notebook  |   `0x0401` | `0x0402` |
| Worksheet |   `0x0601` | `0x0602` |
| Column    |   `0x0A01` | `0x0A02` |

### Data Records

Record `0x0407` encodes the shared string table, scoped to the notebook.

Record `0x0C01` encodes multiple cells, similar to XLS `MulRk`. It is contained
in a column block.

## Resources

Notes were included as part of the WordPerfect Office SDK. In older versions of
WordPerfect Office Suite, the SDK was included as part of the Professional 
Edition (but not the standard edition).  For recent releases, the only way to
obtain the documentation is to inquire with Corel Corporation.
