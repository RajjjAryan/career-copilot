# Modo: apply -- Asistente de Candidatura en Vivo

Modo interactivo para cuando el candidato está completando un formulario de candidatura en Chrome. Lee lo que está en la pantalla, carga el contexto de la evaluación previa de la vacante y genera respuestas personalizadas para cada pregunta del formulario.

## Requisitos

- **Mejor con Playwright visible**: En modo visible, el candidato ve el navegador y Copilot CLI puede interactuar con la página.
- **Sin Playwright**: el candidato comparte una captura de pantalla (screenshot) o pega las preguntas manualmente.

## Workflow

```
1. DETECTAR    → Leer pestaña activa de Chrome (screenshot/URL/título)
2. IDENTIFICAR → Extraer empresa + vacante de la página
3. BUSCAR      → Hacer match contra reports existentes en reports/
4. CARGAR      → Leer report completo + Bloque G (si existe)
5. COMPARAR    → ¿La vacante en pantalla coincide con la evaluada? Si cambió → avisar
6. ANALIZAR    → Identificar TODAS las preguntas visibles del formulario
7. GENERAR     → Para cada pregunta, generar respuesta personalizada
8. PRESENTAR   → Mostrar respuestas formateadas para copy-paste
```

## Paso 1 -- Detectar la vacante

**Con Playwright:** Tomar un snapshot de la página activa. Leer título, URL y contenido visible.

**Sin Playwright:** Pedir al candidato que:
- Comparta un screenshot del formulario (la herramienta Read lee imágenes)
- O pegue las preguntas del formulario como texto
- O diga empresa + vacante para que busquemos el contexto

## Paso 2 -- Identificar y buscar contexto

1. Extraer nombre de la empresa y título de la vacante de la página
2. Buscar en `reports/` por el nombre de la empresa (Grep case-insensitive)
3. Si hay match → cargar el report completo
4. Si hay Bloque G → cargar los borradores de respuestas anteriores como base
5. Si NO hay match → avisar y ofrecer ejecutar auto-pipeline rápida

## Paso 3 -- Detectar cambios en la vacante

Si la vacante en la pantalla difiere de la evaluada:
- **Avisar al candidato**: "La vacante cambió de [X] a [Y]. ¿Quieres que reevalúe o adapto las respuestas al nuevo título?"
- **Si adaptar**: Ajustar las respuestas al nuevo título sin reevaluar
- **Si reevaluar**: Ejecutar evaluación completa A-F, actualizar report, regenerar Bloque G
- **Actualizar tracker**: Alterar título de la vacante en `applications.md` si es necesario

## Paso 4 -- Analizar preguntas del formulario

Identificar TODAS las preguntas visibles:
- Campos de texto libre (carta de presentación, por qué esta vacante, motivación, etc.)
- Dropdowns (cómo te enteraste de la vacante, autorización de trabajo, etc.)
- Sí/No (cambio de ciudad, visa, disponibilidad, etc.)
- Campos de salario (rango, expectativa salarial)
- Campos de carga/upload (currículum, carta de presentación en PDF)

Clasificar cada pregunta:
- **Ya respondida en el Bloque G** → adaptar la respuesta existente
- **Pregunta nueva** → generar respuesta a partir del report + `cv.md`

## Paso 5 -- Generar respuestas

Para cada pregunta, generar la respuesta siguiendo:

1. **Contexto del report**: Usar proof points del Bloque B, historias STAR del Bloque F
2. **Bloque G anterior**: Si existe un borrador, usar como base y refinar
3. **Tono "Yo los estoy eligiendo"**: Mismo framework de la auto-pipeline — seguro, no suplicante
4. **Especificidad**: Referenciar algo concreto del JD visible en la pantalla
5. **career-copilot proof point**: Incluir en "Información adicional" si hay campo para ello

**Campos frecuentes en formularios del mercado hispanohablante (o internacionales):**
- **Expectativa salarial (bruta o neta; mensual o anual)** → Rango de `profile.yml`, en la moneda y periodicidad que pida el formulario, con nota "negociable según paquete total" si aplica
- **Tipo de contratación preferido** → Responder según `profile.yml` (asalariado, autónomo/freelance, contractor, etc.), o "abierto según la propuesta" si aplica
- **Disponibilidad / fecha de inicio** → Indicar una fecha realista según la situación actual, preaviso y posibles compromisos de cierre
- **Autorización de trabajo** → Responder con claridad para el país de la vacante: ciudadanía, permiso vigente, necesidad de visado o patrocinio, según corresponda

```text
## Respuestas para [Empresa] -- [Vacante]

Base: Report #NNN | Score: X.X/5 | Arquetipo: [tipo]

---

### 1. [Pregunta exacta del formulario]
> [Respuesta lista para copy-paste]

### 2. [Próxima pregunta]
> [Respuesta]

...

---

Notas:
- [Cualquier observación sobre la vacante, cambios, etc.]
- [Sugerencias de personalización que el candidato debería revisar]
```

## Paso 6 -- Post-candidatura (opcional)

Si el candidato confirma que envió la candidatura:
1. Actualizar status en `applications.md` de "Evaluated" a "Applied"
2. Actualizar Bloque G del report con las respuestas finales
3. Sugerir próximo paso: `/career-copilot contact` para LinkedIn outreach

## Manejo del Scroll (Scroll handling)

Si el formulario tiene más preguntas de las visibles:
- Pedir al candidato que haga scroll y comparta otro screenshot
- O que pegue las preguntas restantes
- Procesar en iteraciones hasta cubrir todo el formulario