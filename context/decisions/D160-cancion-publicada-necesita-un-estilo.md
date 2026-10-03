# D160 · Producto · Una canción necesita al menos un estilo para publicarse; los borradores pueden no tener · Implementado

**Decisión:** `missing_style` bloquea publicar y el trigger `song_styles_keep_one` impide quitarle
el último estilo a una publicada (`MS202`). `admin_save_song` agrega los estilos nuevos antes de
quitar los que sobran, así cambiar el único estilo de una publicada no pasa por "sin estilos". La
lista tiene el chip "Sin estilo" para encontrar borradores así. La cascada desde un estilo borrado
no pasa por la regla (solo se borran estilos vacíos, B2).
**Por qué:** una canción publicada sin estilo no aparece en ninguna práctica ni lección: estaría
publicada para nadie.
**Alternativa descartada:** exigir estilo también al guardar: impide cargar la canción antes de
decidir dónde va.
