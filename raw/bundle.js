const fs=require("fs"),path=require("path");
const read=(f)=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",f),"utf8"));
const opt=(f)=>{try{return read(f);}catch(e){return null;}};
const ubs=opt("uniforms-by-school.json");
const b={meta:{generatedFor:"Mumzworld x Threads school-uniform landing page",note:"Swap window.UNIFORM_DATA for a live Algolia feed (magento2_aws_live_en_products) in production."},
 schools:read("schools.json").schools,yearCategories:read("year-categories.json").yearCategories,filters:read("filters.json").filters,
 uniformProducts:read("sample-products.json").products,uniformsBySchool:(ubs&&ubs.bySchool)||{},crossSellRails:read("cross-sell.json").rails,
 categories:read("mumzworld-categories.json"),landingDesign:read("landing-design.json"),tokens:read("design-tokens.json")};
fs.writeFileSync(path.join(__dirname,"..","data.js"),"/* Auto-generated data bundle. Source of truth = /data/*.json. Regenerate: node raw/bundle.js */\nwindow.UNIFORM_DATA = "+JSON.stringify(b,null,2)+";\n");
const n=Object.values(b.uniformsBySchool).reduce((t,v)=>t+v.length,0);
console.log("data.js written:", b.schools.length,"schools,",Object.keys(b.uniformsBySchool).length,"with uniforms,",n,"products,",b.crossSellRails.length,"cross-sell rails");
