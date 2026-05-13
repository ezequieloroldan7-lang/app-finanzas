# CLAUDE.md — Mis Finanzas

> **Última actualización:** Mayo 2026  
> **Estado del proyecto:** Activo — transformación hacia versión profesional  
> **Versión actual:** 0.x (pre-1.0) — fundacional, en refactor

App personal de finanzas para usuarios argentinos. Gestiona gastos con tarjetas (cuotas, resúmenes, cierre), gastos generales y recurrentes, ingresos, presupuesto mensual, gastos compartidos, archivos/facturas, y un asistente IA financiero. Desplegada como PWA en Vercel con backend Supabase.

---

## 🏗 Stack técnico real (actualizado)

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React 19, Vite 5, Tailwind CSS 3 | Sin TypeScript aún |
| Base de datos | Supabase (PostgreSQL + realtime) | RLS activo en todas las tablas |
| Auth | Supabase Auth (email/password + Google OAuth) | |
| Charts | Recharts 3 | |
| Icons | Lucide React 0.460 | |
| **AI** | **Groq API (`llama-3.3-70b-versatile`)** | ⚠️ El CLAUDE.md anterior decía Gemini — ya NO se usa |
| OCR | Tesseract.js 7 | Lazy import, worker singleton sin cleanup |
| PDF | pdfjs-dist 4 | Lazy import |
| Excel | xlsx 0.18.5 | Lazy import |
| Email | Resend 6 | Usado en `api/send-invite.js` |
| Push | web-push 3.6 | Usado en `api/push-notify.js` |
| PWA | vite-plugin-pwa 0.21 + Workbox | |
| Deploy | Vercel + serverless functions en `api/` | |

> ⚠️ `@google/generative-ai` sigue en `package.json` pero `gemini.js` está muerto (sin importadores). Eliminar en el próximo cleanup.

---

## Comandos de desarrollo

```bash
npm run dev       # Servidor local en http://localhost:5173
npm run build     # Build de producción
npm run lint      # ESLint
npm run preview   # Preview del build
```

---

## Variables de entorno

Copiar `.env.local.example` a `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GROQ_API_KEY=gsk_...          # ← Groq, no Gemini
VITE_GEMINI_API_KEY=AIzaSy...      # Legado — no se usa en producción, eliminar
```

Variables del servidor (Vercel / `api/`):
```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Solo para cron — NUNCA exponer al cliente
CRON_SECRET=...
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
APP_URL=https://app-finanzas.vercel.app
```

---

## Tablas Supabase

Todas tienen `id` (UUID PK) y `user_id` (FK a `auth.users`). RLS activo.

### `expenses`
| Columna | Tipo | Descripción |
|---|---|---|
| card_id | uuid | FK a cards. NULL = gasto sin tarjeta |
| date | date | Fecha de compra |
| description | text | |
| amount | numeric | Monto en currency original |
| currency | text | `'ARS'` o `'USD'` |
| exchange_rate | numeric | Tipo de cambio si USD |
| category_id | uuid | FK a categories |
| total_cuotas | int | 1 = pago único |
| tna | numeric | Tasa nominal anual (%) |

### `recurring_expenses`
| Columna | Tipo | Descripción |
|---|---|---|
| card_id | uuid | FK a cards (opcional) |
| description | text | |
| amount | numeric | |
| currency | text | |
| exchange_rate | numeric | |
| category_id | uuid | |
| day_of_month | int | Día de cobro |
| start_date | date | |
| end_date | date | NULL = indefinido |

### `cards`
| Columna | Tipo | Descripción |
|---|---|---|
| name | text | Ej: "Visa", "Naranja" |
| closing_day | int | Día nominal de cierre |
| closing_dates | jsonb | Overrides por mes: `{"2024-03": 14}` |
| color | text | Hex |

### `categories`
| Columna | Tipo | Descripción |
|---|---|---|
| name | text | |
| emoji | text | |
| color | text | Hex |

### `budgets`
| Columna | Tipo | Descripción |
|---|---|---|
| monthly_limit | numeric | Límite mensual global |
| category_limits | jsonb | `{categoryId: monto}` |

> ⚠️ `monthlyInflation` se persiste en **localStorage** (no Supabase) — inconsistencia conocida.

### `income` + `income_categories`
Ingresos del usuario y sus categorías de ingreso.

