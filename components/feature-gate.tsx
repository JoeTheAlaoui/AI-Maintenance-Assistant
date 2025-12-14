'use client';

import { isFeatureEnabled, type FeatureFlag } from '@/config/features';
import { ReactNode } from 'react';

interface FeatureGateProps {
    feature: FeatureFlag;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Component wrapper pour features désactivables
 * 
 * Usage:
 * <FeatureGate feature="WORK_ORDERS_VIEW">
 *   <WorkOrdersPage />
 * </FeatureGate>
 */
export function FeatureGate({
    feature,
    children,
    fallback = null
}: FeatureGateProps) {
    if (!isFeatureEnabled(feature)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Hook pour vérifier feature dans components
 */
export function useFeature(feature: FeatureFlag): boolean {
    return isFeatureEnabled(feature);
}
