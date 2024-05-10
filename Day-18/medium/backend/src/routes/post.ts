import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign,verify } from "hono/jwt";
import { updateBlogInput,createBlogInput } from "@100xdevs/medium-common";

export const postRouter = new Hono<{
    Bindings : {
        DATABASE_URL : string;
        JWT_SECRET : string;
    },
    Variables : {
        userId : string;
    }
}>();

postRouter.use('/*', async (c,next) => {
    const authHeader = c.req.header("authorization") || "";
    try{
         const user = await verify(authHeader,c.env.JWT_SECRET)

    if(user){
        //@ts-ignore
        c.set("userId",user.id);
        await next();
    }
    else{
        c.status(403);
        return c.json({
            message : "You are not logged in"
        })
    }
    }
    catch(e){
         c.status(403);
         return c.json({
           message: "You are not logged in",
         });
    }
   
})

postRouter.post("/", async (c) => {
   const userId = c.get('userId');
   const prisma = new PrismaClient({
     datasourceUrl: c.env.DATABASE_URL,
   }).$extends(withAccelerate());

   const body = await c.req.json();

   const { success } = createBlogInput.safeParse(body);
   if (!success) {
     c.status(411);
     return c.json({
       msg: "Inputs not correct",
     });
   }

  const post = await prisma.post.create({
    data : {
        title : body.title,
        content : body.content,
        authorId : userId,
    }
   })

   return c.json({
    id : post.id
   })
});

postRouter.put("/", async (c) => { 
    const userId = c.get("userId");
  const body = await c.req.json();
   const { success } = updateBlogInput.safeParse(body);
   if (!success) {
     c.status(411);
     return c.json({
       msg: "Inputs not correct",
     });
   }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const post = await prisma.post.update({

    where: {
        id: body.id,
        authorId : userId
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    id: post.id,
  });
});

postRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const posts = await prisma.post.findMany();

  return c.json({
    posts,
  });
});


postRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try{
    const post = await prisma.post.findFirst({
    where: {
      id: id,
    },
  });

  return c.json({ 
    post
  });
  }
  catch(e){
    c.status(411);
    return c.json({
        message : "Error while fetching blog post"
    })
  }
});


