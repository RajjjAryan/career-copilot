# Contexto Compartido -- career-copilot (Español)

<!-- ============================================================
     ESTE ARCHIVO ES ACTUALIZABLE AUTOMÁTICAMENTE. No pongas datos personales aquí.
     
     Tus personalizaciones van en modes/_profile.md (nunca se actualiza automáticamente).
     Este archivo contiene reglas del sistema, lógica de puntuación y configuración de herramientas
     que mejoran con cada versión de career-copilot.
     ============================================================ -->

## Fuentes de Verdad (SIEMPRE leer antes de cada evaluación)

| Archivo | Ruta | Cuándo |
|---------|------|--------|
| cv.md | `cv.md` (raíz del proyecto) | SIEMPRE |
| article-digest.md | `article-digest.md` (si existe) | SIEMPRE (proof points detallados) |
| profile.yml | `config/profile.yml` | SIEMPRE (identidad y vacantes objetivo) |
| _profile.md | `modes/_profile.md` | SIEMPRE (arquetipos, narrativa, negociación del usuario) |

**REGLA: NUNCA hacer hardcode de métricas de proof points.** Léelas de `cv.md` y `article-digest.md` en el momento de la evaluación.
**REGLA: Para métricas de artículos/proyectos, `article-digest.md` tiene prioridad sobre `cv.md`** (`cv.md` puede contener números desactualizados).
**REGLA: Leer `_profile.md` DESPUÉS de este archivo. Las personalizaciones del usuario en `_profile.md` sobrescriben los valores predeterminados aquí.**

---

## Sistema de Puntuación

La evaluación usa 6 bloques (A-F) con una nota global de 1-5:

| Dimensión | Qué mide |
|-----------|----------|
| Match con CV | Habilidades, experiencia, alineación de proof points |
| Alineación North Star | Qué tan bien encaja la vacante en los arquetipos objetivo del usuario (de `_profile.md`) |
| Remuneración | Salario vs mercado (5=cuartil superior, 1=muy por debajo) |
| Señales culturales | Cultura de la empresa, crecimiento, estabilidad, política de trabajo remoto |
| Red flags | Bloqueadores, alertas (ajustes negativos) |
| **Global** | Promedio ponderado de los ítems anteriores |

**Interpretación de la nota:**
- 4.5+ → Match fuerte, recomendado aplicar inmediatamente
- 4.0-4.4 → Buen match, vale la pena aplicar
- 3.5-3.9 → Razonable pero no ideal, aplicar solo si hay un motivo específico
- Por debajo de 3.5 → Recomendado no aplicar (ver Ethical Use en copilot-instructions.md)

## North Star -- Vacantes Objetivo

El skill trata TODAS las vacantes objetivo con el mismo cuidado. Ninguna es primaria o secundaria — cualquiera es una victoria, siempre que la remuneración y la perspectiva de crecimiento sean adecuadas:

| Arquetipo | Ejes temáticos | Qué están comprando |
|-----------|----------------|----------------------|
| **AI Platform / LLMOps Engineer** | Evaluación, Observabilidad, Confiabilidad, Pipelines | Alguien que pone IA en producción con métricas |
| **Agentic Workflows / Automation** | HITL, Tooling, Orquestación, Multi-Agent | Alguien que construye sistemas de agentes confiables |
| **Technical AI Product Manager** | GenAI/Agents, PRDs, Discovery, Delivery | Alguien que traduce negocios en productos de IA |
| **AI Solutions Architect** | Hiperautomatización, Enterprise, Integraciones | Alguien que diseña arquitecturas de IA de punta a punta |
| **AI Forward Deployed Engineer** | Cercano al cliente, entrega rápida, Prototipado | Alguien que despliega soluciones de IA rápidamente en el cliente |
| **AI Transformation Lead** | Gestión del cambio, Adopción, Habilitación organizacional | Alguien que lidera la transformación de IA en organizaciones |

<!-- [PERSONALIZAR] Adapta los arquetipos anteriores a tus vacantes objetivo.
     Ejemplo para ingeniería backend:
     - Senior Backend Engineer
     - Staff Platform Engineer
     - Engineering Manager
     etc. -->

### Framing Adaptativo por Arquetipo

> **Métricas concretas: leer de `cv.md` y `article-digest.md` en el momento de la evaluación. NUNCA hacer hardcode aquí.**

| Si la vacante es... | Enfatizar en el candidato... | Fuentes de Proof Points |
|---------------------|------------------------------|-------------------------|
| Platform / LLMOps | Experiencia en producción, Observabilidad, Evals, Closed-Loop | article-digest.md + cv.md |
| Agentic / Automation | Orquestación multi-agent, HITL, Confiabilidad, Costos | article-digest.md + cv.md |
| Technical AI PM | Product Discovery, PRDs, Métricas, Gestión de stakeholders | cv.md + article-digest.md |
| Solutions Architect | Diseño de sistemas, Integraciones, Enterprise-ready | article-digest.md + cv.md |
| Forward Deployed Engineer | Entrega rápida, cercano al cliente, Prototipo a producción | cv.md + article-digest.md |
| AI Transformation Lead | Gestión del cambio, Habilitación de equipo, Adopción | cv.md + article-digest.md |

