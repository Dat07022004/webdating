import {
    createMoMoPaymentRequest,
    processMomoIpnPayload,
    processMomoReturnPayload,
    getPremiumStatusByClerkId
} from '../services/premium.service.js';

export const createMoMoPayment = async ({ clerkId, plan }) => {
    return createMoMoPaymentRequest({ clerkId, plan });
};

export const momoIPN = async ({ payload }) => {
    return processMomoIpnPayload({ payload });
};

export const momoReturn = async ({ payload }) => {
    return processMomoReturnPayload({ payload });
};

export const getPremiumStatus = async ({ clerkId }) => {
    return getPremiumStatusByClerkId({ clerkId });
};