### `files`
Archivos subidos (resúmenes, facturas). El campo `notes` contiene `"date:YYYY-MM-DD"` para facturas — hack de serialización, no hay columna `date` separada.

### `shared_folders`, `shared_folder_members`, `shared_folder_invites`
Sistema de gastos compartidos entre usuarios.

### `savings_goals` (solo localStorage)
> ⚠️ No tiene tabla en Supabase. Los datos se pierden al cambiar de dispositivo. Pendiente migrar.

### Migraciones aplicadas
```sql
-- Aplicada manualmente — sin tooling de migraciones
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS closing_dates jsonb NOT NULL DEFAULT '{}';
```
> Las migraciones SQL están en la raíz del repo (`supabase-migration.sql`, `supabase-shared-migration.sql`). No hay CLI de Supabase configurado.

---

## Arquitectura actual

### Sin routing — todo modal
No hay React Router. La navegación es por estado (`activeTab`) y modales en `App.jsx`.
> ⚠️ Consecuencia: back/forward del browser no funciona. Deep-linking imposible.

### Patrón de hooks de datos
Cada hook sigue este patrón:
1. Carga datos de Supabase al montar
2. Suscribe a `postgres_changes` para sync en tiempo real
3. Expone operaciones async (`upsert`, `save`, `delete`, `setAll`)
4. Mapea snake_case (DB) ↔ camelCase (JS) con `fromDb`/`toDb`

> ⚠️ Solo algunos hooks usan `useSupabaseRealtimeSync`. Otros implementan el patrón manualmente (`useCards`, `useIncome`, `useBudget`, `useFiles`). Inconsistencia a resolver.

### Tabs de navegación
| Tab | Vista | Componente |
|---|---|---|
| Inicio | Dashboard con KPIs y analytics | `App.jsx` (inline `Dashboard`) |
| Tarjetas | Resumen de tarjetas + cuotas | `TarjetasView.jsx` |
| Gastos | Gastos sin tarjeta + compartidos | `GastosView.jsx` |
| Ingresos | Registro de ingresos | `IngresoView.jsx` |
| Archivos | Resúmenes y facturas subidas | `ArchivosView.jsx` |
| IA | Chat financiero con Groq | `ChatIA.jsx` |

---

## Estructura de archivos completa

