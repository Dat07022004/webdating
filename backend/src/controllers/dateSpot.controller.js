import { getDateSpotsWithRatings, getPublishedReviewsByLocation } from '../services/appointment.service.js';

export const getDateSpots = async ({ query }) => {
  return getDateSpotsWithRatings(query || {});
};

export const getDateSpotReviews = async ({ locationId }) => {
  return getPublishedReviewsByLocation(locationId);
};
