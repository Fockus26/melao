import { createClient } from "@/lib/supabase/client";
import { type MarkCompleted, markSessionCompleted } from "./completion";

/** La marca de fin con la sesión del alumno, desde el navegador (D147). */
export const browserMarkCompleted: MarkCompleted = (sessionId) =>
  markSessionCompleted(createClient(), sessionId);
