/**
 * Rejilla de beats por anclas: vive en el core compartido (`docs/spec/motor-de-ritmo.md` §2).
 * Este módulo solo la re-exporta para el reproductor web y el spike.
 */

export {
  type Anchor,
  assertAnchors,
  beatInPhrase,
  beatToMs,
  constantGrid,
  msToBeat,
} from "../../supabase/functions/_shared/core/grid.ts";