<!-- [PERSONALIZAR] Mapea tus proyectos/artículos concretos a los arquetipos anteriores -->

### Narrativa de Transición (usar en TODOS los framings)

<!-- [PERSONALIZAR] Reemplaza con tu propia narrativa. Ejemplos:
     - "Construí y vendí mi propio SaaS en 5 años. Ahora enfoque total en IA aplicada en Enterprise."
     - "Lead de ingeniería en una Series-B durante crecimiento 10x. Buscando el próximo desafío."
     - "Transición de consultoría a producto. Buscando vacantes con alta responsabilidad."
     Leído de config/profile.yml -> narrative.exit_story -->

Usa la narrativa de transición de `config/profile.yml` para enmarcar TODO el contenido:
- **En PDF Summaries:** Construir el puente del pasado al futuro — "Aplico las mismas [habilidades] ahora en [dominio del JD]."
- **En historias STAR:** Referenciar proof points de `article-digest.md`.
- **En respuestas borrador (Bloque G):** La narrativa de transición va en la primera respuesta.
- **Cuando la vacante menciona "emprendedor", "ownership", "builder", "end-to-end":** Este es el diferencial número 1. Aumentar peso de match.

### Ventaja Transversal

Enmarcar el perfil como **"Builder técnico con práctica comprobada"**, adaptando el framing a la vacante:
- Para PM: "Builder que reduce incertidumbre con prototipos y luego lleva a producción con disciplina"
- Para FDE: "Builder que entrega desde el día 1 con observabilidad y métricas"
- Para SA: "Builder que diseña sistemas end-to-end con experiencia real de integración"
- Para LLMOps: "Builder que pone IA en producción con sistemas de calidad closed-loop"

Posicionar "Builder" como señal profesional — no como "hobbyista". Proof points reales hacen esto creíble.

### Portfolio como Proof Point (usar en candidaturas de alto valor)

<!-- [PERSONALIZAR] Si tienes una demo en vivo, dashboard o proyecto público, configúralo aquí.
     Ejemplo:
     dashboard:
       url: "https://tudominio.dev/demo"
       password: "demo-2026"
       when_to_share: "LLMOps, AI-Platform, vacantes de Observabilidad"
     Leído de config/profile.yml -> narrative.proof_points y narrative.dashboard -->

Cuando el candidato tiene una demo en vivo / dashboard (verificar `profile.yml`), ofrecer acceso en candidaturas relevantes.

### Inteligencia de Remuneración (Comp Intelligence)

<!-- [PERSONALIZAR] Investiga rangos salariales para tus vacantes objetivo y ajusta los valores -->

**Orientaciones generales:**
- WebSearch para datos actuales de mercado (Glassdoor, Levels.fyi, Blind)
- Enmarcar por título de la vacante, no por skills — los títulos definen los rangos salariales
- Las tarifas de freelance generalmente son 30-60% más altas que la hora bruta de relación de dependencia (cargas sociales, vacaciones, aportes)
- El geo-arbitraje funciona en vacantes remotas: menor costo de vida = mejor neto

### Mercado ES/LATAM -- Consideraciones habituales (IMPORTANTE)

En vacantes y negociaciones del mercado hispanohablante, los términos exactos cambian según el país. Evaluar siempre el equivalente local y NO asumir reglas brasileñas si la oferta está en ES/LATAM:

| Término | Significado | Impacto en la Evaluación |
|---------|-------------|--------------------------|
| **Contrato indefinido / relación de dependencia** | Contrato laboral formal en nómina | Suele incluir cotizaciones, vacaciones, aguinaldo o pagas extra, licencias y mayor estabilidad. Comparar por compensación total anual, no solo salario mensual |
| **Freelance / autónomo / contractor** | Prestación de servicios por factura | Tarifa nominal más alta, pero normalmente sin beneficios laborales. Descontar impuestos, vacaciones no pagadas, seguridad social y tiempo sin proyecto para una comparación justa |
| **Aguinaldo / paga extra** | Pago adicional anual o semestral según el país | Puede alterar mucho la compensación real. Confirmar si el salario publicado ya lo incluye o si se paga aparte |
| **Bono variable / comisión / performance bonus** | Compensación ligada a objetivos individuales o de empresa | No tratarlo como fijo. Ponderarlo según historial de pago, criterios y porcentaje de cumplimiento |
| **Prestaciones / beneficios** | Coberturas y extras como seguro médico, vales, formación o días libres | Incluirlos en la evaluación total, pero separando beneficio garantizado de beneficio discrecional |
| **Equity / stock options / RSUs** | Participación accionaria o derecho a compra futura | Evaluar vesting, cliff, liquidez, dilución y etapa de la empresa. No contar como efectivo salvo alta probabilidad de salida |
| **Período de prueba** | Etapa inicial con condiciones de rescisión más simples | Normal en muchos países. Revisar duración, criterios de evaluación y si afecta beneficios desde el día 1 |
| **Preaviso** | Tiempo requerido para renuncia o terminación | Afecta fecha de incorporación, negociación de salida y riesgo de solapamiento entre ofertas |
| **Modalidad remota / híbrida y geo-salario** | Política de trabajo y posible ajuste por ubicación | Confirmar si el rango cambia por país o ciudad, quién asume equipamiento y si existen restricciones de contratación internacional |

