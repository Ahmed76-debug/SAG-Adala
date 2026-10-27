const fs=require('fs');
const p='src/lib/seed.ts';
let s=fs.readFileSync(p,'utf8');
const idx=s.indexOf('portfolio');
if(idx>=0){
  const start=s.lastIndexOf('{',idx);
  const end=s.indexOf('};',idx);
  if(start>=0 && end>=start){
    const before=s.slice(0,start);
    const after=s.slice(end+2);
    const fixed = before + "{\n    id: 'portfolio',\n    heroTitle: 'المحامي / استشارات وقضايا',\n    heroSubtitle: '',\n    heroCta: 'احجز استشارة',\n    aboutTitle: '',\n    aboutBody: '',\n    stats: [],\n    services: [],\n    expertise: [],\n    experience: [],\n    credentials: [],\n    caseHighlights: [],\n    testimonials: [],\n    articles: [],\n    languages: [],\n    memberships: [],\n    ctaTitle: '',\n    ctaBody: '',\n    updatedAt: new Date().toISOString()\n  }" + after;
    fs.writeFileSync(p,fixed,'utf8');
    console.log('replaced');
  }else console.log('no');
}else console.log('not found');
