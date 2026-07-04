import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../services/api';

const KEY = ['general-ledger-report'];

export const useGeneralLedgerReport = ({ accountId, startDate, endDate, page = 1, limit = 50 }, options = {}) =>
  useQuery({
    queryKey: [...KEY, accountId, startDate, endDate, page, limit],
    queryFn: async () => {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get(`/accounting/journal-entries/ledger/${accountId}`, { params });
      return res.data?.data || null;
    },
    enabled: !!accountId,
    placeholderData: keepPreviousData,
    ...options,
  });