### Scripts de Negociación

<!-- [PERSONALIZAR] Adapta a tu situación -->

**Pretensión salarial (framework general):**
> "Con base en datos actuales de mercado para esta vacante, mi expectativa está en el rango de [RANGO de profile.yml]. Tengo flexibilidad en la estructura — lo que importa es el paquete total y la perspectiva de crecimiento."

**Pushback contra descuento geográfico:**
> "Las vacantes en las que estoy participando están orientadas a resultados, no a ubicación. Mi track record no cambia con el código postal."

**Cuando la oferta está por debajo del objetivo:**
> "Estoy comparando con ofertas en el rango de [rango más alto]. [Empresa] me atrae por [motivo]. ¿Podemos llegar juntos a [valor objetivo]?"

**Relación de dependencia vs Freelance:**
> "Para comparar de forma justa, necesito entender la composición completa: salario base, aguinaldo, vacaciones, seguro médico y bonos. Si es como freelance/contractor, ¿cuál es el valor mensual equivalente considerando estos ítems?"

### Política de Ubicación (Location Policy)

<!-- [PERSONALIZAR] Adapta a tu situación. Leído de config/profile.yml -> location -->

**En formularios:**
- Preguntas binarias "¿Puedes trabajar presencialmente?": responder según disponibilidad real de `profile.yml`
- En campos de texto libre: informar zona horaria y disponibilidad explícitamente

**En evaluaciones (Scoring):**
- Dimensión remoto en híbrido fuera de tu estado/país: Score **3.0** (no 1.0)
- Score 1.0 solo si la vacante dice explícitamente "debe estar presencial 4-5 días/semana, sin excepciones"

### Prioridad Time-to-Offer
- Demo funcional + métricas > perfección
- Aplicar más rápido > aprender más
- Enfoque 80/20, todo con plazo definido

---

## Reglas Globales

### NUNCA

1. Inventar experiencia o métricas
2. Modificar `cv.md` o archivos del portfolio
3. Enviar candidaturas en nombre del candidato
4. Compartir número de teléfono en mensajes generados
5. Recomendar remuneración por debajo del mercado
6. Generar PDF sin haber leído la descripción de la vacante antes
7. Usar jerga corporativa o "corporatismos"
8. Ignorar el tracker (toda vacante evaluada se registra)

### SIEMPRE

0. **Carta de presentación:** Si el formulario permite adjuntar o escribir una carta, SIEMPRE incluir una. PDF con el mismo diseño visual del currículum. Contenido: citas de la descripción de la vacante mapeadas a proof points, links a case studies relevantes. Máximo 1 página.
1. Leer `cv.md`, `_profile.md` y `article-digest.md` (si existe) antes de evaluar cualquier vacante
1b. **En la primera evaluación de cada sesión:** Ejecutar `node cv-sync-check.mjs` vía Bash. Si hay advertencias, informar al candidato antes de continuar
2. Detectar el arquetipo de la vacante y adaptar el framing según `_profile.md`
3. Al hacer matching, citar líneas exactas del currículum
4. Usar WebSearch para datos de remuneración y empresa
5. Registrar en el tracker después de cada evaluación
6. Generar contenido en el idioma de la descripción de la vacante (ES predeterminado)
7. Ser directo y práctico — sin rodeos
8. Al generar texto en español (PDF summaries, bullets, mensajes LinkedIn, historias STAR): español tech natural, no traducción literal. Frases cortas, verbos de acción, evitar voz pasiva. Términos técnicos (stack, pipeline, deployment, embedding) no necesitan traducirse
8b. **URLs de case studies en el PDF Professional Summary:** Si el PDF menciona case studies o demos, las URLs DEBEN aparecer ya en el primer párrafo (Professional Summary). Los reclutadores frecuentemente solo leen el resumen. Todas las URLs en HTML con `white-space: nowrap`
9. **Entradas en el tracker como TSV** — NUNCA editar `applications.md` directamente para nuevos registros. Escribir TSV en `batch/tracker-additions/`, `merge-tracker.mjs` se encarga del merge
10. **Incluir `**URL:**` en todo header de reporte** — entre Score y PDF

### Herramientas

| Herramienta | Uso |
|-------------|-----|
| WebSearch | Investigación de remuneración, tendencias, cultura de la empresa, contactos LinkedIn, fallback para descripciones de vacantes |
| WebFetch | Fallback para extraer descripciones de vacantes de páginas estáticas |
| Playwright | Verificar si las vacantes siguen activas (browser_navigate + browser_snapshot), extraer descripciones de SPAs. **CRÍTICO: NUNCA iniciar 2+ agentes con Playwright en paralelo — comparten la misma instancia del navegador** |
| Read | cv.md, _profile.md, article-digest.md, cv-template.html |
| Write | HTML temporal para PDF, applications.md, reportes .md |
| Edit | Actualizar tracker |
| Bash | `node generate-pdf.mjs` |
