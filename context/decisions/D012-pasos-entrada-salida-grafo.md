# D012 · Producto · Pasos con posición de entrada/salida; combinaciones = recorrido con semilla sobre el grafo · Pendiente

**Decisión:** cada paso declara su posición de entrada y de salida. El generador hace un
recorrido aleatorio con semilla: B puede seguir a A solo si la salida de A es la entrada de B.
**Por qué:** "tener en cuenta qué pasos constituyen el baile (base, vueltas, entradas y
salidas)": así toda combinación es bailable. La semilla permite probarlo con vectores.
