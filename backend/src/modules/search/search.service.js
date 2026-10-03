const mongoose = require('mongoose');
const JournalEntry = require('../accounting/accounting.model');
const Student = require('../students/student.model');
const Employee = require('../employees/employee.model');
const { USER_ROLES, SOURCE_MODULES } = require('../../config/constants');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeRegex = (s) => ({ $regex: escapeRegex(String(s).slice(0, 100)), $options: 'i' });

// Which result types each role may see. Mirrors the route guards the user
// would hit if they clicked through: Employees is accountantOrDirector
// territory (and hidden from a sub-accountant's sidebar in
// constants/menuSection.js), so a sub-accountant must never be handed an
// employee record here. Enforced server-side rather than by hiding groups in
// the drawer — the frontend hides them too, but this is the copy that counts.
const TYPES_BY_ROLE = {
  [USER_ROLES.DIRECTOR]: ['journalEntries', 'students', 'employees'],
  [USER_ROLES.ACCOUNTANT]: ['journalEntries', 'students', 'employees'],
  [USER_ROLES.SUB_ACCOUNTANT]: ['journalEntries', 'students'],
};

const GROUP_LABELS = {
  journalEntries: 'Journal Entries',
  students: 'Students',
  employees: 'Employees',
};

const DEFAULT_GROUP_LIMIT = 5;
const MAX_GROUP_LIMIT = 20;

class SearchService {
  static async searchJournalEntries(query, filters = {}) {
    const searchRegex = safeRegex(query);
    const dateFilter = this.buildDateFilter(filters);

    // This route has no validate() middleware (see search.routes.js), so
    // unlike getAllEntries these values arrive unchecked and are sanitised
    // here — an unvalidated account id would otherwise reach Mongo and throw
    // a CastError, and an arbitrary sortBy would become a sort key.
    const isValidAccount =
      filters.account && mongoose.Types.ObjectId.isValid(filters.account);
    const isValidSource =
      filters.sourceModule &&
      Object.values(SOURCE_MODULES).includes(filters.sourceModule);

    return await JournalEntry.find({
      $or: [
        { referenceNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter,
      ...(filters.transactionType && { transactionType: filters.transactionType }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus }),
      ...(isValidSource && { sourceModule: filters.sourceModule }),
      ...(isValidAccount && { 'bookEntries.account': filters.account })
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort(this.buildSort(filters));
  }

  // Kept in step with SORTABLE_FIELDS in accounting.validation.js so the two
  // journal-entry list paths order results the same way.
  static buildSort(filters) {
    const SORTABLE = [
      'voucherDate',
      'voucherNumber',
      'totalDebit',
      'totalCredit',
      'createdAt',
    ];
    const field = SORTABLE.includes(filters.sortBy)
      ? filters.sortBy
      : 'voucherDate';
    return { [field]: filters.sortOrder === 'asc' ? 1 : -1, _id: -1 };
  }

  static buildDateFilter(filters) {
    const dateFilter = {};
    if (filters.dateFrom || filters.dateTo) {
      // accounting.model.js's date field is `voucherDate` — there is no
      // `date` field on JournalEntry, so the previous `dateFilter.date`
      // matched nothing and silently returned an empty result set whenever a
      // date range was supplied.
      dateFilter.voucherDate = {};
      if (filters.dateFrom) dateFilter.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.voucherDate.$lte = new Date(filters.dateTo);
    }
    return dateFilter;
  }

  static allowedTypesForRole(role) {
    return TYPES_BY_ROLE[role] || [];
  }

  /**
   * Cross-module search behind the header's global search drawer.
   *
   * Every group is capped and every searched field goes through safeRegex, so
   * a one-character query can't turn into a full-collection scan streamed back
   * to the client (which is what the older /search/journal-entries route,
   * still used by the Journal Entries page, does today).
   *
   * Results are normalized to a single { id, type, title, subtitle, meta,
   * searchKey } shape so the drawer has one render path and no per-type field
   * knowledge. `searchKey` is what the frontend puts in `?search=` when the
   * type has no detail route of its own and lands on a pre-filtered list.
   */
  static async globalSearch(query, { role, limit } = {}) {
    const groupLimit = Math.min(
      MAX_GROUP_LIMIT,
      Math.max(1, parseInt(limit, 10) || DEFAULT_GROUP_LIMIT),
    );

    const allowedTypes = this.allowedTypesForRole(role);

    if (allowedTypes.length === 0) {
      return { groups: [], total: 0 };
    }

    const searchRegex = safeRegex(query);

    const runners = {
      journalEntries: () => this.findJournalEntries(searchRegex, groupLimit),
      students: () => this.findStudents(searchRegex, groupLimit),
      employees: () => this.findEmployees(searchRegex, groupLimit),
    };

    const settled = await Promise.all(
      allowedTypes.map((type) => runners[type]()),
    );

    const groups = allowedTypes
      .map((type, index) => ({
        type,
        label: GROUP_LABELS[type],
        count: settled[index].length,
        results: settled[index],
      }))
      .filter((group) => group.count > 0);

    return {
      groups,
      total: groups.reduce((sum, group) => sum + group.count, 0),
    };
  }

  static async findJournalEntries(searchRegex, limit) {
    const entries = await JournalEntry.find({
      $or: [
        { voucherNumber: searchRegex },
        { referenceNumber: searchRegex },
        { description: searchRegex },
      ],
    })
      .select('voucherNumber description voucherDate totalDebit approvalStatus')
      .sort({ voucherDate: -1, _id: -1 })
      .limit(limit)
      .lean({ getters: true });

    return entries.map((entry) => ({
      id: entry._id,
      type: 'journalEntries',
      title: entry.voucherNumber || 'Journal Entry',
      subtitle: entry.description || '',
      meta: entry.approvalStatus || '',
      date: entry.voucherDate || null,
      amount: entry.totalDebit ?? null,
      searchKey: entry.voucherNumber || '',
    }));
  }

  static async findStudents(searchRegex, limit) {
    const students = await Student.find({
      $or: [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
      ],
    })
      .select('name rollNumber class section status')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return students.map((student) => ({
      id: student._id,
      type: 'students',
      title: student.name,
      subtitle: [student.rollNumber, student.class && `Class ${student.class}`, student.section]
        .filter(Boolean)
        .join(' · '),
      meta: student.status || '',
      date: null,
      amount: null,
      // Roll number is unique, so it lands the list page on exactly one row.
      searchKey: student.rollNumber || student.name || '',
    }));
  }

  static async findEmployees(searchRegex, limit) {
    const employees = await Employee.find({
      $or: [
        { name: searchRegex },
        { employeeCode: searchRegex },
        { email: searchRegex },
      ],
    })
      .select('name employeeCode designation department status')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return employees.map((employee) => ({
      id: employee._id,
      type: 'employees',
      title: employee.name,
      subtitle: [employee.employeeCode, employee.designation, employee.department]
        .filter(Boolean)
        .join(' · '),
      meta: employee.status || '',
      date: null,
      amount: null,
      searchKey: employee.employeeCode || employee.name || '',
    }));
  }
}

module.exports = SearchService;
module.exports.escapeRegex = escapeRegex;
module.exports.safeRegex = safeRegex;
module.exports.TYPES_BY_ROLE = TYPES_BY_ROLE;
