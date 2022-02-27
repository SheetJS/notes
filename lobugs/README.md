# LibreOffice Bugs

## Rounding and "ulp" errors

[Original SheetJS Bug Report](https://github.com/SheetJS/sheetjs/issues/1814)

[Original LO Bug Report](https://bugs.documentfoundation.org/show_bug.cgi?id=83511)

Excel will write the full IEEE754 value.  This affects values like `0.1 + 0.2`
which have stored values like `0.30000000000000004`.  Excel "General" formatting
is strategically chosen to cap at 11 digits, avoiding these issues in display.

LibreOffice rounds off the last few digits.

The following files are referenced in the issues:

- [Original issue file](./xls_issue_49.xls)
- [File Resaved in Excel 2011](./xls_issue_49_2011.xlsx) 
- [File Resaved in Excel 2013](./xls_issue_49_2013.xlsx)
- [File Resaved in Excel 2013 "Strict OpenXML"](./xls_issue_49_2011_strict.xlsx)
- [File Resaved in LibreOffice](./xls_issue_49_libreoffice.xlsx)

Look at cell C172 in the sheet1.xml subfile of each.  The Excel files show:

```xml
      <c r="C172" s="1">
        <v>3.2400000000000005E-2</v>
      </c>
```

The LO file shows:

```xml
      <c r="C172" s="4" t="n">
        <v>0.0324</v>
      </c>
```

[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
