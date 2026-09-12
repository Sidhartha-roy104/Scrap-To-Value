import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDisputes,
  getDisputeById,
  updateDisputeStatus,
  type Dispute,
  type DisputeStatus,
  type DisputeDetails,
} from '@/services/disputeService';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Package,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Scale,
  Calendar,
  User,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToastNotification } from '@/components/ToastNotification';
import { formatCurrency, formatNumber } from '@/data/mockData';

const DISPUTE_STATUS_TABS: { key: string; label: string }[] = [
  { key: 'All', label: 'All Disputes' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'closed', label: 'Closed' },
];

export function getDisputeBadge(status: DisputeStatus) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: AlertTriangle,
      };
    case 'under_review':
      return {
        label: 'Under Review',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        icon: Clock,
      };
    case 'resolved':
      return {
        label: 'Resolved',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: CheckCircle2,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: XCircle,
      };
    case 'closed':
      return {
        label: 'Closed',
        className: 'bg-secondary text-muted-foreground border-border',
        icon: CheckCircle2,
      };
    default:
      return {
        label: status,
        className: 'bg-secondary text-muted-foreground border-border',
        icon: Clock,
      };
  }
}

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  // Resolution form state
  const [targetStatus, setTargetStatus] = useState<DisputeStatus>('under_review');
  const [resolutionText, setResolutionText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // 1. Fetch Disputes
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_disputes', statusFilter],
    queryFn: async () => {
      const res = await getDisputes({
        status: statusFilter === 'All' ? undefined : statusFilter,
        limit: 50,
      });
      return res.data?.disputes ?? [];
    },
    staleTime: 1000 * 20,
  });

  // 2. Fetch Selected Dispute Details
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin_dispute_details', selectedDisputeId],
    queryFn: async () => {
      if (!selectedDisputeId) return null;
      const res = await getDisputeById(selectedDisputeId);
      return res.data?.dispute;
    },
    enabled: Boolean(selectedDisputeId),
  });

  // 3. Status Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_resolution,
      admin_notes,
    }: {
      id: string;
      status: DisputeStatus;
      admin_resolution?: string;
      admin_notes?: string;
    }) => {
      const res = await updateDisputeStatus(id, {
        status,
        admin_resolution,
        admin_notes,
      });
      return res.data?.dispute;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin_disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin_dispute_details', selectedDisputeId] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
      addToast({
        type: 'success',
        title: 'Dispute Updated',
        message: `Dispute #${updated?.id.slice(0, 8).toUpperCase()} is now ${updated?.status}.`,
      });
      setSelectedDisputeId(null);
      setResolutionText('');
      setAdminNotes('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update dispute';
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: msg,
      });
    },
  });

  const disputes = data ?? [];

  const handleOpenModal = (disp: Dispute) => {
    setSelectedDisputeId(disp.id);
    setTargetStatus(disp.status === 'open' ? 'under_review' : disp.status);
    setResolutionText(disp.admin_resolution || '');
    setAdminNotes(disp.admin_notes || '');
  };

  const handleSubmitResolution = () => {
    if (!selectedDisputeId) return;

    if (['resolved', 'rejected'].includes(targetStatus) && !resolutionText.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'A detailed resolution explanation is required when resolving or rejecting a dispute.',
      });
      return;
    }

    updateMutation.mutate({
      id: selectedDisputeId,
      status: targetStatus,
      admin_resolution: resolutionText.trim() || undefined,
      admin_notes: adminNotes.trim() || undefined,
    });
  };

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase">
              Operational Control
            </span>
            <span className="text-xs text-muted-foreground">• Case Mediation</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dispute Resolution Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mediate order disagreements, review evidence, assign review status, and record binding resolutions.
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

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        {DISPUTE_STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          const count =
            tab.key === 'All'
              ? disputes.length
              : disputes.filter((d) => d.status === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dispute registry...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center bg-destructive/5 border-destructive/20 space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Failed to load disputes</h3>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Database error'}</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="card-base p-12 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No disputes matching this filter</h3>
          <p className="text-xs text-muted-foreground">All collection orders are operating smoothly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {disputes.map((disp) => {
            const badge = getDisputeBadge(disp.status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={disp.id}
                className="card-base p-4 sm:p-5 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-secondary text-foreground">
                      CASE #{disp.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Order #{disp.request_id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{disp.reason}</h4>
                    {disp.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        "{disp.description}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                    <span>
                      Raised by: <strong className="text-foreground">{disp.raised_by_user?.name || 'User'}</strong>{' '}
                      ({disp.user_role})
                    </span>
                    <span>•</span>
                    <span>
                      Material: <strong className="text-foreground">{disp.order?.waste_type}</strong> (
                      {formatNumber(disp.order?.quantity || 0)} kg)
                    </span>
                    <span>•</span>
                    <span>{new Date(disp.created_at).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/60 justify-end">
                  <button
                    onClick={() => handleOpenModal(disp)}
                    className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5" /> Review Case
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Dispute Review Modal                                                     */}
      {/* ========================================================================= */}
      {selectedDisputeId && (
        <Modal
          isOpen={Boolean(selectedDisputeId)}
          onClose={() => setSelectedDisputeId(null)}
          title="Review Dispute & Record Resolution"
          size="lg"
        >
          {detailsLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading dispute record...</p>
            </div>
          ) : detailsData ? (
            <div className="space-y-5 pt-1">
              {/* Header Details */}
              <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      CASE ID: {detailsData.id}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5">{detailsData.reason}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      getDisputeBadge(detailsData.status).className
                    }`}
                  >
                    {getDisputeBadge(detailsData.status).label}
                  </span>
                </div>

                {detailsData.description && (
                  <div className="text-xs bg-card p-3 rounded-lg border border-border/50 text-foreground italic">
                    "{detailsData.description}"
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 text-muted-foreground">
                  <div>
                    <span>Raised by:</span>
                    <strong className="text-foreground block">{detailsData.raised_by_user?.name}</strong>
                    <span className="text-[10px]">({detailsData.user_role})</span>
                  </div>
                  <div>
                    <span>Order Material:</span>
                    <strong className="text-foreground block">{detailsData.order?.waste_type}</strong>
                    <span className="text-[10px]">{formatNumber(detailsData.order?.quantity || 0)} kg</span>
                  </div>
                  <div>
                    <span>Order Value:</span>
                    <strong className="text-foreground block">{formatCurrency(detailsData.order?.amount || 0)}</strong>
                    <span className="text-[10px]">Status: {detailsData.order?.status}</span>
                  </div>
                  <div>
                    <span>Opened on:</span>
                    <strong className="text-foreground block">
                      {new Date(detailsData.created_at).toLocaleDateString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Dispute Resolution Form */}
              <div className="space-y-4 border border-border p-4 rounded-xl bg-card">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Admin Resolution Action
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Target Dispute Status
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['under_review', 'resolved', 'rejected', 'closed'] as DisputeStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTargetStatus(st)}
                        className={`p-2 rounded-lg border text-center font-semibold capitalize transition-colors ${
                          targetStatus === st
                            ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                            : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Formal Resolution Explanation{' '}
                    {['resolved', 'rejected'].includes(targetStatus) ? (
                      <span className="text-rose-500">* (Mandatory)</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">(Optional)</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Enter binding resolution findings, agreed delivery correction, or reason for dispute rejection..."
                    className="input-base text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Internal Admin Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Discussed with buyer and seller on phone, agreed on replacement dispatch..."
                    className="input-base text-xs"
                  />
                </div>
              </div>

              {/* Audit Trail of Dispute Actions */}
              {detailsData.activity_history && detailsData.activity_history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Dispute Audit History
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                    {detailsData.activity_history.map((act) => (
                      <div key={act.id} className="p-2 rounded bg-secondary/30 border border-border/40 flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{act.notes}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(act.created_at).toLocaleString('en-IN')} by {act.actor_name || act.actor_role} ({act.actor_role})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDisputeId(null)}
                  disabled={updateMutation.isPending}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitResolution}
                  disabled={updateMutation.isPending}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Save Dispute Action
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
