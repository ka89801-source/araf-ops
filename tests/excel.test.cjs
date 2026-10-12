const {test}=require('node:test');const assert=require('node:assert/strict');
const {workbook}=require('../araf-ops-src/excel.js');
async function entries(blob){const b=Buffer.from(await blob.arrayBuffer()),files={};let i=0;
 while(b.readUInt32LE(i)===0x04034b50){const size=b.readUInt32LE(i+18),n=b.readUInt16LE(i+26),x=b.readUInt16LE(i+28),start=i+30+n+x;files[b.subarray(i+30,i+30+n).toString()]=b.subarray(start,start+size).toString();i=start+size;}
 assert.equal(b.readUInt32LE(i),0x02014b50);assert.equal(b.readUInt32LE(b.length-22),0x06054b50);return files;
}
test('real XLSX keeps phone and formula-like input as literal text and money/date numeric',async()=>{
 const blob=workbook('طلبات',[{label:'الجوال'},{label:'القيمة',type:'money'},{label:'التاريخ',type:'date'},{label:'التفاصيل'}],[['0500123456',100.25,new Date('2026-10-01T22:30:00Z'),'=HYPERLINK("https://example.com")\n<&>']]);
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');const files=await entries(blob),sheet=files['xl/worksheets/sheet1.xml'];
 assert.equal(Object.keys(files).length,6);assert.match(sheet,/rightToLeft="1"/);assert.match(sheet,/state="frozen"/);assert.match(sheet,/autoFilter ref="A1:D2"/);
 assert.match(sheet,/r="A2" t="inlineStr".*?0500123456/);assert.match(sheet,/r="B2" s="4"><v>100.25/);assert.match(sheet,/r="C2" s="3"><v>46297.0625/);
 assert.match(sheet,/=HYPERLINK\(&quot;/);assert.match(sheet,/&lt;&amp;&gt;/);assert.doesNotMatch(sheet,/<f[ >]/);
});
test('missing dates stay blank, invalid numbers and oversized text fail explicitly',async()=>{
 const files=await entries(workbook('اختبار',[{label:'التاريخ',type:'date'}],[[null],['bad-date']]));assert.match(files['xl/worksheets/sheet1.xml'],/<c r="A2"\/>/);assert.match(files['xl/worksheets/sheet1.xml'],/<c r="A3"\/>/);
 assert.throws(()=>workbook('اختبار',[{label:'عدد',type:'number'}],[[NaN]]),/غير صالحة/);
 assert.throws(()=>workbook('اختبار',[{label:'نص'}],[['a'.repeat(32768)]]),/سعة خلية/);
});
