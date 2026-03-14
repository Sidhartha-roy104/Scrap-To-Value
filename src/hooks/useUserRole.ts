import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'buyer' | 'seller';

async function fetchUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .rpc('get_user_role', { _user_id: userId });
  if (error) throw error;
  return (data as AppRole) ?? null;
}

export function useUserRole() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: () => fetchUserRole(user!.id),
    enabled: !!user,
  });

  const setRoleMutation = useMutation({
    mutationFn: async (newRole: AppRole) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_role', user?.id] });
    },
  });

  return {
    role,
    isLoading,
    setRole: setRoleMutation.mutateAsync,
    isSettingRole: setRoleMutation.isPending,
  };
}
