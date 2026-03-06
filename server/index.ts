import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

import tripsRouter from "./routes/trips";
import invitationsRouter from "./routes/invitations";

const app = express();
const port = process.env.PORT || 4040;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

app.get("/api/auth/me", async (req: any, res: any) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ user: session.user });
});

app.use("/api/trips", tripsRouter);
app.use("/api/invitations", invitationsRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
