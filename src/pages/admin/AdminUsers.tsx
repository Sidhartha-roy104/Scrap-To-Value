import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getAdminUsers,
  getAdminUserById,
  updateUserStatus,
  type AdminUser,
} from '@/services/adminService';
import {
  Users,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  Calendar,
  Package,
  Store,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToastNotification } from '@/components/ToastNotification';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();
  const { user: authUser } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  // Selected User for details modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // User status toggle confirmation
  const [statusToggleTarget, setStatusToggleTarget] = useState<AdminUser | null>(null);

  // 1. Fetch Users
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_users', roleFilter, statusFilter, search, page],
    queryFn: async () => {
      const res = await getAdminUsers({
        role: roleFilter === 'All' ? undefined : roleFilter,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      return res.data;
    },
    staleTime: 1000 * 20,
  });

  // 2. Fetch User Details for modal
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin_user_details', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const res = await getAdminUserById(selectedUserId);
      return res.data?.user;
    },
    enabled: Boolean(selectedUserId),
  });

  // 3. Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await updateUserStatus(userId, isActive);
      return res.data?.user;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
      addToast({
        type: 'success',
        title: 'Account Status Updated',
        message: `Account for ${updated?.full_name || updated?.email} is now ${
          updated?.is_active ? 'Active' : 'Deactivated'
        }.`,
      });
      setStatusToggleTarget(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      addToast({
        type: 'error',
        title: 'Operation Failed',
        message: msg,
      });
    },
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleConfirmToggle = () => {
    if (!statusToggleTarget) return;

    if (statusToggleTarget.id === authUser?.id) {
      addToast({
        type: 'error',
        title: 'Forbidden',
        message: 'You cannot deactivate your own administrator account.',
      });
      setStatusToggleTarget(null);
      return;
    }

    toggleMutation.mutate({
      userId: statusToggleTarget.id,
      isActive: !statusToggleTarget.is_active,
    });
  };

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">
              Admin Control
            </span>
            <span className="text-xs text-muted-foreground">• User Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit registered buyers, sellers, and administrators. Manage account active states and monitor activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Controls: Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, company, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-base pl-9 text-sm h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="input-base text-xs h-10 w-full sm:w-36"
            >
              <option value="All">All Roles</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
              <option value="admin">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-base text-xs h-10 w-full sm:w-36"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20 space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Failed to load users</h3>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Database error'}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card-base p-12 text-center space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No users found</h3>
          <p className="text-xs text-muted-foreground">Try clearing your search query or role filter.</p>
        </div>
      ) : (
        <div className="card-base overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4 text-center">Listings</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-center">KYC</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const isSelf = u.id === authUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{u.full_name || 'Anonymous User'}</div>
                        <span className="text-[11px] text-muted-foreground font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : u.role === 'seller'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {u.role === 'admin' && <Shield className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {u.company_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-foreground">
                        {u.listing_count}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-foreground">
                        {u.role === 'seller' ? u.seller_order_count : u.buyer_order_count}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.kyc_verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-semibold">
                            <ShieldCheck className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Unverified</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUserId(u.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                            title="View User Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setStatusToggleTarget(u)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                u.is_active
                                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
                                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                              }`}
                              title={u.is_active ? 'Deactivate User' : 'Activate User'}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-secondary/20 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total users)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. User Profile Inspection Modal                                          */}
      {/* ========================================================================= */}
      {selectedUserId && (
        <Modal
          isOpen={Boolean(selectedUserId)}
          onClose={() => setSelectedUserId(null)}
          title="User Account Details"
          size="md"
        >
          {detailsLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading user profile...</p>
            </div>
          ) : detailsData ? (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{detailsData.full_name || 'No Name'}</h3>
                    <p className="text-muted-foreground font-mono">{detailsData.email}</p>
                  </div>
                  <span className="font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {detailsData.role}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground pt-1">
                  <span>Registered: {new Date(detailsData.created_at).toLocaleDateString('en-IN')}</span>
                  <span>•</span>
                  <span>
                    Status:{' '}
                    <strong className={detailsData.is_active ? 'text-emerald-600' : 'text-rose-600'}>
                      {detailsData.is_active ? 'Active' : 'Deactivated'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Company Name</span>
                  <span className="font-semibold text-foreground text-xs">{detailsData.company_name || '—'}</span>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Phone Contact</span>
                  <span className="font-semibold text-foreground text-xs font-mono">{detailsData.phone || '—'}</span>
                </div>
              </div>

              {detailsData.company_address && (
                <div className="p-3 bg-card rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Address</span>
                  <p className="text-foreground mt-0.5">{detailsData.company_address}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Listings</span>
                  <span className="text-sm font-bold text-foreground">{detailsData.listing_count}</span>
                </div>
                <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Buyer Requests</span>
                  <span className="text-sm font-bold text-foreground">{detailsData.buyer_order_count}</span>
                </div>
                <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Seller Orders</span>
                  <span className="text-sm font-bold text-foreground">{detailsData.seller_order_count}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. Account Status Toggle Confirmation Modal                               */}
      {/* ========================================================================= */}
      {statusToggleTarget && (
        <Modal
          isOpen={Boolean(statusToggleTarget)}
          onClose={() => setStatusToggleTarget(null)}
          title={statusToggleTarget.is_active ? 'Deactivate User Account' : 'Activate User Account'}
          size="sm"
        >
          <div className="space-y-4 pt-1 text-sm">
            <p className="text-foreground">
              {statusToggleTarget.is_active ? (
                <>
                  Are you sure you want to <strong>deactivate</strong> the account for{' '}
                  <strong>{statusToggleTarget.full_name || statusToggleTarget.email}</strong>? The user will not be able to log in or create scrap orders.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>reactivate</strong> the account for{' '}
                  <strong>{statusToggleTarget.full_name || statusToggleTarget.email}</strong>? The user will regain full platform access.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusToggleTarget(null)}
                disabled={toggleMutation.isPending}
                className="btn-secondary text-xs px-3.5 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleMutation.isPending}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusToggleTarget.is_active
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {toggleMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                  </>
                ) : statusToggleTarget.is_active ? (
                  'Confirm Deactivation'
                ) : (
                  'Confirm Activation'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