```
api/
├── cron/
│   └── monthly-summary.js    # Resumen mensual por email (usa service role key)
├── push-notify.js            # Notificaciones push Web Push
├── send-invite.js            # Envío de invitaciones por email (Resend)
└── notify-expense.js         # Notificación de gasto a pareja

src/
├── pages/
│   ├── App.jsx               # Orquesta auth + Dashboard (God Component — ver deuda técnica)
│   └── Login.jsx             # Auth: email/pass + Google OAuth
├── hooks/
│   ├── useAuth.js            # user, signIn, signUp, signInWithGoogle, signOut
│   ├── useExpenses.js        # expenses, upsertExpense, deleteExpense, setAll
│   ├── useCards.js           # cards, save, setAll (seeds Visa+Mastercard si vacío)
│   ├── useCategories.js      # categories, save, setAll (seeds 10 defaults)
│   ├── useRecurring.js       # recurring, save, setAll
│   ├── useBudget.js          # budget, saveBudget (⚠️ inflation en localStorage)
│   ├── useIncome.js          # income, upsertIncome, deleteIncome
│   ├── useIncomeCategories.js
│   ├── useFiles.js           # files, uploadFile, getDownloadUrl, deleteFile
│   ├── useSharedFolders.js   # myFolder, members, invites, createFolder, inviteMember
│   ├── useSharedExpenses.js  # gastos del folder compartido
│   ├── useSavingsGoal.js     # ⚠️ Solo localStorage — no persiste entre dispositivos
│   ├── useMonthNavigation.js # hook compartido para navegar meses
│   └── useSupabaseRealtimeSync.js  # Hook genérico de sync realtime
├── lib/
│   ├── supabase.js           # Cliente Supabase
│   ├── formatters.js         # formatARS, formatUSD, monthKey, uid, convertToARS
│   ├── cuotas.js             # Lógica de cuotas: getAdjustedClosingDate, getFirstResumen,
│   │                         # cuotaWithInterest, getCuotasDistribution, getRecurringForMonth
│   ├── aggregations.js       # getMonthlyTotals, getCuotasForMonth, getCategoryBreakdown,
│   │                         # getMoMByCategory, getUSDExposure, getIncomeForMonth
│   ├── health.js             # getHealthScore (0-100, 4 componentes)
│   ├── detectRecurring.js    # Detecta patrones recurrentes en gastos
│   ├── ai.js                 # buildFinancialContext, sendChatMessage (Groq)
│   ├── gemini.js             # ⚠️ MUERTO — sin importadores. Eliminar.
│   ├── parseResumen.js       # Parser de resúmenes bancarios AR (Visa, MC, BBVA, etc.)
│   ├── recognizeResumen.js   # AI recognition de archivos subidos
│   ├── parsePdf.js           # Extracción de texto desde PDF
│   ├── ocr.js                # Tesseract OCR + heurística de montos (⚠️ worker sin cleanup)
│   ├── cotizacion.js         # fetchRates() desde dolarapi.com (tarjeta/blue/oficial)
│   ├── notificaciones.js     # Push notifications de cierre (3 días antes)
│   ├── exportExcel.js        # Exporta .xlsx con 3 hojas
│   └── storage.js            # ⚠️ MUERTO — legado localStorage. Eliminar.
├── components/
│   ├── BottomNav.jsx
│   ├── AddExpenseModal.jsx   # ⚠️ Hace demasiado: OCR + rates + AI + upload + cuotas
│   ├── AddIncomeModal.jsx
│   ├── AddSharedExpenseModal.jsx
│   ├── SettingsModal.jsx     # 709 líneas — multi-tab modal con sub-modales
│   ├── CardEditModal.jsx
│   ├── CategoryEditModal.jsx
│   ├── RecurringEditModal.jsx
│   ├── ImportarResumenModal.jsx
│   ├── MetasAhorroModal.jsx
│   ├── YearlyModal.jsx
│   ├── TarjetasView.jsx
│   ├── GastosView.jsx        # 737 líneas — ver deuda técnica
│   ├── IngresoView.jsx
│   ├── ArchivosView.jsx
│   ├── CompartidoView.jsx
│   ├── ChatIA.jsx            # Chat con Groq
│   ├── HeroKPI.jsx
│   ├── HealthScoreCard.jsx
│   ├── BalanceCard.jsx
│   ├── ProjectionChart.jsx
│   ├── CategoryStackedChart.jsx
│   ├── CardHistoryChart.jsx
│   ├── CardComparisonChart.jsx
│   ├── SharedBalanceChart.jsx
│   ├── CategoryBreakdown.jsx
│   ├── USDExposure.jsx
│   ├── RecurringPreview.jsx
│   ├── RecurringSuggestions.jsx
│   ├── ExpenseList.jsx
│   ├── MonthSwitcher.jsx
│   ├── FilterPill.jsx
│   ├── FormSection.jsx
│   ├── EmptyState.jsx
│   ├── Toast.jsx             # ToastContainer + useToast hook
│   └── ErrorBoundary.jsx
└── constants.js              # MONTH_NAMES, DEFAULT_CATEGORIES, CUOTA_OPTIONS, etc.
```

**Archivos a eliminar (dead code):**
- `mis-finanzas-v2.jsx` — prototipo monolítico en la raíz, sin importadores
- `src/lib/gemini.js` — reemplazado por `ai.js` (Groq)
- `src/lib/storage.js` — migración a Supabase completada, ya no se usa
- `@google/generative-ai` del `package.json`

---

## Lógica de negocio clave

### Cierre de tarjeta
`getAdjustedClosingDate(year, month, nominalDay, closingDates)`:
- Si `closingDates["YYYY-MM"]` existe → usa ese día directamente
- Sino → ajusta el día nominal: sábado→viernes, domingo→viernes

### Cuotas
`getCuotasDistribution(expense, cards)`:
- Determina el primer resumen con `getFirstResumen` (fecha de compra vs cierre)
- Distribuye N cuotas en meses consecutivos
- Interés: sistema francés con `cuotaWithInterest(amount, n, tnaPercent)`

### Gastos sin tarjeta
- `card_id = NULL` en la tabla `expenses`
- Aparecen en "Gastos", no en el dashboard de cuotas

### Detección de recurrentes
`detectRecurring(expenses, recurring)`:
- Ventana de 6 meses, ≥2 apariciones, siempre 1 cuota, monto ±20%
- Agrupa por descripción normalizada

