import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  pageSize: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export function getPagination(req: Request, defaultSort = 'id'): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const sortBy = (req.query.sortBy as string) || defaultSort;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
  const search = req.query.search as string | undefined;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    sortBy,
    sortOrder,
    search,
  };
}

export function paginatedResponse<T>(data: T[], total: number, options: PaginationOptions) {
  return {
    success: true,
    data,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.ceil(total / options.pageSize),
  };
}
