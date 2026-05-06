const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.user.findMany({where:{role:'AGENTE'},select:{name:true,squadra:true},take:15}).then(u=>{
  u.forEach(x=>console.log(x.name,'|',x.squadra));
  p.$disconnect();
});
