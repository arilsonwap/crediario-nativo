/**
 * ✅ Hook opcional com React Query para cache e sincronização
 * 
 * Para usar, instale: npm install @tanstack/react-query
 * 
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 * 
 * const queryClient = new QueryClient();
 * 
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 */

// import { useQuery } from "@tanstack/react-query";
// import { getUpcomingCharges, type Client } from "../database/db";
// import { parseChargeDate } from "../utils/dateUtils";
// import { validateClients } from "../schemas/clientSchema";

// export const useClientsByDateQuery = (date: string) => {
//   const normalizedDate = parseChargeDate(date);

//   const { data: clients = [], isLoading, error, refetch } = useQuery({
//     queryKey: ["clientsByDate", normalizedDate],
//     queryFn: async () => {
//       const allClients = await getUpcomingCharges();
//       const validatedClients = validateClients(allClients);
//       return validatedClients.filter((c) => {
//         if (!c.next_charge) return false;
//         return parseChargeDate(c.next_charge) === normalizedDate;
//       });
//     },
//     staleTime: 5 * 60 * 1000, // 5 minutos
//     gcTime: 10 * 60 * 1000, // 10 minutos (cacheTime antigo)
//   });

//   return {
//     clients,
//     loading: isLoading,
//     error: error ? (error as Error).message : null,
//     refetch,
//   };
// };






