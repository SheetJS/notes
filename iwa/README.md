# iWork 2013+

This covers the standalone ZIP-based format.  iCloud uses a different format to
support differential sync between devices.

The ZIP container holds a number of Mac binary "property list" files (`.plist`)
which can be safely ignored or blanked.  It also can hold preview images that
can be safely ignored.

## File Structure

The `.numbers` file is a ZIP file containing a number of `.iwa` entries.  The
primary entrypoint is `/Index/Document.iwa`.

`TSPersistence.framework` handles the byte-level operations for the files.

`.iwa` files are sequential blocks of compressed data.  Each "block" starts with
a 4-byte header consisting of a `0` byte followed by the compressed length
(stored as a 3-byte little-endian integer)

Each block follows the Snappy compressed format as described in
<https://github.com/google/snappy/blob/main/format_description.txt> .  iWork
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
registry by sending a message to the `TSPRegistry`.  The actual types can be
discovered from the frameworks.  Some common message types are listed below:

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

`.TST.DataStore` is the type of field 4 from `.TST.TableModelArchive`.  Since it
is not referenced indirectly, the message type does not have to be registered.

## Data Storage in Numbers files

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

### Table Storage in iWork

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
  required .TSP.Reference stringTable = 4;
  optional .TSP.Reference formulaErrorTable = 12;
  optional .TSP.Reference rich_text_table = 17;
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

Numbers uses a "shared string table" like Excel. Excel stores both plaintext and
rich strings in the same table, while Numbers has two separate tables.

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
  // ...
}
```

Each `.TST.TileRowInfo` message holds the data and property references for a
single row in the table.

The cell offset fields are an array of 16-bit integers that describe offsets
within the respective storage buffers.  `0xFFFF` indicates that the column index
for the given row is not included.

A 32-bit flag is stored at offset 4, describing which fields are in the cell:

| field description | bit mask | size | notes                               |
|:------------------|---------:|-----:|-------------------------------------|
| Error index       | `0x0100` |    4 | index into formula error table      |
| Rich text index   | `0x0200` |    4 | index into rich shared string table |
| Plaintext index   | `0x0010` |    4 | index into shared string table      |
| Double value      | `0x0020` |    8 | raw value (IEEE754 double)          |
| Datetime value    | `0x0040` |    8 | number of seconds since 1/1/2001    |

The starting offset depends on the cell storage version (`0-1` or `2-3`), which
is stored in the first byte of each cell:

| description     | v1 offset                  | v3 offset                   |
|:----------------|---------------------------:|----------------------------:|
| Error index     |`8 + POPCNT(f & 0x008E) * 4`|`12 + POPCNT(f & 0x0C8E) * 4`|
| Rich text index |`8 + POPCNT(f & 0x018E) * 4`|`12 + POPCNT(f & 0x0D8E) * 4`|
| Plaintext index |`8 + POPCNT(f & 0x138E) * 4`|`12 + POPCNT(f & 0x3F8E) * 4`|
| Double value    |`8 + POPCNT(f & 0x139E) * 4`|`12 + POPCNT(f & 0x3F9E) * 4`|
| Datetime value  |`8 + POPCNT(f & 0x13BE) * 4`|`12 + POPCNT(f & 0x3FBE) * 4`|

The cell type is stored at byte offset 2:

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

## Misc

### Determining File Type

All three file types use the same message tag (1) for the root `DocumentArchive`
message.  However, the required fields vary between formats.

In the 11.2 apps, the required fields are:

```proto
// Keynote optional fields 4
message .KN.DocumentArchive {
  required .TSA.DocumentArchive super = 3;
  required .TSP.Reference show = 2;
}

// Numbers optional fields 1, 3, 7, 9, 10, 11, 12
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

Pages is the only format to use and require field 15.  Keynote requires field 2,
a field that does not appear in Numbers.


### MD5 Checksums

- [11.2](./112.md)

- [12.0](./120.md)


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