### Health Score (0-100)
4 componentes de 25 pts c/u:
1. **Tendencia**: gasto actual vs promedio últimos 3 meses
2. **Compromiso futuro**: promedio próximos 3 meses vs actual
3. **Cuotas largas**: % de cuotas >12 meses
4. **Presupuesto**: cumplimiento del límite mensual

### Chat IA (Groq)
- Key: usa `VITE_GROQ_API_KEY` del env; si no, la pide al usuario (guardada en localStorage)
- Contexto: últimos 3 meses por categoría + recurrentes + tarjetas + presupuesto + ingresos
- Modelo: `llama-3.3-70b-versatile`

---

## ⚠️ Deuda técnica crítica

Este listado es la base del roadmap de refactor. Ordenado por prioridad.

### 🔴 Crítico (seguridad)

**[SEC-1] API keys en localStorage accesibles por XSS**
- `ChatIA.jsx`: `localStorage.getItem('groq_api_key')`
- `AddExpenseModal.jsx`: usa la key de Groq directamente desde el browser
- `recognizeResumen.js`: `localStorage.getItem('gemini_api_key')`
- **Fix**: Proxy todas las llamadas AI a través de un serverless function (`api/ai-proxy.js`). La key nunca sale del servidor.

**[SEC-2] Endpoints serverless sin CORS ni autenticación**
- `api/push-notify.js`, `api/send-invite.js`, `api/notify-expense.js`
- Aceptan POST de cualquier origen sin token
- **Fix**: Validar JWT de Supabase en cada endpoint (`supabase.auth.getUser(token)`)

**[SEC-3] `api/monthly-summary.js` — CRON_SECRET no requerido cuando está undefined**
- Line 17: solo se valida si `process.env.CRON_SECRET` es truthy
- **Fix**: Forzar el check siempre; lanzar 401 si la var no está configurada

**[SEC-4] `window.open(url, '_blank')` sin `noopener,noreferrer`**
- `App.jsx` line 322
- **Fix**: Agregar `'noopener,noreferrer'` como tercer argumento

**[SEC-5] Análisis financiero auto-generado en localStorage**
- `App.jsx` lines 148-159: `localStorage['autoAnalysis-YYYY-MM']`
- Expone datos financieros en texto plano en dispositivos compartidos
- **Fix**: Mantener solo en memoria (estado React) o cifrar antes de persistir

### 🟠 Alto (arquitectura)

**[ARCH-1] God Component — `Dashboard` en `App.jsx`**
- 577 líneas, 14 hooks, 12 useState, todos los handlers
- **Fix**: Extraer un `AppContext` (o Zustand store) con todos los datos compartidos. Convertir `Dashboard` en un thin orchestrator.

**[ARCH-2] Month navigation no sincroniza entre tabs**
- `App.jsx`, `GastosView.jsx`, `TarjetasView.jsx`, `IngresoView.jsx` tienen navegación de mes independiente
- **Fix**: Un solo estado de mes en el contexto global pasado como prop a todas las views.

**[ARCH-3] Dos patrones de realtime sync coexistentes**
- Solo `useExpenses`, `useRecurring`, `useCategories`, `useIncomeCategories` usan `useSupabaseRealtimeSync`
- Los demás (`useCards`, `useIncome`, `useBudget`, `useFiles`) tienen su propio `useEffect` manual
- **Fix**: Migrar todos los hooks al patrón `useSupabaseRealtimeSync`

**[ARCH-4] `useBudget` con persistencia dividida**
- `monthly_limit` y `category_limits` → Supabase
- `monthlyInflation` → localStorage (se pierde en otro dispositivo)
- **Fix**: Agregar columna `monthly_inflation numeric` a la tabla `budgets`

**[ARCH-5] `useSavingsGoal` solo localStorage**
- No sobrevive cambio de dispositivo o limpieza del browser
- **Fix**: Crear tabla `savings_goals` en Supabase y migrar el hook

**[ARCH-6] Sin routing — deep-linking imposible**
- El botón atrás del browser no navega, compartir links no funciona
- **Fix** (mediano plazo): Agregar `react-router-dom` con URLs shallow (`/?tab=gastos&month=2026-05`)

**[ARCH-7] `handleImportResumen` / `handleReset` sin rollback**
- Son delete-then-insert sin transacción. Si el insert falla, los datos quedan borrados
- **Fix**: Guardar estado previo antes de la operación y restaurar si falla

**[ARCH-8] `getMonthlyTotals` con ventana de 23 meses**
- Se recalcula en cada update de `expenses`
- **Fix**: Separar en dos `useMemo` (histórico y proyección), cachear distribuciones por `expense.id`

