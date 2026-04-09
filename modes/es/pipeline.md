# Modo: pipeline -- Bandeja de entrada de URLs (Second Brain)

Procesa las URLs de ofertas acumuladas en `data/pipeline.md`. El candidato agrega URLs cuando quiere y luego ejecuta `/career-copilot pipeline` para procesarlas todas de una vez.

## Flujo de trabajo

1. **Leer** `data/pipeline.md` -> encontrar los ítems `- [ ]` en la sección "En attente" / "Pending" / "Pendientes"
2. **Para cada URL pendiente** :
   a. Calcular el próximo `REPORT_NUM` secuencial (leer `reports/`, tomar el número más alto + 1)
   b. **Extraer la oferta** con Playwright (`browser_navigate` + `browser_snapshot`) -> WebFetch -> WebSearch
   c. Si la URL no es accesible -> marcar como `- [!]` con una nota y continuar
   d. **Ejecutar el auto-pipeline completo** : Evaluación A-F -> Reporte .md -> PDF (si score >= 3.0) -> Tracker
   e. **Mover de "Pendientes" a "Procesadas"** : `- [x] #NNN | URL | Empresa | Rol | Score/5 | PDF sí/no`
3. **Si hay 3+ URLs pendientes**, lanzar agentes en paralelo (Agent tool con `run_in_background`) para maximizar la velocidad.
4. **Al final**, mostrar una tabla resumen :

```
| # | Empresa | Rol | Score | PDF | Acción recomendada |
```

## Formato de pipeline.md

```markdown
## Pendientes
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company SAS | Senior PM
- [!] https://private.url/job -- Error : se requiere login

## Procesadas
- [x] #143 | https://jobs.example.com/posting/789 | Acme SAS | AI PM | 4.2/5 | PDF sí
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF no
```

> Nota : Los encabezados de sección pueden estar en EN ("Pending"/"Processed"), ES ("Pendientes"/"Procesadas"), DE ("Offen"/"Verarbeitet") o FR ("En attente"/"Traitees"). Ser flexible al leer, fiel al estilo existente al escribir.

## Detección inteligente de la oferta desde la URL

1. **Playwright (preferido) :** `browser_navigate` + `browser_snapshot`. Funciona con todas las SPAs.
2. **WebFetch (fallback) :** Para páginas estáticas o cuando Playwright no está disponible.
3. **WebSearch (último recurso) :** Buscar en portales secundarios que indexan la oferta.

**Casos especiales :**
- **LinkedIn** : Puede requerir login -> marcar `[!]` y pedir al candidato que pegue el texto
- **PDF** : Si la URL apunta a un PDF, leerlo directamente con el Read tool
- **Prefijo `local:`** : Leer el archivo local. Ejemplo : `local:jds/linkedin-pm-ai.md` -> leer `jds/linkedin-pm-ai.md`
- **Welcome to the Jungle / Indeed FR / APEC** : Portales francófonos comunes. Playwright maneja bien los banners de cookies
- **France Travail (ex-Pole emploi)** : Ofertas estructuradas, bien legibles por máquina. WebFetch generalmente es suficiente

## Numeración automática

1. Listar todos los archivos en `reports/`
2. Extraer el número del prefijo (ej : `142-medispend...` -> 142)
3. Nuevo número = máximo encontrado + 1

## Sincronización de fuentes

Antes de procesar una URL, verificar la sincronización :

```bash
node cv-sync-check.mjs
```

En caso de desincronización, alertar al candidato antes de continuar.
