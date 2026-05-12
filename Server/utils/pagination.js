export const getPagination = (query = {}, defaults = {}) => {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 100;
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const rawLimit = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const pagedResponse = ({ data, page, limit, total, key = "data" }) => ({
  [key]: data,
  data,
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});
