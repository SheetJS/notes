# Office 2003 SpreadsheetML Format

Files are flat XML.

## XML Schemas

They are normally distributed in `Office2003XMLSchema.exe`.  The linked schemas
were extracted from the package with MD5 sum `e967500ef68df1e8ef86b493304b5157`.

Each XSD is governed by a license which can be found near the top of the file.

- [`aml.xsd`](aml.xsd)
- [`c.xsd`](c.xsd)
- [`dt.xsd`](dt.xsd)
- [`excel.xsd`](excel.xsd)
- [`excel2003xml.xsd`](excel2003xml.xsd)
- [`excelss.xsd`](excelss.xsd)
- [`mspdi.xsd`](mspdi.xsd)
- [`office.xsd`](office.xsd)
- [`rowsetschema.xsd`](rowsetschema.xsd)
- [`rowsset.xsd`](rowsset.xsd)
- [`schema.xsd`](schema.xsd)
- [`sd.xsd`](sd.xsd)
- [`SimpleImport.xsd`](SimpleImport.xsd)
- [`udc.xsd`](udc.xsd)
- [`udcsoap.xsd`](udcsoap.xsd)
- [`udcxmlfile.xsd`](udcxmlfile.xsd)
- [`visio.xsd`](visio.xsd)
- [`vml.xsd`](vml.xsd)
- [`w10.xsd`](w10.xsd)
- [`wordnet.xsd`](wordnet.xsd)
- [`wordnetaux.xsd`](wordnetaux.xsd)
- [`wordsp.xsd`](wordsp.xsd)
- [`xsdlib.xsd`](xsdlib.xsd)

There is a slight conflict between the Word and Spreadsheet `office.xsd` that
specifically applies to the version number pattern:

```diff
--- SpreadsheetML Schemas/office.xsd
+++ WordprocessingML Schemas/office.xsd
@@ -20,7 +20,7 @@
 			<xsd:documentation>Defines a version number format.</xsd:documentation>
 		</xsd:annotation>
 		<xsd:restriction base="xsd:string">
-			<xsd:pattern value="[0-9]?[0-9].[0-9]{4}"></xsd:pattern>
+			<xsd:pattern value="([0-9]?[0-9].[0-9]{4})|([0-9]?[0-9])"></xsd:pattern>
 		</xsd:restriction>
 	</xsd:simpleType>
 	<xsd:element name="File" type="FileElt">
@@ -265,7 +265,7 @@
 	</xsd:element>
 	<xsd:complexType name="OfficeDocumentSettingsElt">
 		<xsd:sequence>
-			<xsd:element name="DownloadComponents" form="qualified" minOccurs="0">
+			<xsd:element name="DownloadComponents" type="xsd:string" form="qualified" minOccurs="0">
 				<xsd:annotation>
 					<xsd:documentation>Not used by Microsoft Office Word 2003 or Microsoft Office Excel 2003.</xsd:documentation>
 				</xsd:annotation>

```

[![Analytics](https://ga-beacon.appspot.com/UA-36810333-1/SheetJS/notes?pixel)](https://github.com/SheetJS/notes)
