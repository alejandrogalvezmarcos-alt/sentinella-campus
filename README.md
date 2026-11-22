# Sentinella by Alpha · Campus Mossos

Campus digital de [Formacions Alpha](https://oposicionsalpha.com/) (Mollet del Vallès) para preparar las oposiciones a **Mossos d'Esquadra** (convocatoria 46/26). Català · Castellano · English.

- **Psicotécnicos infinitos**: 16 tipos generados al azar (series numéricas y de letras, cálculo, problemas, series de figuras, figura diferente, rotaciones, cubos, comparar códigos, contar símbolos, memoria de matrículas, atención, sinónimos, antónimos, analogías, palabra intrusa).
- **Tests del temario**: preguntas de los 20 temas de la Guía de estudio, con explicación y repaso de errores.
- **Simulacro oficial**: 30 preguntas de conocimientos (−1/4) + 80 aptitudinales, 35 min cada parte.
- **Pruebas físicas**: baremos, calculadora de nota, plan semanal, course navette con audio, contador de press de banca y cronómetro de circuito.
- **Campus**: cuentas, historial, gráficas, racha, rangos del cuerpo e insignias. Instalable como app (PWA) y funciona sin conexión.

Sin dependencias ni compilación: HTML + CSS + JavaScript (módulos ES). Para probarlo en local:

```bash
python3 -m http.server 8765
```

> Las cuentas y el progreso se guardan en el navegador de cada dispositivo (`localStorage`). Para un campus real con cuentas compartidas entre dispositivos y panel de profesorado, el siguiente paso es conectar un backend (p. ej. Supabase) en `js/store.js`.

Contenido orientativo: verificar siempre con las bases en el DOGC y la Guía de estudio oficial. Herramienta independiente, sin relación oficial con la Generalitat ni con el cuerpo de Mossos d'Esquadra.
