import mongoose from 'mongoose';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const healthCheck = () => ({ message: 'OK' });

export const databaseHealthCheck = async () => {
  const state = connectionStates[mongoose.connection.readyState] || 'unknown';

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return {
      status: 503,
      body: {
        message: 'Database is not connected',
        state,
      },
    };
  }

  try {
    await mongoose.connection.db.admin().ping();
  } catch (error) {
    return {
      status: 503,
      body: {
        message: 'Database ping failed',
        state,
        error: error.message,
      },
    };
  }

  return {
    status: 200,
    body: {
      message: 'Database connection is healthy',
      state,
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    },
  };
};
