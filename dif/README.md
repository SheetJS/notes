# Data Interchange Format

Files starting with `TABLE` followed by a newline marker followed by `0,1`
should be interpreted as DIF.

There exists a technical specification from 1983.

### Encoding

The specification includes a Pascal procedure for reading a string.  There is an
error in handling double quotes:

```pascal
      if str[1] = '"'                            { strip quotes }
         then begin
                delete (str, 1, 1);
                delete (str, pos('"', str), length(str) - pos('"', str) + 1)
              end
```

It does not correctly handle `"` characters in strings.  Writers should use `""`
(similar to CSV encoding).  The following DIF snippet represents `"`:

```dif
1,0
""""
```

### Excel Number stored as Text inconsistency

Even if a data point is marked as text, Excel will try to interpret as Number.
For example, the following DIF snippet should represent the text `"0.3"`:


```dif
1,0
"0.3"
```

Excel ignores the type and interprets the cell as the number `0.3`.  To force a
textual interpretation, the formula trick (same as CSV) works:

```dif
1,0
"=""0.3"""
```


[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
