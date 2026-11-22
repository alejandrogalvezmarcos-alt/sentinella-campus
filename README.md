# Sentinella by Alpha · Campus Mossos

Campus digital de [Formacions Alpha](https://oposicionsalpha.com/) (Mollet del Vallès) para preparar las oposiciones a **Mossos d'Esquadra** (convocatoria 46/26). Català · Castellano · English.

**Creada por Carmen Entrena** (equipo docente de Formacions Alpha).

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

## Cuentas compartidas y panel docente

Sin configurar, la app funciona en **modo local** (cada dispositivo guarda sus cuentas). Los botones «Provar la demo» y «Provar com a docent» crean datos de ejemplo en local para enseñarla.

Para activar cuentas en la nube (el progreso sigue al alumno en cualquier dispositivo) y el **panel docente real**:

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En *SQL Editor*, ejecuta [`supabase/schema.sql`](supabase/schema.sql) (tablas, permisos y alta automática de perfiles).
3. En *Project Settings → API*, copia la *Project URL* y la clave *anon public* en [`js/config.js`](js/config.js).
4. Para dar acceso de profesorado: `update public.profiles set role = 'docent' where email = '...';`
