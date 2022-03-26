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

# Data Storage

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

## Dynamic Registry and Message Types

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

## iWork Proto Definitions

The iWork apps (Keynote, Numbers, Pages) include embedded Protocol Buffers
definitions as part of the file format processors.

The [`otorp` package on `npm`](https://npm.im/otorp) ships with a command-line
tool for extracting definitions from a Mach-O binary.

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

## Determining File Type

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


## Misc

### MD5 Checksums

The checksums are based on definitions from version 11.2 (7032.0.145)

```proto
MD5 (KNArchives.proto) = 4d15ddb1dacdf0e2a321d09234130abd
MD5 (KNArchives.sos.proto) = 5b8e5101e946eaddca341b78b5f6e660
MD5 (KNCommandArchives.proto) = 3aa3d1796a8cb1f1cdaccca2d7a67704
MD5 (KNCommandArchives.sos.proto) = af09afc07db32005ff1eaf183fe99c02
MD5 (TNArchives.proto) = c6af8ddec038ccfb8d683f2c92bb8b2c
MD5 (TNArchives.sos.proto) = 7a8ce65fa23d554fba3549f6ec5d1aa5
MD5 (TNCommandArchives.proto) = 4b7e7ebe4583d0a0166118292d338272
MD5 (TNCommandArchives.sos.proto) = 279eafd525689d2e8805e951f9a0b9a6
MD5 (TPArchives.proto) = 5ae0d81aded078509f8b1dfc48b1b118
MD5 (TPCommandArchives.proto) = 1cf18ff056e7635f1cfcb68ec943892b
MD5 (TPCommandArchives.sos.proto) = 7b627bc1e053a03a762952c5d647a97a
MD5 (TSAArchives.proto) = 6a246bb28e425ff796c285c36132b2ef
MD5 (TSAArchives.sos.proto) = 8b55a583851f1d11a2af842f20223bc7
MD5 (TSACommandArchives.sos.proto) = d0e4741e2fea6dde83b17a7e73d12af7
MD5 (TSCEArchives.proto) = abe4e1a7256019562a3790eb58c6b9f9
MD5 (TSCH3DArchives.proto) = 2ac8ee10b2e28c5d201524a388a2eb9e
MD5 (TSCHArchives.Common.proto) = 6cc9c2954517f29d8247e4d59caa980f
MD5 (TSCHArchives.GEN.proto) = 25bd8a10b1646970fb96f411f14821c9
MD5 (TSCHArchives.proto) = e4f10e18142ee8b0e2bb6f94b03e05d6
MD5 (TSCHArchives.sos.proto) = 4452d0264a26b946524ebbbb2dec56e0
MD5 (TSCHCommandArchives.proto) = 75cc30b1ba010f1172d0d08eff8bfa9f
MD5 (TSCHPreUFFArchives.proto) = 5a9c935194bd772a30774071ac7a7f64
MD5 (TSDArchives.proto) = 5cc5d066f5b394508ec13f64dedba7b7
MD5 (TSDArchives.sos.proto) = ccbc06fd5b8db95e78b4b404a0d2177f
MD5 (TSDCommandArchives.proto) = 878c419d11b043333e1ed5148a868626
MD5 (TSKArchives.proto) = bd76c5489f2bfb5a94750f1a83969549
MD5 (TSKArchives.sos.proto) = 5e68b45687d33b9e2cdc0f64d76988f9
MD5 (TSPArchiveMessages.proto) = 5bd640aed4df2758a393143096cbaf70
MD5 (TSPDatabaseMessages.proto) = ab86cd136e1702555b5080f59609f2f1
MD5 (TSPMessages.proto) = 1a33eb51dfb1f8ccbabdc6e236690ce0
MD5 (TSSArchives.proto) = 301ea13a293ada201db8edf9b0f83d1d
MD5 (TSSArchives.sos.proto) = 951c42b9fd732552ffc4944fe414890a
MD5 (TSTArchives.proto) = 59a353cf0dd34b31ee932149c517e80d
MD5 (TSTArchives.sos.proto) = d085aa1e4449f85bcc37689c7d6e4c5f
MD5 (TSTCommandArchives.proto) = 4c1bbca393199455635dd80a89d9f61b
MD5 (TSTStylePropertyArchiving.proto) = 463bb1c64fe02a484b4e9e655d6af391
MD5 (TSWPArchives.proto) = 7d171fbf72e184957773c6ad84ff4f09
MD5 (TSWPArchives.sos.proto) = 06be0c76ea913408da04153b292f08e0
MD5 (TSWPCommandArchives.proto) = dabb9f2e85ffdba52aaca61064303c71
```


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
