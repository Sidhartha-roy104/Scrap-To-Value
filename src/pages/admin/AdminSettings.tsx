/**
 * pages/admin/AdminSettings.tsx
 * -----------------------------
 * Safe Platform System Settings.
 * Manages operational parameters, support contacts, and default limits without exposing secrets.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettingItem,
} from '@/services/adminService';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Mail,
  Clock,
  Scale,
  Sliders,
} from 'lucide-react';
import { useToastNotification } from '@/components/ToastNotification';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [formState, setFormState] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_settings'],
    queryFn: async () => {
      const res = await getSystemSettings();
      return res.data;
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (data) {
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        initial[k] = (v as SystemSettingItem).value;
      }
      setFormState(initial);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (updated: Record<string, string>) => {
      const res = await updateSystemSettings(updated);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_settings'] });
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Platform operational settings updated successfully.',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save system settings.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            System & Operational Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure platform parameters, default dispatch deadlines, and notification contacts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card-base p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading system settings...</p>
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">Failed to load settings</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button onClick={() => refetch()} className="btn-primary text-xs px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Platform Branding */}
          <div className="card-base p-5 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              General Platform Identity
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-foreground font-semibold block mb-1">Platform Brand Name</label>
                <input
                  type="text"
                  value={formState['platform_name'] || ''}
                  onChange={(e) => setFormState({ ...formState, platform_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Shown in notifications, invoices, and marketplace headers.
                </span>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">Operations & Support Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={formState['support_email'] || ''}
                    onChange={(e) => setFormState({ ...formState, support_email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Point of contact for seller KYC appeals and dispute notices.
                </span>
              </div>
            </div>
          </div>

          {/* Operational Policy & Timers */}
          <div className="card-base p-5 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Workflow Automation & Limits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-foreground font-semibold block mb-1">
                  Order Acceptance Timeout (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formState['default_order_timeout_hours'] || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, default_order_timeout_hours: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Time allowed for a seller to accept a buyer request.
                </span>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">
                  Dispute Escalation Trigger (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formState['dispute_escalation_days'] || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, dispute_escalation_days: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Unreviewed disputes older than this are flagged as urgent.
                </span>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">
                  Minimum Order Quantity (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formState['min_order_quantity_kg'] || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, min_order_quantity_kg: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Enforces viable transport volume for scrap collection.
                </span>
              </div>

              <div>
                <label className="text-foreground font-semibold block mb-1">Platform Status</label>
                <select
                  value={formState['maintenance_mode'] || 'false'}
                  onChange={(e) =>
                    setFormState({ ...formState, maintenance_mode: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="false">Active (Normal Operations)</option>
                  <option value="true">Maintenance Mode (Read Only)</option>
                </select>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Toggle platform order placement for maintenance windows.
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