### 🟡 Medio (UX/calidad)

**[UX-1] `confirm()` / `alert()` nativo para acciones destructivas** — 7 instancias. Fix: componente `ConfirmDialog`.

**[UX-2] `AddExpenseModal.jsx` hace demasiado (549 líneas)** — OCR + rates + AI + upload + cuotas. Fix: extraer `useExchangeRates`, `useAICategory`, `useReceiptUpload`.

**[UX-3] `GastosView.jsx` 737 líneas** — Fix: separar en `GastosPersonalesView` + `GastosCompartidosView`.

**[UX-4] `SettingsModal.jsx` 709 líneas** — Fix: un sub-componente por tab.

**[UX-5] Sin accesibilidad (ARIA)** — Modales sin `role="dialog"`, botones icon-only sin `aria-label`, color-only para estado de presupuesto, swipe sin alternativa de teclado.

**[UX-6] Error handling invisible** — La mayoría de los hooks solo hacen `console.error`. Fix: todos los hooks deben `throw`; App.jsx captura con `showToast`.

### 🟢 Bajo (deuda menor)

- `console.warn` en `formatters.js` dispara en producción para gastos USD sin tipo de cambio
- Nombres de modelo AI hardcodeados en `ai.js` y `AddExpenseModal.jsx`
- `api/send-invite.js` tiene URL hardcodeada como fallback
- Worker de Tesseract sin `terminate()` — leak de memoria en sesiones largas
- IIFE en JSX render en `App.jsx` — mover a `useMemo`
- `useSharedFolders` recarga todo en eventos realtime no filtrados por usuario

---

## 🚀 Roadmap de transformación profesional

### Fase 1 — Seguridad y estabilidad (hacer YA)

- [ ] **AI Proxy**: Crear `api/ai-proxy.js` que valide JWT de Supabase y ejecute llamadas a Groq server-side. Eliminar todas las llamadas directas al cliente.
- [ ] **Auth en serverless**: Validar `Authorization: Bearer <supabase-jwt>` en todos los endpoints de `api/`
- [ ] **CRON_SECRET obligatorio**: Hacer el check siempre, no solo cuando está definido
- [ ] **Limpiar dead code**: Eliminar `gemini.js`, `storage.js`, `mis-finanzas-v2.jsx`, `@google/generative-ai`
- [ ] **Rollback en imports destructivos**: Envolver `handleImportResumen` y `handleReset` en try/catch con restauración de estado previo
- [ ] **Confirm dialogs**: Reemplazar `confirm()` por componente `ConfirmDialog`
- [ ] **`window.open` seguro**: Agregar `noopener,noreferrer`

### Fase 2 — Arquitectura (refactor estructural)

- [ ] **AppContext / Zustand**: Extraer todo el estado global de `Dashboard` a un store
- [ ] **Unificar month navigation**: Un solo estado de mes compartido por todas las views
- [ ] **Migrar hooks a `useSupabaseRealtimeSync`**: `useCards`, `useIncome`, `useBudget`, `useFiles`
- [ ] **Migrar `savings_goals` a Supabase**: Crear tabla + migrar `useSavingsGoal`
- [ ] **Migrar `monthlyInflation` a Supabase**: Agregar columna en `budgets`
- [ ] **Descomponer `AddExpenseModal`**: Extraer `useExchangeRates`, `useAICategory`, `useReceiptUpload`
- [ ] **Descomponer `GastosView`**: Separar gastos personales vs compartidos
- [ ] **Descomponer `SettingsModal`**: Un sub-componente por tab
- [ ] **Error handling uniforme**: Todos los hooks lanzan errores; handlers en App.jsx muestran toasts

### Fase 3 — Calidad y testing

- [ ] **Vitest**: Configurar + tests para toda `src/lib/` (cuotas, aggregations, health, parseResumen, detectRecurring)
- [ ] **TypeScript**: Migración incremental con `allowJs: true` — empezar por `lib/` y `hooks/`
- [ ] **Accesibilidad**: ARIA labels, focus trapping en modales, roles `dialog`, alternativas de teclado
- [ ] **Performance**: Separar memoización histórica vs proyección; cleanup del worker de Tesseract

### Fase 4 — Features revolucionarios

