export const PERSONAS=["lider","publico","inovacao","tecnologia","parceiro","talento","capital"];
export const VIEWPORTS=[
  {id:"mobile",width:360,height:800},
  {id:"tablet",width:768,height:1024},
  {id:"desktop",width:1440,height:900},
  {id:"ultrawide",width:2560,height:1440},
];

export function wcagMatrix(){
  return PERSONAS.flatMap(persona=>VIEWPORTS.map(viewport=>({
    id:`${persona}-${viewport.id}`,persona,viewport,
    route:`/conectar?persona=${persona}`,
    assertions:["main-landmark","single-h1","accessible-names","keyboard-path","focus-visible","no-horizontal-overflow","reduced-motion"],
    evidenceLevel:"E2",
  })));
}

export function rotateKeys(activeKids,currentKid,nextKid){
  const allowed=new Set(activeKids);
  if(!allowed.has(currentKid)||!allowed.has(nextKid)||currentKid===nextKid)throw new Error("invalid rotation overlap");
  return {before:[currentKid,nextKid],after:[nextKid],revoked:[currentKid]};
}

export function e4Gate(id,status="NOT_RUN"){
  if(!["NOT_RUN","PASS","FAIL","BLOCKED"].includes(status))throw new Error("invalid E4 status");
  return {id,status,evidenceLevel:"E4",evidence:[],executedAt:null,approvedBy:null};
}
