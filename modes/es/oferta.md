# Modo: evaluate -- Evaluación completa A-F

Cuando el candidato pega una oferta (texto o URL), SIEMPRE entregar los 6 bloques.

## Prerrequisitos
Antes de generar la evaluación:
1. Leer `cv.md`, `modes/_profile.md` y `config/profile.yml`.
2. Si el usuario proporciona una URL, usar `web_fetch` o `browser_navigate` (Playwright) para extraer la descripción completa de la vacante.

## Paso 0 -- Detección de arquetipo

Clasificar la oferta en uno de los 6 arquetipos (ver `_shared.md`). Si es híbrida, indicar los 2 más cercanos. Esto determina:
- Qué proof points priorizar en el bloque B
- Cómo reescribir el summary en el bloque E
- Qué historias STAR preparar en el bloque F

## Bloque A -- Resumen del rol

Tabla con:
- Arquetipo detectado
- Dominio (Platform / Agentic / LLMOps / ML / Enterprise)
- Función (Build / Consultoría / Management / Deploy)
- Seniority
- Remoto (Full remote / Híbrido / Presencial)
- Tamaño del equipo (si se menciona)
- TL;DR en 1 frase

## Bloque B -- Match con el CV

Leer `cv.md`. Crear una tabla donde cada requisito de la oferta está mapeado a líneas exactas del CV.

**Adaptado al arquetipo:**
- FDE -> priorizar proof points de entrega rápida y proximidad al cliente
- SA -> priorizar diseño de sistemas e integraciones
- PM -> priorizar product discovery y métricas
- LLMOps -> priorizar evals, observabilidad, pipelines
- Agentic -> priorizar multi-agent, HITL, orquestación
- Transformation -> priorizar gestión del cambio, adopción, escalabilidad

Sección **Brechas (Gaps)** con estrategia de mitigación para cada una. Para cada brecha:
1. ¿Es un bloqueador duro o un nice-to-have?
2. ¿Puede el candidato demostrar experiencia adyacente?
3. ¿Hay algún proyecto en el portfolio que cubra esta brecha?
4. Plan de mitigación concreto (frase para la carta de presentación, mini-proyecto rápido, etc.)

## Bloque C -- Nivel y estrategia

1. **Nivel detectado** en la oferta vs **nivel natural del candidato para ese arquetipo**
2. **Plan "vender senior sin mentir"**: formulaciones específicas adaptadas al arquetipo, logros concretos a destacar, cómo posicionar la experiencia de fundador como un activo
3. **Plan "si estoy por debajo del nivel"**: aceptar si la remuneración es justa, negociar una revisión a los 6 meses, criterios de promoción claros

## Bloque D -- Remuneración y demanda

Usar WebSearch para:
- Salarios actuales del rol (Glassdoor, Levels.fyi, InfoJobs Salarios, Talent.io, Indeed Salarios)
- Reputación de remuneración de la empresa (Glassdoor, LinkedIn)
- Tendencia de demanda del rol en el mercado hispanohablante

Tabla con datos y fuentes citadas. Si no hay datos, decirlo claramente — no inventar nada.

**Mercado hispanohablante -- Verificaciones obligatorias:**
- ¿Se menciona 13er/14o mes o paga extra? Incluirlo en el cálculo bruto anual.
- ¿Parte variable (bonus, comisión, stock options)?
- ¿Se menciona participación en beneficios? ¿Hay histórico disponible?
- ¿Convenio colectivo aplicable? Si es así, verificar la categoría profesional.
- ¿Contrato indefinido o temporal? Si es temporal: duración, motivo, posibilidad de conversión a indefinido.
- ¿Freelance / autónomo? Tarifa, duración del proyecto, riesgo de reclasificación.

## Bloque E -- Plan de personalización

| # | Sección | Estado actual | Cambio propuesto | Justificación |
|---|---------|---------------|------------------|---------------|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 modificaciones del CV + Top 5 modificaciones de LinkedIn para maximizar el match.

## Bloque F -- Plan de entrevistas

6-10 historias STAR+R mapeadas a los requisitos de la oferta (STAR + **Reflexión**):

| # | Requisito de la oferta | Historia STAR+R | S | T | A | R | Reflexión |
|---|------------------------|-----------------|---|---|---|---|-----------|

La columna **Reflexión** captura lo que se aprendió o lo que se haría diferente. Esto señala seniority — los juniors describen lo que pasó, los seniors extraen aprendizajes.

**Story Bank:** Si existe `interview-prep/story-bank.md`, verificar si estas historias ya están allí. Si no, agregar las nuevas. Con el tiempo, esto construye un banco reutilizable de 5-10 historias maestras adaptables a cualquier pregunta de entrevista.

**Seleccionadas y enmarcadas según el arquetipo:**
- FDE -> destacar velocidad de entrega y proximidad al cliente
- SA -> destacar decisiones de arquitectura
- PM -> destacar discovery y decisiones de priorización
- LLMOps -> destacar métricas, evals, hardening en producción
- Agentic -> destacar orquestación, gestión de errores, HITL
- Transformation -> destacar adopción y cambio organizacional

Incluir también:
- 1 case study recomendado (qué proyecto presentar y cómo)
- Preguntas red-flag y cómo responderlas (ej: "¿Por qué vendiste tu empresa?", "¿Tenías un equipo a tu cargo?", "¿Por qué un cambio después de tan poco tiempo?")

---

## Post-evaluación

**SIEMPRE** ejecutar después de los bloques A-F:

### 1. Guardar el reporte .md

Guardar la evaluación completa en `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = próximo número secuencial (3 dígitos, con ceros a la izquierda)
- `{company-slug}` = nombre de la empresa en minúsculas, sin espacios (usar guiones)
- `{YYYY-MM-DD}` = fecha de hoy

**Formato del reporte:**

```markdown
# Evaluación: {Empresa} -- {Rol}

**Fecha:** {YYYY-MM-DD}
**Arquetipo:** {detectado}
**Score:** {X/5}
**URL:** {URL de la oferta}
**PDF:** {ruta o pendiente}

---

## A) Resumen del rol
(contenido completo del bloque A)

## B) Match con el CV
(contenido completo del bloque B)

## C) Nivel y estrategia
(contenido completo del bloque C)

## D) Remuneración y demanda
(contenido completo del bloque D)

## E) Plan de personalización
(contenido completo del bloque E)

## F) Plan de entrevistas
(contenido completo del bloque F)

## G) Borradores de respuestas para la candidatura
(solo si score >= 4.5 -- borradores de respuestas para el formulario de candidatura)

---

## Palabras clave extraídas
(lista de 15-20 palabras clave de la oferta para optimización ATS)

### 2. Registrar en el tracker (Formato TSV)

**SIEMPRE** generar la entrada del tracker en **formato TSV** siguiendo la regla global de `_shared.md`. **NUNCA** editar `data/applications.md` directamente desde este modo. Escribir el TSV en la carpeta `batch/tracker-additions/` (crear un archivo .tsv temporal).

La entrada debe incluir:
- Próximo número secuencial
- Fecha de hoy
- Empresa
- Rol
- Estado: `Evaluated`
- Score: promedio del match (1-5)
- PDF: ❌ (o ✅ si el auto-pipeline generó un PDF)
- Reporte: enlace relativo al archivo de reporte (ej: `[{num}](reports/{num}-{slug}-{fecha}.md)`)
