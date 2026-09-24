#!/usr/bin/env bash
# Publica las capturas de un PR en la rama `pr-shots` del repo y imprime el markdown
# para pegar en la sección "Capturas" del cuerpo del PR (`gh pr edit --body-file`).
#
# Uso:  bash scripts/publish-pr-shots.sh [carpeta] [subcarpeta-destino]
#       carpeta             por defecto .pr-shots
#       subcarpeta-destino  por defecto el nombre de la rama actual (feat/x → feat-x)
#
# Por qué una rama aparte: las imágenes no entran en el historial de `main` (el PR se
# mergea con squash sin ellas) y GitHub las muestra en el PR con una URL estable (se
# enlaza el commit, no la rama). En repos privados solo las ve quien tiene acceso.
#
# No crea ramas locales, no toca la rama de trabajo ni el árbol de trabajo: arma el commit
# en un worktree temporal y empuja solo `pr-shots`. Borrar esa rama cuando pese es decisión
# del dueño (`git push origin --delete pr-shots`), nunca del agente.
set -euo pipefail

SRC="${1:-.pr-shots}"
DEST="${2:-$(git branch --show-current | tr '/' '-')}"
BRANCH="pr-shots"
REPO="${PR_SHOTS_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

shopt -s nullglob
files=("$SRC"/*.png)
if [ ${#files[@]} -eq 0 ]; then
  echo "No hay PNG en $SRC" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { git worktree remove --force "$TMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

PARENT=""
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch -q origin "$BRANCH"
  PARENT="$(git rev-parse FETCH_HEAD)"
  git worktree add -q --detach "$TMP" "$PARENT"
else
  # Primera vez: commit huérfano (sin historia), partiendo de un árbol vacío.
  git worktree add -q --detach "$TMP" HEAD
  git -C "$TMP" rm -rq --cached . >/dev/null
fi

mkdir -p "$TMP/$DEST"
cp "${files[@]}" "$TMP/$DEST/"
git -C "$TMP" add "$DEST"
TREE="$(git -C "$TMP" write-tree)"
if [ -n "$PARENT" ]; then
  COMMIT="$(git -C "$TMP" commit-tree "$TREE" -p "$PARENT" -m "capturas: $DEST")"
else
  COMMIT="$(git -C "$TMP" commit-tree "$TREE" -m "capturas: $DEST")"
fi
git push -q origin "$COMMIT:refs/heads/$BRANCH"

echo "<!-- Capturas en $BRANCH@${COMMIT:0:7} -->"
for f in "${files[@]}"; do
  name="$(basename "$f" .png)"
  echo "**$name**"
  echo ""
  echo "![$name](https://github.com/$REPO/blob/$COMMIT/$DEST/$(basename "$f")?raw=true)"
  echo ""
done
