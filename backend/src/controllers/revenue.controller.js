import { getRevenueOverview, getRevenueTransactions } from '../services/revenue.service.js';

export const fetchRevenueOverview = async ({ query }) => {
    return getRevenueOverview({
        from: query?.from,
        to: query?.to
    });
};

export const fetchRevenueTransactions = async ({ query }) => {
    return getRevenueTransactions({
        status: query?.status,
        plan: query?.plan,
        from: query?.from,
        to: query?.to,
        page: query?.page,
        limit: query?.limit,
        orderId: query?.orderId
    });
};