- [ ] **Routing real**: `react-router-dom` con URLs shallow (`/?tab=gastos&month=2026-05`)
- [ ] **Modo offline completo**: Service worker con sync diferida para gastos sin conexión
- [ ] **AI proactiva**: Detección automática de anomalías, alertas push de cierre próximo, insights mensuales automáticos
- [ ] **Importación inteligente mejorada**: Parser multi-banco más robusto con fallback a AI para bancos nuevos
- [ ] **Multi-moneda real**: Histórico de tipos de cambio, conversión al cierre del día
- [ ] **Proyección de deuda**: Visualizar cuándo se liquida cada cuota, cuándo queda libre la tarjeta
- [ ] **Modo turista**: Track automático de gastos en USD con conversión al tipo tarjeta del día
- [ ] **Exportación fiscal**: Reporte de gastos deducibles en formato AFIP-compatible
- [ ] **Widget nativo iOS/Android**: Gasto del mes visible desde la pantalla de inicio (PWA + Shortcuts)
- [ ] **Onboarding inteligente**: Wizard guiado para primeros usuarios con seed data de ejemplo

---

## Convenciones de código

### Nomenclatura
- Componentes: `PascalCase.jsx`
- Hooks: `camelCase.js`, siempre prefijo `use`
- Funciones de lib: `camelCase`, exportaciones nombradas (no default)
- Constantes: `UPPER_SNAKE_CASE` en `constants.js`
- DB → JS: siempre via `fromDb()` / `toDb()` — nunca acceder a columnas `snake_case` en componentes

### Patrones obligatorios
- **Cero llamadas directas a APIs externas desde componentes** — siempre un hook o un serverless proxy
- **Todos los errores de hooks deben llegar al usuario** — `throw` en hooks, catch en handlers, `showToast` al usuario
- **Sin `confirm()` / `alert()` nativos** — usar `ConfirmDialog`
- **Sin `console.log` en producción** — solo `console.error` en hooks, eliminar antes de mergear
- **Cada modal necesita** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, y focus trap
- **Botones icon-only necesitan** `aria-label` siempre

### Estructura canónica de un hook de datos
```js
export function useXxx(userId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Usar useSupabaseRealtimeSync — NO reimplementar el patrón manualmente
  useSupabaseRealtimeSync({
    userId,
    table: 'xxx',
    fromDb,
    setData,
    setLoading,
  });

  const upsert = useCallback(async (item) => {
    const { error } = await supabase.from('xxx').upsert(toDb(item));
    if (error) throw new Error(error.message); // ← siempre throw, nunca silencioso
  }, []);

  return { data, loading, upsert };
}
```

---

## PWA / Mobile

Iconos en `public/`:
- `icon-192.png`, `icon-512.png` — propósito `any`
- `icon-maskable-192.png`, `icon-maskable-512.png` — propósito `maskable`
- `apple-touch-icon.png` (180×180) — iOS

Para publicar en Play Store: [pwabuilder.com](https://pwabuilder.com) con la URL de producción → genera `.aab` para Google Play (costo único USD 25).

---

## Deployment (Vercel)

`vercel.json` configura:
- Rewrite de todas las rutas a `/index.html` (SPA)
- Cache 1 año para `/assets/*`
- No-cache para `sw.js`

Variables de entorno en Vercel:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server), `CRON_SECRET`
- `RESEND_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `APP_URL`

Para Google OAuth en producción: agregar la URL de Vercel en Supabase → Authentication → URL Configuration → Redirect URLs.

---

## Contexto del dominio (Argentina)

- **Tarjetas de crédito**: el sistema de cuotas argentino es único — una compra en 12 cuotas genera 12 débitos en 12 resúmenes distintos, cada uno con fecha de cierre específica.
- **Tipos de cambio**: existen múltiples cotizaciones (oficial, blue, tarjeta/MEP). La app usa `dolarapi.com` para obtenerlos en tiempo real.
- **Inflación**: el campo `monthlyInflation` permite proyectar gastos ajustados por inflación mensual.
- **Resúmenes bancarios**: cada banco argentino tiene un formato PDF diferente. `parseResumen.js` tiene parsers para Visa, Mastercard, BBVA, Galicia, Santander, Brubank, HSBC, Naranja, entre otros.
- **Fecha de cierre**: varía por tarjeta, por mes, y puede caer en fin de semana (siempre se corre al viernes anterior).

---

*Este documento es la fuente de verdad del proyecto. Mantenerlo actualizado es tan importante como el código mismo.*
