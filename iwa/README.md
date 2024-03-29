# iWork 2013+

There are three different styles of iWork files:

1) The macOS applications generate ZIP files which contain the metadata and
special `.iwa` files which hold the file data.

2) iCloud persistence on macOS is a folder based structure containing an
`Index.zip` file which is "similar" to the macOS standalone file structure.

3) [The web iCloud editors](https://icloud.com) export ZIP files which contain
an `Index.zip` file similar to iCloud persistence.  Note that this is literally
a ZIP file within a ZIP file

The `Index.zip` file has an identical structure to an actual file generated by
the macOS applications, so the discussion is applicable to all file styles.

The ZIP container holds a number of Mac binary "property list" files (`.plist`)
which can be safely ignored or blanked.  It also can hold preview images that
can be safely ignored.

## File Structure

The iWork file (`.KEY`, `.NUMBERS`, `.PAGES`) is a ZIP file containing a number
of `.iwa` entries.  The primary entrypoint is `/Index/Document.iwa`.

`TSPersistence.framework` handles the byte-level operations for the files.

`.iwa` files are sequential blocks of compressed data.  Each "block" starts with
a 4-byte header consisting of a `0` byte followed by the compressed length
(stored as a 3-byte little-endian integer)

Each block follows the Snappy compressed format as described in
[the format description from the snappy repo](./snappy_format.txt).  iWork
apps do not expect a particular compression level, and it is possible to create
the equivalent of a "STORED" block.

## Protocol Buffers

Most of the data is stored in Protocol Buffer ("protobuf") wire messages.

The iWork apps (Keynote, Numbers, Pages) include embedded Protocol Buffers
definitions as part of the file format processors.

The [`otorp` package on `npm`](https://npm.im/otorp) ships with a command-line
tool for extracting definitions from a Mach-O binary.

Note that some fields marked as `required` have been changed to `optional` in
later versions.  File parsers should assume all fields are optional.

### App-Specific Definitions

The listed definitions only appear in one app:

**Keynote**
- `KNArchives.proto`
- `KNArchives.sos.proto`
- `KNCommandArchives.proto`
- `KNCommandArchives.sos.proto`

**Numbers**
- `TNArchives.proto`
- `TNArchives.sos.proto`
- `TNCommandArchives.proto`
- `TNCommandArchives.sos.proto`

**Pages**
- `TPArchives.proto`
- `TPCommandArchives.proto`
- `TPCommandArchives.sos.proto`

The other files are common across the apps.

## Data Storage

The decompressed data is a series of chunks.

Each chunk starts with a `length` stored in a Base 128 `varint`, followed by a
protobuf packet of type `.TSP.ArchiveInfo`.

The `.TSP.ArchiveInfo` message contains a number of `.TSP.MessageInfo` messages
(tag 2). Each `MessageInfo` has a `length` field (tag 3, type `uint32`) for the
actual message body.  The data for the message bodies are stored immediately
after the `ArchiveInfo`, in the same order as the `MessageInfo` parts.

The message type from the `MessageInfo` (tag 1, type `uint32`) corresponds to a
dynamic registry spread across the embedded frameworks.  The actual message data
is a protobuf packet.

### Dynamic Registry and Message Types

The `.TSP.Reference` type acts as a pointer, referencing another message.  The
references do not include message type info, so readers and writers must be
aware of the message types and their interpretations.

Each framework is responsible for registering message types with the master
registry by sending specific messages like `setMessageType`. Some relevant
message types for Numbers files are listed below:

| type | message                  |
|-----:|:-------------------------|
|    1 | `.TN.DocumentArchive`    |
|    2 | `.TN.SheetArchive`       |
| 6000 | `.TST.TableInfoArchive`  |
| 6001 | `.TST.TableModelArchive` |
| 6002 | `.TST.Tile`              |

All referenced types must be registered, but ancillary types do not need to be
registered.  For example:

```proto
message .TST.TableInfoArchive {
  // ...
  required .TSP.Reference tableModel = 2;
  // ...
}

message .TST.TableModelArchive {
  // ...
  required .TST.DataStore base_data_store = 4;
  // ...
}
```

The reference in field 2 from `.TST.TableInfoArchive` is expected to be of type
`.TST.TableModelArchive` so the latter must be registered.

`.TST.DataStore` is the type of field 4 from `.TST.TableModelArchive`. Since it
is not referenced indirectly, the message type does not have to be registered.

_Discovering the registry mapping_

There are two approaches to discovering the registry mapping:

1) Search in the frameworks for places where `setMessageType` is sent.

2) Run the program in a debugger and inspect `[TSPRegistry sharedRegistry]`:

The latter approach was publicly documented by Sean Patrick O'Brien.  A fully
automated script runs on Intel Macs:

```bash
deno run -A https://oss.sheetjs.com/notes/iwa/dump_registry.ts
```

## Document Structure

The iWork apps start from the `DocumentArchive` message, whose definition
varies between formats.

### Numbers

The root message (type 1) has the following structure:

