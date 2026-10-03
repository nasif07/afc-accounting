import React from 'react';
import Table from '../common/Table';
import { formatCurrency } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';

const columns = [
  {
    key: 'date',
    label: 'Date',
    render: (value) => formatDisplayDate(value),
  },
  {
    key: 'voucherNumber',
    label: 'Voucher',
    primary: true,
    mono: true,
    className: 'font-medium text-slate-900',
  },
  { key: 'description', label: 'Description', wrap: true },
  {
    key: 'debit',
    label: 'Debit',
    align: 'right',
    mono: true,
    className: 'font-medium text-slate-900',
    render: (value) => (value > 0 ? formatCurrency(value) : '-'),
  },
  {
    key: 'credit',
    label: 'Credit',
    align: 'right',
    mono: true,
    className: 'font-medium text-slate-900',
    render: (value) => (value > 0 ? formatCurrency(value) : '-'),
  },
  {
    key: 'runningBalance',
    label: 'Balance',
    align: 'right',
    mono: true,
    className: 'font-bold text-blue-600',
    render: (value, txn) =>
      `${formatCurrency(value)} ${txn.runningBalanceType === 'credit' ? 'Cr' : 'Dr'}`,
  },
];

// The other side of a posting, broken out under its ledger row. A row shows
// only this account's own debit or credit, so on a compound entry — one debit
// against several credits, say — the amount alone never says where the money
// went. "Detailed" answers that; "Grouped" keeps the compact one-line-per-
// entry ledger.
const ContraLinesBody = ({ transaction }) => {
  const lines = transaction.contraLines || [];
  if (lines.length === 0) return null;

  return (
    <div className="border-l-2 border-slate-200 pl-4">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {transaction.isCompound
          ? `Compound entry · ${lines.length} contra lines`
          : 'Contra account'}
      </p>

      <ul className="space-y-1">
        {lines.map((line, index) => (
          <li
            key={`${line.accountCode}-${index}`}
            className="flex items-baseline justify-between gap-4 text-xs">
            <span className="min-w-0 text-slate-600">
              <span className="font-mono text-slate-500">{line.accountCode}</span>{' '}
              {line.accountName}
              {line.description && (
                <span className="text-slate-400"> — {line.description}</span>
              )}
            </span>

            <span className="shrink-0 font-mono tabular-nums">
              {line.debit > 0 ? (
                <span className="text-emerald-700">Dr {formatCurrency(line.debit)}</span>
              ) : (
                <span className="text-red-700">Cr {formatCurrency(line.credit)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Desktop: an extra row spanning the table. Mobile: the same block appended
// inside the card, so the breakdown doesn't disappear below the breakpoint.
const ContraLinesRow = ({ transaction }) => {
  if ((transaction.contraLines || []).length === 0) return null;

  return (
    <tr className="bg-slate-50/70">
      <td colSpan={6} className="px-4 pb-3 pt-0">
        <ContraLinesBody transaction={transaction} />
      </td>
    </tr>
  );
};

const GeneralLedgerReport = ({
  data,
  startDate,
  endDate,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  isFetching,
  viewType = 'detailed',
}) => {
  if (!data) {
    return (
      <div className="py-8 text-center text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-slate-900 pb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">General Ledger</h2>
        <p className="mt-2 text-lg font-semibold text-slate-700">
          {data.accountName} ({data.accountCode})
        </p>
        {startDate && endDate && (
          <p className="mt-2 text-sm text-slate-600">
            For the period: {formatDisplayDate(startDate)} to{' '}
            {formatDisplayDate(endDate)}
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-4 border-b-2 border-slate-300 pb-2 text-lg font-semibold text-slate-900">
          Transactions
        </h3>

        <Table
          columns={columns}
          data={data.transactions || []}
          rowKey={(_, index) => index}
          page={data.pagination?.page || page}
          pageSize={pageSize}
          totalItems={data.pagination?.total ?? 0}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
          paginationDisabled={isFetching}
          itemLabel="transactions"
          minWidth="min-w-[820px]"
          renderSubRow={
            viewType === 'detailed'
              ? (txn) => <ContraLinesRow transaction={txn} />
              : undefined
          }
          renderCardExtra={
            viewType === 'detailed'
              ? (txn) => <ContraLinesBody transaction={txn} />
              : undefined
          }
          emptyMessage="No transactions"
          emptyDescription="Nothing was recorded against this account in the selected period."
          // Opening and closing balances bracket the transactions the way a
          // printed ledger does.
          leadingRow={
            <tr className="bg-slate-100 font-semibold">
              <td colSpan={5} className="px-4 py-3 text-slate-900">
                Opening Balance
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                {formatCurrency(data.openingBalance || 0)}{' '}
                {data.openingBalanceType === 'credit' ? 'Cr' : 'Dr'}
              </td>
            </tr>
          }
          footer={
            <tr className="border-t-2 border-slate-900 bg-slate-100">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-900">
                Period totals
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-600">
                {formatCurrency(data.totalDebit || 0)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-red-600">
                {formatCurrency(data.totalCredit || 0)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-blue-600">
                {formatCurrency(data.closingBalance || 0)}{' '}
                {data.closingBalanceType === 'credit' ? 'Cr' : 'Dr'}
              </td>
            </tr>
          }
        />
      </div>
    </div>
  );
};

export default GeneralLedgerReport;
