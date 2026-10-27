import { promises as fs } from "node:fs";
import path from "node:path";
import { neuItemsDirectory, neuMetadataPath } from "../src/server/reference/neu/paths";
import gear from "../src/server/reference/rift-gear-catalogue.json";
import accessories from "../src/server/reference/rift-accessories.json";
import { neuItemSchema } from "../src/schemas/neu";

const clean = (s:string)=>s.replace(/§./g,"").trim().toLowerCase();
const targetNames=[...gear.armor.filter(e=>e.slot!=="set").map(e=>e.name),
 ...accessories.fixedSeconds.map(e=>e.name), ...accessories.scalingSeconds.map(e=>e.name)];
type RecipeResult={status:"CRAFTING"|"NO_CRAFTING_GRID";ingredients:{itemId:string;quantity:number}[]};
function crafting(item:ReturnType<typeof neuItemSchema.parse>):RecipeResult{
 const grids=[item.recipe,...(item.recipes??[])].filter((x):x is Record<string,unknown>=>Boolean(x&&typeof x==="object"&&!Array.isArray(x)));
 for(const grid of grids){
  const cells=Object.entries(grid).filter(([key])=>/^[ABC][123]$/.test(key));
  if(!cells.length)continue;
  const counts=new Map<string,number>();let valid=true;
  for(const [,raw] of cells){
   if(raw===""||raw==null)continue;
   if(typeof raw!=="string"){valid=false;break;}
   const match=/^(.+):([0-9]+)$/.exec(raw);
   if(!match){valid=false;break;}
   const n=Number(match[2]);
   if(!Number.isSafeInteger(n)||n<=0){valid=false;break;}
   counts.set(match[1],(counts.get(match[1])??0)+n);
  }
  if(valid)return {status:"CRAFTING",ingredients:[...counts].map(([itemId,quantity])=>({itemId,quantity}))};
 }
 return {status:"NO_CRAFTING_GRID",ingredients:[]};
}
async function main(){
 const meta=JSON.parse(await fs.readFile(neuMetadataPath(),"utf8")) as {downloadedAt?:string;repository?:string};
 const files=await fs.readdir(neuItemsDirectory());
 const wanted=new Set(targetNames.map(clean)); const matches=new Map<string,Array<{itemId:string;recipe:RecipeResult}>>();
 for(const file of files){
  if(!file.endsWith(".json"))continue;
  const raw=JSON.parse(await fs.readFile(path.join(neuItemsDirectory(),file),"utf8"));
  const parsed=neuItemSchema.safeParse(raw);if(!parsed.success)continue;
  const label=clean(parsed.data.displayname??"");if(!wanted.has(label))continue;
  const list=matches.get(label)??[];
  list.push({itemId:parsed.data.internalname,recipe:crafting(parsed.data)});
  matches.set(label,list);
 }
 const report={snapshot:meta,targets:targetNames.map(name=>{
  const candidates=matches.get(clean(name))??[];
  return {name,status:candidates.length===1?"UNIQUE_MATCH":candidates.length===0?"NOT_FOUND":"AMBIGUOUS",
   candidates};
 })};
 const out=path.join(process.cwd(),"data","neu","rift-equipment-audit.json");
 await fs.writeFile(out,JSON.stringify(report,null,2)+"\n");
 console.log(`Wrote ${out}: ${report.targets.filter(x=>x.status==="UNIQUE_MATCH").length} unique, ${report.targets.filter(x=>x.status==="AMBIGUOUS").length} ambiguous, ${report.targets.filter(x=>x.status==="NOT_FOUND").length} missing`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