```proto
message .TN.DocumentArchive {
  repeated .TSP.Reference sheets = 1;
```

The message referenced in field 1 (type 2) has the following structure:

```proto
message .TN.SheetArchive {
  required string name = 1;
  repeated .TSP.Reference drawable_infos = 2;
```

`name` is the name of the worksheet. Each worksheet can contain multiple tables.
The messages referenced in field 2 (type 6000) refer to `.TST.TableInfoArchive`

## Table Storage in iWork

_Protobuf Structure_

Table structure is shared across iWork apps.  The protobuf definitions are
identical.  The root element for tables is the `.TST.TableInfoArchive`:

```proto
message .TST.TableInfoArchive {
  required .TSP.Reference tableModel = 2;
```

The message referenced in field 2 (type 6001) has the following structure:

```proto
message .TST.TableModelArchive {
  required .TST.DataStore base_data_store = 4;
  required uint32 number_of_rows = 6;
  required uint32 number_of_columns = 7;
  // ...
}

message .TST.DataStore {
  required .TST.TileStorage tiles = 3;
  required .TST.TableRBTree rowTileTree = 9;
  // ...
}

message .TST.TileStorage {
  message .TST.TileStorage.Tile {
    required uint32 tileid = 1;
    required .TSP.Reference tile = 2;
  }
  repeated .TST.TileStorage.Tile tiles = 1;
  // ...
}
```

The message referenced in the tiles (type 6002) has the following structure:

```proto
message .TST.Tile {
  repeated .TST.TileRowInfo rowInfos = 5;
  // ...
}

message .TST.TileRowInfo {
  required uint32 tile_row_index = 1;
  required uint32 cell_count = 2;
  required bytes cell_storage_buffer_pre_bnc = 3;
  required bytes cell_offsets_pre_bnc = 4;
  optional bytes cell_storage_buffer = 6;
  optional bytes cell_offsets = 7;
  // ...
}
```

Each `.TST.TileRowInfo` message holds the data and property references for a
single row in the table.

The placement of rows in the table is governed by the tree in field 9:

```proto
message .TST.TableRBTree {
  message Node {
    required uint32 key = 1;
    required uint32 value = 2;
  }
  repeated .TST.TableRBTree.Node nodes = 1;
}
```

Each node `key` is a row offset and `value` is an index into the tile array.
For larger tables, tiles are generally expected to hold 256 rows.

### Data Storage

Non-numeric data values are stored in lists referenced from `.TST.DataStore`:

```proto
message .TST.DataStore {
  required .TSP.Reference stringTable = 4;
  optional .TSP.Reference formulaErrorTable = 12;
  optional .TSP.Reference rich_text_table = 17;
  // ...
}
```

iWork uses a "shared string table" like Excel. Excel stores both plaintext and
rich strings in the same table, while iWork has two separate tables.

### Cell Storage

The cell offset fields are an array of 16-bit integers that describe offsets
within the respective storage buffers.  `0xFFFF` indicates that the column index
for the given row is not included.

#### Old Storage

The "pre-BNC" storages are specified in fields 3 and 4

_Versions_

The first byte of the storage is the version number.  There are three known
versions for the old storage: `V1` (0-1), `V3` (2-3), and `V4` (4).

_Field Mask_

A bitmask is stored at offset 4, describing which fields are in the cell:

| field description | bit mask | size | notes                               |
|:------------------|---------:|-----:|-------------------------------------|
| Error index       | `0x0100` |    4 | index into formula error table      |
| Rich text index   | `0x0200` |    4 | index into rich shared string table |
| Plaintext index   | `0x0010` |    4 | index into shared string table      |
| Double value      | `0x0020` |    8 | raw value (IEEE754 double)          |
| Datetime value    | `0x0040` |    8 | number of seconds since 1/1/2001    |

The size of the bitmask is 2 bytes in `V1` and 4 bytes in `V3` and `V4`.

_Cell Type_

The cell type is stored at byte offset 2 in `V1` / `V3` and offset 1 in `V4`:

| type | value                                                            |
|-----:|:-----------------------------------------------------------------|
|  `0` | "blank cell" (no value)                                          |
|  `2` | "Double value" (IEEE754 double)                                  |
|  `3` | get value from shared string table at "Plaintext index"          |
|  `5` | interpret "Datetime value" as number of seconds since 1/1/2001   |
|  `6` | `true` if "Double value" is greater than zero, `false` otherwise |
|  `7` | interpret "Double value" as number of seconds (Duration)         |
|  `8` | get error from formula error table at "Error index"              |
|  `9` | get value from rich shared string table at "Rich text index"     |

_Fields_

`V1` fields start at offset 8, while `V3` and `V4` start at offset 12.  Fields
are enumerated in order that the data appears in the storage.

