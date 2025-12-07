# 🔄 Guia de Migração de Imports

Este guia mapeia onde cada função deve ser importada após a modularização.

## 📦 Tipos

```typescript
// ❌ Antes
import { Client, Payment, Log, Bairro, Rua, TopCliente, CrediarioPorBairro, ClientesPorRua } from "../database/db";

// ✅ Depois
import type { Client, Payment, Log, Bairro, Rua, TopCliente, CrediarioPorBairro, ClientesPorRua } from "../database/types";
```

## 👥 Clientes (Repositories)

```typescript
// ❌ Antes
import { addClient, deleteClient, getAllClients, getClientById, getUpcomingCharges, getClientsByRua, getClientesPrioritariosHoje } from "../database/db";

// ✅ Depois
import { 
  addClient, 
  deleteClient, 
  getAllClients, 
  getClientById, 
  getUpcomingCharges, 
  getClientsByRua, 
  getClientesPrioritariosHoje 
} from "../database/repositories/clientsRepo";
```

## 💵 Pagamentos (Repositories)

```typescript
// ❌ Antes
import { addPayment, getPaymentsByClient, deletePayment, marcarClienteAusente } from "../database/db";

// ✅ Depois
import { 
  addPayment, 
  getPaymentsByClient, 
  deletePayment, 
  marcarClienteAusente 
} from "../database/repositories/paymentsRepo";
```

## 📜 Logs (Repositories)

```typescript
// ❌ Antes
import { addLog, getLogsByClient, addLogAndGet } from "../database/db";

// ✅ Depois
import { 
  addLog, 
  getLogsByClient, 
  addLogAndGet 
} from "../database/repositories/logsRepo";
```

## 🏘️ Bairros e Ruas (Repositories)

```typescript
// ❌ Antes
import { getAllBairros, addBairro, getRuasByBairro, addRua } from "../database/db";

// ✅ Depois
import { 
  getAllBairros, 
  addBairro, 
  getBairroById,
  updateBairro,
  deleteBairro
} from "../database/repositories/bairroRepo";

import { 
  getRuasByBairro, 
  addRua,
  getAllRuas,
  getRuaById,
  updateRua,
  deleteRua
} from "../database/repositories/ruaRepo";
```

## 🔍 Busca (Services)

```typescript
// ❌ Antes
import { getClientsBySearch, searchClients } from "../database/db";

// ✅ Depois
import { 
  getClientsBySearch, 
  searchClients 
} from "../database/services/searchService";
```

## 📊 Relatórios (Services)

```typescript
// ❌ Antes
import { getTotals, getTotalHoje, getTopClientesMes, getCrediariosPorBairro } from "../database/db";

// ✅ Depois
import { 
  getTotals, 
  getTotalHoje, 
  getTotalMesAtual,
  getTotalMesAnterior,
  getTopClientesMes, 
  getCrediariosPorBairro,
  getCrescimentoPercentual,
  clearTotalsCache
} from "../database/services/reportsService";
```

## 🔄 Funções Legadas (Temporário)

```typescript
// ❌ Antes
import { updateClient, getClientsByDate, getClientesAgrupadosPorRua, atualizarOrdemCliente, normalizarOrdem, checkDatabaseHealth } from "../database/db";

// ✅ Depois (temporário - serão migradas)
import { 
  updateClient, 
  getClientsByDate, 
  getClientesAgrupadosPorRua, 
  atualizarOrdemCliente, 
  normalizarOrdem, 
  checkDatabaseHealth 
} from "../database/legacy";
```

## 🛠️ Utilitários

```typescript
// ❌ Antes
import { formatDateIso, formatDateTimeIso, toCentavos, toReais } from "../database/db";

// ✅ Depois
import { 
  formatDateIso, 
  formatDateTimeIso, 
  toCentavos, 
  toReais,
  normalizeDateToISO,
  isValidDateISO
} from "../database/utils";
```

## 📅 Helpers de Data

```typescript
// ✅ Novo
import { 
  nowISO, 
  todayISO, 
  tomorrowISO, 
  daysFromTodayISO,
  startOfMonthISO,
  endOfMonthISO
} from "../database/utils/dateHelpers";
```

## 🧱 Core

```typescript
// ❌ Antes
import { initDB, waitForInitDB, optimizeDB } from "../database/db";

// ✅ Depois
import { 
  initDB, 
  waitForInitDB, 
  optimizeDB 
} from "../database/core/schema";
```

## 💾 Backup

```typescript
// ❌ Antes
import { createBackup } from "../database/db";

// ✅ Depois
import { createBackup } from "../database/services/backupService";
```

