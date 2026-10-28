import type { ReactNode } from 'react';

// Opens the Cal.com popup; the embed is initialised once in Navigation.
export default function BookCall({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
    return <button type="button" className={className} onClick={onClick} data-cal-namespace="30min" data-cal-link="prosamik/30min" data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'>{children}</button>;
}