| field mask | versions | size | description                    |
|-----------:|:---------|-----:|:-------------------------------|
| `0x000002` | all      |    4 | cell style ID                  |
| `0x000080` | all      |    4 | text style ID                  |
| `0x000400` | V3 / V4  |    4 | conditional style ID           |
| `0x000800` | V3 / V4  |    4 | conditional style applied rule |
| `0x000004` | all      |    4 | current format ID              |
| `0x000008` | all      |    4 | formula ID                     |
| `0x000100` | all      |    4 | formula syntax error ID        |
| `0x000200` | all      |    4 | rich text ID                   |
| `0x001000` | all      |    4 | comment storage ID             |
| `0x002000` | V3 / V4  |    4 | import warning set ID          |
| `0x000010` | all      |    4 | string ID                      |
| `0x000020` | all      |    8 | double value                   |
| `0x000040` | all      |    8 | date time value                |
| `0x010000` | V3 / V4  |    4 | number format ID               |
| `0x080000` | V3 / V4  |    4 | currency format ID             |
| `0x020000` | V3 / V4  |    4 | date format ID                 |
| `0x040000` | V3 / V4  |    4 | duration format ID             |
| `0x100000` | V3 / V4  |    4 | control format ID              |
| `0x200000` | V3 / V4  |    4 | custom format ID               |
| `0x400000` | V3 / V4  |    4 | base format ID                 |
| `0x800000` | V3 / V4  |    4 | multiple choice list format ID |

#### New Storage

The "BNC" ("post-BNC"?) storages are specified in fields 6 and 7

_Versions_

The first byte of the storage is the version number.  At the time of writing,
the only version is `V5` (5).

_Field Mask_

A bitmask is stored at offset 8, describing which fields are in the cell:

| field description | bit mask | size | notes                               |
|:------------------|---------:|-----:|-------------------------------------|
| Error index       | `0x0800` |    4 | index into formula error table      |
| Rich text index   | `0x0010` |    4 | index into rich shared string table |
| Plaintext index   | `0x0008` |    4 | index into shared string table      |
| Double value      | `0x0002` |    8 | raw value (IEEE754 double)          |
| Datetime value    | `0x0004` |    8 | number of seconds since 1/1/2001    |
| Decimal128 value  | `0x0001` |   16 | raw value (128-bit floating point)  |

_Cell Type_

The cell type is stored at byte offset 1:

| type | value                                                            |
|-----:|:-----------------------------------------------------------------|
|  `0` | "blank cell" (no value)                                          |
|  `2` | "Decimal value" (generally converted back to float)              |
|  `3` | get value from shared string table at "Plaintext index"          |
|  `5` | interpret "Datetime value" as number of seconds since 1/1/2001   |
|  `6` | `true` if "Double value" is greater than zero, `false` otherwise |
|  `7` | interpret "Double value" as number of seconds (Duration)         |
|  `8` | get error from formula error table at "Error index"              |
|  `9` | get value from rich shared string table at "Rich text index"     |

_Fields_

Fields start at offset 12.  The fields are in the same order as the bit flags.

| field mask | size | description                    |
|-----------:|-----:|:-------------------------------|
| `0x000001` |   16 | Decima128 value                |
| `0x000002` |    8 | double value                   |
| `0x000004` |    8 | date time value                |
| `0x000008` |    4 | string ID                      |
| `0x000010` |    4 | rich text ID                   |
| `0x000020` |    4 | cell style ID                  |
| `0x000040` |    4 | text style ID                  |
| `0x000080` |    4 | conditional style ID           |
| `0x000100` |    4 | conditional style applied rule |
| `0x000200` |    4 | formula ID                     |
| `0x000400` |    4 | control cell spec ID           |
| `0x000800` |    4 | formula syntax error ID        |
| `0x001000` |    4 | suggest cell format kind       |
| `0x002000` |    4 | number format ID               |
| `0x004000` |    4 | currency format ID             |
| `0x008000` |    4 | date format ID                 |
| `0x010000` |    4 | duration format ID             |
| `0x020000` |    4 | text format ID                 |
| `0x040000` |    4 | boolean format ID              |
| `0x080000` |    4 | comment storage ID             |
| `0x100000` |    4 | import warning set ID          |

## Misc

### Determining File Type

The root `DocumentArchive` message fields vary between formats.

In the 12.1 apps, the required fields are:

```proto
// Keynote optional fields 4
message .KN.DocumentArchive {
  required .TSA.DocumentArchive super = 3;
  required .TSP.Reference show = 2;
}

// Numbers optional fields 1, 3, 7, 9, 10 - 12
message .TN.DocumentArchive {
  required .TSA.DocumentArchive super = 8;
  required .TSP.Reference stylesheet = 4;
  required .TSP.Reference sidebar_order = 5;
  required .TSP.Reference theme = 6;
}

// Pages optional fields 2 - 7, 11 - 14, 16, 17, 20, 21, 30 - 49
message .TP.DocumentArchive {
  required .TSA.DocumentArchive super = 15;
}
```

Pages is the only format to use and require field 15. Keynote requires field 2,
a field that does not appear in Numbers.


### MD5 Checksums

- [11.1](./111.md)
- [11.2](./112.md)
- [12.0](./120.md)
- [12.1](./121.md)


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
