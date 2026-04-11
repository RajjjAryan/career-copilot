# career-copilot -- Modos en español (`modes/es/`)

Esta carpeta contiene las traducciones al español de los principales modos de career-copilot para candidatos que apuntan al mercado hispanohablante (España, México, Argentina, Colombia, Chile, y otros países de habla hispana).

## ¿Cuándo usar estos modos?

Usa `modes/es/` si al menos una de estas condiciones se cumple:

- Postulas principalmente a **ofertas de empleo en español** (InfoJobs, LinkedIn ES, Indeed ES, Computrabajo, Bumeran, sitios de carreras)
- Tu **CV está en español** o alternas entre ES y EN según la oferta
- Necesitas respuestas y cartas de presentación en **español tech natural**, no traducido por una máquina
- Debes gestionar **especificidades contractuales hispanohablantes** : convenio colectivo, pagas extra, seguro médico, seguro de vida, 13er/14o mes, período de prueba, preaviso, tickets de comida, participación en beneficios

Si la mayoría de tus ofertas son en inglés, quédate con los modos estándar en `modes/`. Los modos en inglés funcionan para ofertas hispanohablantes, pero no conocen en detalle las especificidades del mercado hispanohablante.

## ¿Cómo activar?

### Opción 1 -- Por sesión

Dile a Copilot CLI al inicio de la sesión:

> "Usa los modos en español bajo `modes/es/`."

Copilot CLI leerá entonces los archivos de esta carpeta en lugar de `modes/`.

### Opción 2 -- De forma permanente

Agrega en `config/profile.yml` :

```yaml
language:
  primary: es
  modes_dir: modes/es
```

Recuérdaselo a Copilot CLI en tu primera sesión("Mira en `profile.yml`, configuré `language.modes_dir`"). Copilot CLI usará automáticamente los modos en español.

## ¿Qué modos están traducidos?

Esta primera iteración cubre los cuatro modos de mayor impacto:

| Archivo | Traducido desde | Rol |
|---------|-----------------|-----|
| `_shared.md` | `modes/_shared.md` (EN) | Contexto compartido, arquetipos, reglas globales, especificidades del mercado hispanohablante |
| `oferta.md` | `modes/evaluate.md` (EN) | Evaluación completa de una oferta (Bloques A-F) |
| `aplicar.md` | `modes/apply.md` (EN) | Asistente en vivo para completar formularios de candidatura |
| `pipeline.md` | `modes/pipeline.md` (EN) | Bandeja de entrada de URLs / Second Brain para las ofertas recopiladas |

Los demás modos (`scan`, `batch`, `pdf`, `tracker`, `auto-pipeline`, `deep`, `contact`, `project`, `training`) permanecen en EN/ES. Su contenido es principalmente tooling, rutas y comandos — debe mantenerse independiente del idioma.

## Lo que permanece en inglés

Deliberadamente no traducido porque es vocabulario tech estándar:

- `cv.md`, `pipeline`, `tracker`, `report`, `score`, `archetype`, `proof point`
- Nombres de herramientas (`Playwright`, `WebSearch`, `WebFetch`, `Read`, `Write`, `Edit`, `Bash`)
- Valores de estado en el tracker (`Evaluated`, `Applied`, `Interview`, `Offer`, `Rejected`)
- Fragmentos de código, rutas, comandos

Los modos usan español tech natural, tal como se habla en equipos de ingeniería en Madrid, Buenos Aires o Ciudad de México: texto corriente en español, términos técnicos en inglés donde es el uso habitual. Sin traducción forzada de "Pipeline" a "Tubería" ni de "Deploy" a "Despliegue de aplicación".

## Glosario de referencia

Para mantener un tono coherente si modificas o amplías los modos:

| Inglés | Español (en esta codebase) |
|--------|---------------------------|
| Job posting | Oferta de empleo / Anuncio |
| Application | Candidatura |
| Cover letter | Carta de presentación |
| Resume / CV | CV |
| Salary | Salario / Remuneración |
| Compensation | Remuneración / Paquete |
| Skills | Competencias / Habilidades |
| Interview | Entrevista |
| Hiring manager | Manager de contratación / Hiring manager |
| Recruiter | Reclutador (o Recruiter) |
| AI | IA (Inteligencia Artificial) |
| Requirements | Requisitos / Exigencias |
| Career history | Trayectoria profesional |
| Notice period | Preaviso |
| Probation | Período de prueba |
| Vacation | Vacaciones / Días de descanso |
| 13th month salary | 13er mes / Paga extra de fin de año |
| Permanent employment | Contrato indefinido |
| Fixed-term contract | Contrato temporal |
| Freelance | Freelance / Independiente / Autónomo |
| Collective agreement | Convenio colectivo |
| Works council | Comité de empresa |
| Profit sharing | Participación en beneficios |
| Meal vouchers | Tickets restaurante / Vales de comida |
| Health insurance | Seguro médico de empresa / Mutua |
| Disability/life insurance | Seguro de vida / Previsión social |
| Cadre status | Categoría directiva / Personal técnico cualificado |

## Contribuir

Para mejorar una traducción o agregar un modo:

1. Abre un Issue con tu propuesta (ver `CONTRIBUTING.md`)
2. Respeta el glosario anterior para mantener el tono coherente
3. Traduce de forma idiomática — sin traducción palabra por palabra
4. Conserva los elementos estructurales (Bloques A-F, tablas, bloques de código, instrucciones de herramientas) idénticos
5. Prueba con una oferta real en español (InfoJobs, LinkedIn ES, Indeed ES) antes de enviar el PR
