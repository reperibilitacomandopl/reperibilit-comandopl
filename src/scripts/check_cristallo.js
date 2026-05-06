const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.user.findFirst({
  where:{matricola:'399'},
  include:{
    shifts:{
      where:{date:{
        gte: new Date(new Date().setHours(0,0,0,0)),
        lt: new Date(new Date().setHours(23,59,59,999))
      }},
      include: { serviceCategory: true }
    }
  }
}).then(u=>{
  console.log(JSON.stringify(u,null,2));
  p.$disconnect();
});
