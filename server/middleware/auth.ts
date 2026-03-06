import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const getSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!getSession) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = getSession.user;
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
};
