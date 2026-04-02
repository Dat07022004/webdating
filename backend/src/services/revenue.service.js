import { PaymentTransaction } from '../models/paymentTransaction.model.js';

const ALLOWED_STATUS = ['pending', 'success', 'failed'];
const ALLOWED_PLAN = ['gold', 'platinum'];

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const parseDate = (value, field) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw createError(400, `Invalid ${field}`);
    }

    return parsed;
};

const buildDateFilter = ({ from, to }) => {
    const fromDate = parseDate(from, 'from');
    const toDate = parseDate(to, 'to');

    if (fromDate && toDate && fromDate > toDate) {
        throw createError(400, 'from must be less than or equal to to');
    }

    const createdAt = {};
    if (fromDate) {
        createdAt.$gte = fromDate;
    }
    if (toDate) {
        createdAt.$lte = toDate;
    }

    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
};

const normalizePagination = ({ page, limit }) => {
    const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

    return {
        page: normalizedPage,
        limit: normalizedLimit,
        skip: (normalizedPage - 1) * normalizedLimit
    };
};

export const getRevenueOverview = async ({ from, to }) => {
    const dateFilter = buildDateFilter({ from, to });

    const [allTransactions, successTransactions] = await Promise.all([
        PaymentTransaction.find(dateFilter)
            .select('status amount')
            .lean(),
        PaymentTransaction.find({ ...dateFilter, status: 'success' })
            .select('plan amount createdAt')
            .lean()
    ]);

    const summary = {
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0
    };

    const byPlanMap = new Map();
    const dailyMap = new Map();

    successTransactions.forEach((transaction) => {
        const amount = Number(transaction.amount) || 0;
        const plan = transaction.plan || 'unknown';
        const date = new Date(transaction.createdAt).toISOString().slice(0, 10);

        summary.totalRevenue += amount;
        summary.totalTransactions += 1;

        const planStats = byPlanMap.get(plan) || { plan, revenue: 0, transactions: 0 };
        planStats.revenue += amount;
        planStats.transactions += 1;
        byPlanMap.set(plan, planStats);

        const dayStats = dailyMap.get(date) || { date, revenue: 0, transactions: 0 };
        dayStats.revenue += amount;
        dayStats.transactions += 1;
        dailyMap.set(date, dayStats);
    });

    summary.averageOrderValue = summary.totalTransactions > 0
        ? Math.round(summary.totalRevenue / summary.totalTransactions)
        : 0;

    const statusMap = new Map();
    allTransactions.forEach((transaction) => {
        const status = transaction.status || 'unknown';
        const amount = Number(transaction.amount) || 0;
        const statusStats = statusMap.get(status) || { status, count: 0, amount: 0 };
        statusStats.count += 1;
        statusStats.amount += amount;
        statusMap.set(status, statusStats);
    });

    const byPlan = Array.from(byPlanMap.values()).sort((a, b) => b.revenue - a.revenue);
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const statusBreakdown = Array.from(statusMap.values());

    return {
        filters: { from: from || null, to: to || null },
        summary: {
            totalRevenue: summary.totalRevenue || 0,
            totalTransactions: summary.totalTransactions || 0,
            averageOrderValue: Math.round(summary.averageOrderValue || 0)
        },
        byPlan,
        daily,
        statusBreakdown
    };
};

export const getRevenueTransactions = async ({ status, plan, from, to, page, limit, orderId }) => {
    const query = { ...buildDateFilter({ from, to }) };

    if (status) {
        if (!ALLOWED_STATUS.includes(status)) {
            throw createError(400, 'Invalid status');
        }
        query.status = status;
    }

    if (plan) {
        if (!ALLOWED_PLAN.includes(plan)) {
            throw createError(400, 'Invalid plan');
        }
        query.plan = plan;
    }

    if (orderId) {
        query.orderId = { $regex: orderId, $options: 'i' };
    }

    const { page: normalizedPage, limit: normalizedLimit, skip } = normalizePagination({ page, limit });

    const [total, transactions] = await Promise.all([
        PaymentTransaction.countDocuments(query),
        PaymentTransaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(normalizedLimit)
            .populate('userId', '_id username email')
            .lean()
    ]);

    return {
        filters: {
            status: status || null,
            plan: plan || null,
            from: from || null,
            to: to || null,
            orderId: orderId || null
        },
        pagination: {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            totalPages: Math.ceil(total / normalizedLimit) || 1
        },
        transactions
    };
};
