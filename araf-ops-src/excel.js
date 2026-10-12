/* Offline XLSX export: typed cells, no formula evaluation or external resources.
   OOXML uses inline strings; ZIP entries are stored with CRC-32 (no dependency). */
const OpsExcel = (() => {
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const column = n => { let s=''; for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s; return s; };
  const crcTable = Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function zip(files) {
    const encoder=new TextEncoder(),parts=[],central=[];let offset=0,centralSize=0;
    const header=size=>{const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};};
    for(const [path,content] of Object.entries(files)) {
      const name=encoder.encode(path),data=encoder.encode(content);let crc=0xffffffff;
      for(const b of data)crc=crcTable[(crc^b)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
      const h=header(30),v=h.view;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);
      v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
      parts.push(h.bytes,name,data);
      const c=header(46),w=c.view;w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(14,33,true);
      w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);
      central.push(c.bytes,name);centralSize+=46+name.length;offset+=30+name.length+data.length;
    }
    const e=header(22),v=e.view,n=Object.keys(files).length;v.setUint32(0,0x06054b50,true);v.setUint16(8,n,true);v.setUint16(10,n,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...central,e.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function workbook(sheetName, columns, rows) {
    if(!columns.length || columns.length>16384 || rows.length>1048575)throw new Error('حجم البيانات يتجاوز سعة ورقة Excel');
    const cell=(value,col,row,type)=>{
      const ref=column(col)+row;
      if(value===null || value===undefined || value==='')return `<c r="${ref}"/>`;
      if(type==='date'){
        const ms=+new Date(value);if(!Number.isFinite(ms))return `<c r="${ref}"/>`;
        // Excel stores wall time without a zone. All exported timestamps use Riyadh (UTC+3).
        return `<c r="${ref}" s="3"><v>${(ms+3*3600000)/86400000+25569}</v></c>`;
      }
      if(type==='number' || type==='money'){
        const n=Number(value);if(!Number.isFinite(n))throw new Error('توجد قيمة رقمية غير صالحة للتصدير');
        return `<c r="${ref}" s="${type==='money'?4:2}"><v>${n}</v></c>`;
      }
      if(String(value).length>32767)throw new Error('يوجد نص يتجاوز سعة خلية Excel (32767 حرفًا)');
      return `<c r="${ref}" t="inlineStr" s="${type==='header'?1:0}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    };
    const last=column(columns.length-1)+(rows.length+1),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="32"/><cols>${columns.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.width||24}" customWidth="1"/>`).join('')}</cols><sheetData><row r="1" ht="34" customHeight="1">${columns.map((c,i)=>cell(c.label,i,1,'header')).join('')}</row>${rows.map((row,i)=>`<row r="${i+2}" ht="${Math.min(150,Math.max(32,...columns.map((c,j)=>Math.ceil(String(row[j]??'').length/(c.width||24))*15+10)))}" customHeight="1">${columns.map((c,j)=>cell(row[j],j,i+2,c.type)).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${last}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>`;
    const relNs='http://schemas.openxmlformats.org/package/2006/relationships',officeRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const styles=`<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF1B3A4B"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A4B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5">${[49,0,3,164,4].map((fmt,i)=>`<xf numFmtId="${fmt}" fontId="${i===1?1:0}" fillId="${i===1?2:0}" borderId="0" xfId="0" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="${i>1?'center':'right'}" vertical="center" wrapText="1" readingOrder="${i>1?1:2}"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return zip({
      '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels':`<Relationships xmlns="${relNs}"><Relationship Id="rId1" Type="${officeRel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="${officeRel}"><bookViews><workbookView/></bookViews><sheets><sheet name="${xml(sheetName.replace(/[\\/*?:\[\]]/g,' ').slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':`<Relationships xmlns="${relNs}"><Relationship Id="rId1" Type="${officeRel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${officeRel}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml':styles,'xl/worksheets/sheet1.xml':sheet
    });
  }
  return {workbook};
})();
if(typeof module!=='undefined' && module.exports)module.exports=OpsExcel;
